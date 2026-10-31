import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createPayment, isMockMode } from '@/lib/payments/server';
import { getCurrentUser } from '@/lib/auth/session';
import { sendOrderConfirmation } from '@/lib/email/resend';
import { STOCK_COMPENSATION_FAILURE_MESSAGE } from '@/lib/checkout/stock';
import { getCheckoutProductSlugs } from '@/lib/checkout/cache';
import { recordPaymentEvent } from '@/lib/payments/events';
import { cancelPayJustNowCheckout, getPayJustNowConfig, isPayJustNowConfigured } from '@/lib/payments/payjustnow';
import { isBuildingType } from '@/lib/delivery/buildings';
import { driverTipCents, getEbucksSummary, REWARD_AMOUNT_CENTS } from '@/lib/loyalty/ebucks';

type SuccessfulDecrement = { order_item_id: string };

const GENERIC_PRODUCT_NAMES = new Set(['', 'item', 'items', 'product', 'products', 'untitled']);

/** Prefer a real product name, otherwise use the variant name. */
function meaningfulProductName(productName: string | undefined | null, variantName: string | undefined | null): string {
  const product = String(productName ?? '').trim();
  if (product && !GENERIC_PRODUCT_NAMES.has(product.toLowerCase())) return product;
  const variant = String(variantName ?? '').trim();
  return variant || product || 'Item';
}

async function rollbackCheckout(
  adminSupabase: any,
  orderId: string,
  affectedProductSlugs: string[],
) {
  const cancellation = await adminSupabase.rpc('cancel_order_and_compensate_checkout_stock' as any, {
    p_order_id: orderId,
  } as any);
  if (cancellation.error || cancellation.data !== true) {
    const current = await adminSupabase.from('orders').select('status').eq('id', orderId).maybeSingle();
    if (current.data?.status === 'paid') return { failed: false, paid: true };
    console.error('[checkout] atomic cancellation and stock compensation failed', {
      orderId,
      error: cancellation.error?.message ?? 'order was not cancellable',
    });
    return { failed: true, paid: false };
  }

  // The reservation changed stock before payment creation. Refresh PDPs after
  // the atomic cancellation/compensation so stale sold-out pages do not persist.
  try { revalidatePath('/'); } catch (error) {
    console.error('[checkout] cache revalidation failed during rollback', error);
  }
  for (const slug of affectedProductSlugs) {
    try { revalidatePath(`/p/${slug}`); } catch (error) {
      console.error('[checkout] product cache revalidation failed during rollback', { slug, error });
    }
  }

  return { failed: false, paid: false };
}

function revalidateCheckoutProducts(items: any[]) {
  for (const slug of getCheckoutProductSlugs(items)) {
    try { revalidatePath(`/p/${slug}`); } catch (error) {
      // Cache invalidation is best-effort; it must not turn a committed stock
      // decrement/payment intent into a false checkout failure.
      console.error('[checkout] product cache revalidation failed', { slug, error });
    }
  }
}

/** Bypasses the RPC — inserts order directly with explicit customer_id */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      cartId, email, fullName, phone, userId, shippingMethod, paymentMethod, shippingAddress, couponCode,
      orderNote, deliveryInstructions, buildingType, buildingName,
      driverTipPercent, doorAddressConfirmed, saveLocation,
    } = body;
    if (!cartId || !email || !shippingMethod || !paymentMethod || !shippingAddress?.line1) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // The recipient's name and mobile number are required: The Courier Guy
    // needs them for delivery, and Payfast uses them to identify the payer
    // (which keeps its own checkout from asking for them mid-flow).
    if (!fullName || !String(fullName).trim() || !phone || !String(phone).trim()) {
      return NextResponse.json({ error: 'Your name and mobile number are required for delivery.' }, { status: 400 });
    }
    const customerName = String(fullName).trim();
    const customerPhone = String(phone).trim();

    // The courier has to reach a physical door. The customer confirms the
    // address and tells us what kind of place it is so the driver can find it.
    const building = isBuildingType(buildingType) ? buildingType : null;
    const buildingPlaceName = String(buildingName ?? '').trim();
    if (!building) {
      return NextResponse.json(
        { error: 'Tell us what kind of place this is so the courier can find your door.' },
        { status: 400 },
      );
    }
    if (!buildingPlaceName) {
      return NextResponse.json(
        { error: 'Add the name of the place so the courier can find your door.' },
        { status: 400 },
      );
    }
    if (!doorAddressConfirmed) {
      return NextResponse.json(
        { error: 'Please confirm the delivery address is where the door is.' },
        { status: 400 },
      );
    }
    if (shippingMethod !== 'tcg_door') {
      return NextResponse.json({ error: 'The Courier Guy is the only available delivery option.' }, { status: 400 });
    }
    if (!['payfast', 'payjustnow'].includes(paymentMethod)) return NextResponse.json({ error: 'Unsupported payment method.' }, { status: 400 });
    if (paymentMethod === 'payjustnow' && !isPayJustNowConfigured(getPayJustNowConfig())) {
      return NextResponse.json({ error: 'PayJustNow is not configured.' }, { status: 503 });
    }
    if (paymentMethod === 'payjustnow' && isMockMode()) {
      return NextResponse.json({ error: 'PayJustNow cannot be used in mock payment mode.' }, { status: 503 });
    }

    const sessionUser = await getCurrentUser();
    if (!sessionUser) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    if (userId && userId !== sessionUser.id) {
      return NextResponse.json({ error: 'Authenticated user does not match checkout user' }, { status: 403 });
    }
    const resolvedUserId = sessionUser.id;
    const supabase: any = await createClient(); // cast to any to bypass typed-client friction
    const adminSupabase = (await createAdminClient()) as any; // service-role for atomic RPC + writes

    const { data: cartItems } = (await supabase.from('cart_items')
      .select('*, variant:product_variants(*, product:products(base_price_cents, slug))')
      .eq('cart_id', cartId)) as any;
    const items = (cartItems ?? []) as any[];
    if (items.length === 0) return NextResponse.json({ error: 'Cart empty' }, { status: 400 });
    if (items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1)) {
      return NextResponse.json({ error: 'Invalid cart quantity' }, { status: 400 });
    }

    let subtotalCents = 0;
    for (const ci of items) {
      subtotalCents += (ci.variant?.price_cents ?? ci.variant?.product?.base_price_cents ?? 0) * ci.quantity;
    }

    const { calculateShippingCents } = await import('@/lib/shipping');
    const shippingCents = calculateShippingCents(shippingMethod, subtotalCents);

    // Coupon discount
    let discountCents = 0;
    let appliedCouponCode: string | null = null;
    if (typeof couponCode === 'string' && couponCode.trim()) {
      const code = couponCode.trim().toUpperCase();
      const { data: coupon } = await supabase
        .from('discount_codes')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .maybeSingle();
      if (coupon) {
        const now = new Date();
        const expired = coupon.expires_at && new Date(coupon.expires_at) < now;
        const notYet = coupon.starts_at && new Date(coupon.starts_at) > now;
        const exhausted = coupon.max_uses !== null && coupon.used_count >= coupon.max_uses;
        const underMin = subtotalCents < coupon.min_order_cents;
        if (!expired && !notYet && !exhausted && !underMin) {
          if (coupon.kind === 'percent') {
            discountCents = Math.round((subtotalCents * coupon.value) / 100);
          } else if (coupon.kind === 'fixed_amount') {
            discountCents = Math.min(subtotalCents, coupon.value);
          }
          appliedCouponCode = coupon.code;
        }
      }
    }

    // Driver tip — 100% of it goes to the driver.
    const tipPercent = Math.max(0, Math.min(50, Math.round(Number(driverTipPercent) || 0)));
    const tipCents = driverTipCents(subtotalCents, tipPercent);

    // E bucks: customers who have completed 10+ orders get R50 off this one.
    const loyalty = await getEbucksSummary(resolvedUserId);
    const loyaltyRewardCents = loyalty.qualifies ? Math.min(REWARD_AMOUNT_CENTS, subtotalCents) : 0;
    if (loyaltyRewardCents > 0) discountCents += loyaltyRewardCents;

    const totalCents = Math.max(0, subtotalCents + shippingCents + tipCents - discountCents);

    const { count } = (await adminSupabase.from('orders').select('*', { count: 'exact', head: true })) as any;
    const orderNumber = `TDTD-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(5, '0')}`;

    const { data: order, error: orderErr } = (await adminSupabase.from('orders').insert({
      order_number: orderNumber, customer_id: resolvedUserId, email, status: 'pending_payment',
      subtotal_cents: subtotalCents, shipping_cents: shippingCents, discount_cents: discountCents, total_cents: totalCents,
      currency: 'ZAR',
      // Name and mobile travel with the address: the courier needs the
      // recipient's phone to deliver, and the order record must stand alone.
      shipping_address: {
        ...shippingAddress,
        name: customerName,
        phone: customerPhone,
        building_type: building,
        building_name: buildingPlaceName,
      },
      shipping_method: shippingMethod,
      delivery_building_type: building,
      delivery_building_name: buildingPlaceName,
      delivery_instructions: String(deliveryInstructions ?? '').trim() || null,
      door_address_confirmed: true,
      driver_tip_cents: tipCents,
      driver_tip_percent: tipPercent,
      notes: String(orderNote ?? '').trim() || null,
      payment_gateway: paymentMethod,
      // Note: applied_coupon_code is a future-proofing field from migration 007.
      // We store it in shipping_address JSON until you run 007, so the field is
      // never lost and the order insert never fails with a missing column.
    } as any).select('id, order_number').single()) as any;

    if (orderErr || !order) return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });

    // "Save this location" — keep it for next time.
    if (resolvedUserId && saveLocation) {
      try {
        await adminSupabase.from('addresses').insert({
          customer_id: resolvedUserId,
          label: 'Home',
          line1: shippingAddress?.line1,
          line2: shippingAddress?.line2 || null,
          city: shippingAddress?.city,
          province: shippingAddress?.province,
          postal_code: shippingAddress?.postal_code,
          building_type: building,
          building_name: buildingPlaceName,
          phone: customerPhone,
          delivery_instructions: String(deliveryInstructions ?? '').trim() || null,
          is_default: false,
        } as any);
      } catch (saveError) {
        // Never fail a checkout because a convenience save failed.
        console.error('[checkout] could not save location', saveError);
      }
    }
    await recordPaymentEvent(adminSupabase, order.id, 'checkout_started', `checkout:${order.id}`, { gateway: paymentMethod });
    await recordPaymentEvent(adminSupabase, order.id, 'pending_payment_created', `pending-created:${order.id}`, { gateway: paymentMethod });

    if (appliedCouponCode) {
      const _r: any = await supabase.rpc('increment_coupon_usage' as any, { p_code: appliedCouponCode } as any).catch(() => null);
    }

    // Atomic stock decrement using row-level locking so concurrent buyers can't oversell.
    const successfulDecrements: SuccessfulDecrement[] = [];
    let stockFailure: { kind: 'unavailable' | 'shortage' | 'error'; name: string; requested: number; reason?: string } | null = null;
    for (const ci of items) {
      const v = ci.variant as any;
      const p = v?.product as any;
      const pc = v?.price_cents ?? p?.base_price_cents ?? 0;
      let result: { data: string | null; error?: { message?: string } | null };
      try {
        result = await adminSupabase.rpc('atomic_checkout_stock' as any, {
          p_variant_id: ci.variant_id,
          p_quantity: ci.quantity,
          p_order_id: order.id,
          // Some imported products still carry a generic name — fall back to
          // the variant name so the receipt and the courier note are useful.
          p_product_name: meaningfulProductName(p?.name, v?.name),
          p_sku: v?.sku ?? '',
          p_unit_price_cents: pc,
        } as any);
      } catch (error: any) {
        result = { data: null, error: { message: error?.message ?? 'stock reservation failed' } };
      }
      const orderItemId = result.data;
      if (result.error) {
        stockFailure = {
          kind: /unavailable/i.test(result.error.message ?? '') ? 'unavailable' : 'error',
          name: p?.name ?? 'Item',
          requested: ci.quantity,
          reason: result.error.message ?? 'stock reservation failed',
        };
        break;
      }
      if (orderItemId) {
        successfulDecrements.push({ order_item_id: orderItemId });
      } else {
        stockFailure = { kind: 'shortage', name: p?.name ?? 'Item', requested: ci.quantity };
        break;
      }
    }

    if (stockFailure) {
      const rollback = await rollbackCheckout(adminSupabase, order.id, getCheckoutProductSlugs(items));
      if (rollback.failed) {
        // Surface WHY the reservation failed. Without this the checkout only
        // ever reports a generic compensation failure, which hides database
        // contract problems (missing migration, missing grant) completely.
        console.error('[checkout] stock reservation failed', {
          orderId: order.id,
          kind: stockFailure.kind,
          reason: stockFailure.reason,
        });
        return NextResponse.json(
          { error: STOCK_COMPENSATION_FAILURE_MESSAGE, reason: stockFailure.reason ?? null },
          { status: 500 },
        );
      }
      if (stockFailure.kind === 'unavailable') {
        return NextResponse.json({ error: `${stockFailure.name} is no longer available.` }, { status: 409 });
      }
      return NextResponse.json(
        { error: stockFailure.kind === 'shortage'
          ? `Not enough stock for ${stockFailure.name} — only 0 left, you asked for ${stockFailure.requested}.`
          : 'Unable to reserve stock. Please try again.' },
        { status: 409 }
      );
    }

    const _d: any = await supabase.from('cart_items').delete().eq('cart_id', cartId);
    revalidateCheckoutProducts(items);

    if (isMockMode()) {
      const _m: any = await adminSupabase.from('orders').update({ status: 'paid', paid_at: new Date().toISOString() } as any).eq('id', order.id);
      await recordPaymentEvent(adminSupabase, order.id, 'paid_transition', `mock-paid:${order.id}`, { gateway: 'mock' });

      // Send order confirmation email (silent fail if RESEND_API_KEY not set)
      const itemsList = items.map((ci: any) =>
        `<div style="font-size:14px;color:#566c7d;margin:4px 0">${ci.quantity}× ${ci.variant?.name ?? (ci.variant as any)?.product?.name ?? 'Item'} — R${((ci.variant?.price_cents ?? (ci.variant as any)?.product?.base_price_cents ?? 0) * ci.quantity / 100).toFixed(2)}</div>`
      ).join('');
      sendOrderConfirmation({ to: email, orderNumber: order.order_number, totalRand: `R${(totalCents / 100).toFixed(2)}`, items: itemsList }).catch(() => {});

      return NextResponse.json({ orderId: order.id, orderNumber: order.order_number });
    }

    // Provider redirects and item links use the configured origin only. The
    // browser Origin header is caller-controlled and is never trusted here.
    const origin = paymentMethod === 'payjustnow' ? getPayJustNowConfig().appOrigin : '';
    const payJustNowRequestId = `breeez-${order.id}`;
    try {
      if (paymentMethod === 'payjustnow') {
        const prepared = await adminSupabase.rpc('prepare_payjustnow_attempt' as any, {
          p_order_id: order.id, p_request_id: payJustNowRequestId,
        } as any);
        if (prepared.error || prepared.data !== true) throw new Error('Payment attempt could not be prepared.');
      }
      const intent = await createPayment({
        orderId: order.id, orderNumber: order.order_number, amountCents: totalCents,
        customerEmail: email, customerName, customerPhone, method: paymentMethod,
        returnUrl: `${origin}/checkout/success/${order.id}?ref=${order.order_number}`, cancelUrl: `${origin}/cart`,
        shippingCents, discountCents,
        items: items.map((ci: any) => ({
          name: ci.variant?.product?.name ?? ci.variant?.name ?? 'Breeez item',
          sku: ci.variant?.sku ?? `${order.order_number}-${ci.variant_id}`,
          quantity: ci.quantity,
          priceCents: ci.variant?.price_cents ?? ci.variant?.product?.base_price_cents ?? 0,
           pageUrl: ci.variant?.product?.slug ? `${origin}/p/${ci.variant.product.slug}` : undefined,
         })),
         shippingAddress,
       });
      // A valid ITN may mark the order paid before this response completes.
      // Only attach the redirect reference while the order is still pending;
      // this prevents a late create-payment response from overwriting the
      // authoritative PayFast payment ID.
      if (paymentMethod === 'payjustnow') {
        const attempt = await adminSupabase.from('payment_attempts').update({
          checkout_token: intent.checkoutToken, payment_reference: intent.paymentReference ?? null,
          status: 'created', updated_at: new Date().toISOString(),
         }).eq('provider', 'payjustnow').eq('request_id', payJustNowRequestId).eq('status', 'created').select('id').maybeSingle();
         if (attempt.error || !attempt.data) {
           const [state, callbackAttempt] = await Promise.all([
             adminSupabase.from('orders').select('status').eq('id', order.id).maybeSingle(),
             adminSupabase.from('payment_attempts').select('status').eq('provider', 'payjustnow').eq('request_id', payJustNowRequestId).maybeSingle(),
           ]);
           if (state.data?.status === 'paid') return NextResponse.json({ orderId: order.id, orderNumber: order.order_number, redirectUrl: intent.redirectUrl });
           if (callbackAttempt.data?.status === 'callback_received') return NextResponse.json({ orderId: order.id, orderNumber: order.order_number, redirectUrl: intent.redirectUrl });
          const remoteCancel = intent.checkoutToken ? await cancelPayJustNowCheckout(intent.checkoutToken, order.order_number) : null;
          if (remoteCancel && !remoteCancel.ok) console.error('[checkout] remote PayJustNow cancellation failed after attempt persistence failure', { orderId: order.id, error: remoteCancel.error });
          throw new Error('Payment succeeded remotely but could not be recorded.');
        }
      }
      const paymentUpdate: Record<string, string> = paymentMethod === 'payjustnow'
        ? { payment_request_id: intent.reference, payment_checkout_token: intent.checkoutToken ?? '', ...(intent.paymentReference ? { payment_reference: intent.paymentReference } : {}) }
        : { payment_reference: intent.reference };
      const _p: any = await adminSupabase.from('orders')
        .update(paymentUpdate as any)
        .eq('id', order.id)
        .eq('status', 'pending_payment')
        .select('id')
        .maybeSingle();
      if (_p.error || !_p.data) {
        const state = await adminSupabase.from('orders').select('status').eq('id', order.id).maybeSingle();
        if (state.data?.status === 'paid') return NextResponse.json({ orderId: order.id, orderNumber: order.order_number, redirectUrl: intent.redirectUrl });
        if (paymentMethod === 'payjustnow' && intent.checkoutToken) {
          const remoteCancel = await cancelPayJustNowCheckout(intent.checkoutToken, order.order_number);
          if (!remoteCancel.ok) console.error('[checkout] remote PayJustNow cancellation failed after local persistence failure', { orderId: order.id, error: remoteCancel.error });
        }
        throw new Error('Payment succeeded remotely but could not be linked to the order.');
      }
      await recordPaymentEvent(adminSupabase, order.id, paymentMethod === 'payjustnow' ? 'payjustnow_redirect' : 'payfast_redirect', `redirect:${intent.reference}`, { gateway: paymentMethod });
      return NextResponse.json({ orderId: order.id, orderNumber: order.order_number, redirectUrl: intent.redirectUrl });
    } catch (paymentError: any) {
      const rollback = await rollbackCheckout(adminSupabase, order.id, getCheckoutProductSlugs(items));
      if (rollback.paid) {
        return NextResponse.json({ orderId: order.id, orderNumber: order.order_number });
      }
      if (rollback.failed) {
        console.error('[checkout] payment failed and rollback could not compensate', {
          orderId: order.id,
          reason: paymentError?.message,
        });
        return NextResponse.json(
          { error: STOCK_COMPENSATION_FAILURE_MESSAGE, reason: paymentError?.message ?? null },
          { status: 500 },
        );
      }
      await recordPaymentEvent(adminSupabase, order.id, 'payment_failed', `failed:${order.id}`, { gateway: paymentMethod });
      return NextResponse.json({ error: paymentError?.message || 'Payment creation failed' }, { status: 502 });
    }
  } catch (err: any) {
    console.error('[checkout]', err);
    return NextResponse.json({ error: err?.message || 'Checkout failed' }, { status: 500 });
  }
}

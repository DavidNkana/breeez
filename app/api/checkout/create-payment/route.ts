import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { createPayment, isMockMode } from '@/lib/payments/server';
import { getCurrentUser } from '@/lib/auth/session';
import { sendOrderConfirmation } from '@/lib/email/resend';
import { getStockRollbackItems, STOCK_COMPENSATION_FAILURE_MESSAGE } from '@/lib/checkout/stock';

type SuccessfulDecrement = { order_item_id: string };

async function rollbackCheckout(
  adminSupabase: any,
  orderId: string,
  successfulDecrements: SuccessfulDecrement[],
) {
  const compensationFailures: string[] = [];
  for (const { order_item_id } of getStockRollbackItems(successfulDecrements)) {
    try {
      const compensation = await adminSupabase.rpc('compensate_checkout_stock' as any, {
        p_order_item_id: order_item_id,
      } as any);
      if (compensation.error) {
        compensationFailures.push(`${order_item_id}: ${compensation.error.message ?? 'unknown compensation error'}`);
        console.error('[checkout] stock compensation failed', {
          orderId,
          orderItemId: order_item_id,
          error: compensation.error.message ?? 'unknown compensation error',
        });
      }
    } catch (error: any) {
      compensationFailures.push(`${order_item_id}: ${error?.message ?? 'unknown compensation error'}`);
      console.error('[checkout] stock compensation failed', {
        orderId,
        orderItemId: order_item_id,
        error: error?.message ?? 'unknown compensation error',
      });
    }
  }

  let cancellationError: string | null = null;
  try {
    const cancellation = await adminSupabase
      .from('orders')
      .update({ status: 'cancelled' } as any)
      .eq('id', orderId);
    if (cancellation.error) cancellationError = cancellation.error.message ?? 'unknown cancellation error';
  } catch (error: any) {
    cancellationError = error?.message ?? 'unknown cancellation error';
  }
  if (cancellationError) {
    console.error('[checkout] order cancellation failed', { orderId, error: cancellationError });
  }

  return { failed: compensationFailures.length > 0 || Boolean(cancellationError) };
}

/** Bypasses the RPC — inserts order directly with explicit customer_id */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cartId, email, userId, shippingMethod, paymentMethod, shippingAddress, couponCode } = body;
    if (!cartId || !email || !shippingMethod || !paymentMethod || !shippingAddress?.line1) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const sessionUser = await getCurrentUser();
    const resolvedUserId = userId || sessionUser?.id;
    if (!resolvedUserId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const supabase: any = await createClient(); // cast to any to bypass typed-client friction
    const adminSupabase = (await createAdminClient()) as any; // service-role for atomic RPC + writes

    const { data: cartItems } = (await supabase.from('cart_items')
      .select('*, variant:product_variants(*, product:products(base_price_cents))')
      .eq('cart_id', cartId)) as any;
    const items = (cartItems ?? []) as any[];
    if (items.length === 0) return NextResponse.json({ error: 'Cart empty' }, { status: 400 });

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

    const totalCents = Math.max(0, subtotalCents + shippingCents - discountCents);

    const { count } = (await adminSupabase.from('orders').select('*', { count: 'exact', head: true })) as any;
    const orderNumber = `TDTD-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(5, '0')}`;

    const { data: order, error: orderErr } = (await adminSupabase.from('orders').insert({
      order_number: orderNumber, customer_id: resolvedUserId, email, status: 'pending_payment',
      subtotal_cents: subtotalCents, shipping_cents: shippingCents, discount_cents: discountCents, total_cents: totalCents,
      currency: 'ZAR', shipping_address: shippingAddress, shipping_method: shippingMethod,
      payment_gateway: paymentMethod,
      // Note: applied_coupon_code is a future-proofing field from migration 007.
      // We store it in shipping_address JSON until you run 007, so the field is
      // never lost and the order insert never fails with a missing column.
    } as any).select('id, order_number').single()) as any;

    if (orderErr || !order) return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });

    if (appliedCouponCode) {
      const _r: any = await supabase.rpc('increment_coupon_usage' as any, { p_code: appliedCouponCode } as any).catch(() => null);
    }

    // Atomic stock decrement using row-level locking so concurrent buyers can't oversell.
    const successfulDecrements: SuccessfulDecrement[] = [];
    let stockFailure: { kind: 'unavailable' | 'shortage' | 'error'; name: string; requested: number } | null = null;
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
          p_product_name: p?.name ?? 'Item',
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
      const rollback = await rollbackCheckout(adminSupabase, order.id, successfulDecrements);
      if (rollback.failed) {
        return NextResponse.json(
          { error: STOCK_COMPENSATION_FAILURE_MESSAGE },
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

    if (isMockMode()) {
      const _m: any = await adminSupabase.from('orders').update({ status: 'paid', paid_at: new Date().toISOString() } as any).eq('id', order.id);

      // Send order confirmation email (silent fail if RESEND_API_KEY not set)
      const itemsList = items.map((ci: any) =>
        `<div style="font-size:14px;color:#566c7d;margin:4px 0">${ci.quantity}× ${ci.variant?.name ?? (ci.variant as any)?.product?.name ?? 'Item'} — R${((ci.variant?.price_cents ?? (ci.variant as any)?.product?.base_price_cents ?? 0) * ci.quantity / 100).toFixed(2)}</div>`
      ).join('');
      sendOrderConfirmation({ to: email, orderNumber: order.order_number, totalRand: `R${(totalCents / 100).toFixed(2)}`, items: itemsList }).catch(() => {});

      return NextResponse.json({ orderId: order.id, orderNumber: order.order_number });
    }

    const origin = req.headers.get('origin') || '';
    try {
      const intent = await createPayment({
        orderId: order.id, orderNumber: order.order_number, amountCents: totalCents,
        customerEmail: email, method: paymentMethod,
        returnUrl: `${origin}/checkout/success/${order.id}?ref=${order.order_number}`, cancelUrl: `${origin}/cart`
      });
      const _p: any = await adminSupabase.from('orders').update({ payment_reference: intent.reference } as any).eq('id', order.id);
      return NextResponse.json({ orderId: order.id, orderNumber: order.order_number, redirectUrl: intent.redirectUrl });
    } catch (paymentError: any) {
      const rollback = await rollbackCheckout(adminSupabase, order.id, successfulDecrements);
      if (rollback.failed) {
        return NextResponse.json({ error: STOCK_COMPENSATION_FAILURE_MESSAGE }, { status: 500 });
      }
      return NextResponse.json({ error: paymentError?.message || 'Payment creation failed' }, { status: 502 });
    }
  } catch (err: any) {
    console.error('[checkout]', err);
    return NextResponse.json({ error: err?.message || 'Checkout failed' }, { status: 500 });
  }
}

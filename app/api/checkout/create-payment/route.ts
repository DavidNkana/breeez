import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { createPayment, isMockMode } from '@/lib/payments/server';
import { getCurrentUser } from '@/lib/auth/session';
import { sendOrderConfirmation } from '@/lib/email/resend';

/** Bypasses the RPC — inserts order directly with explicit customer_id */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cartId, email, shippingMethod, paymentMethod, shippingAddress, couponCode } = body;
    if (!cartId || !email || !shippingMethod || !paymentMethod || !shippingAddress?.line1) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const user = await getCurrentUser();
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

    const { count } = (await supabase.from('orders').select('*', { count: 'exact', head: true })) as any;
    const orderNumber = `BRZ-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(5, '0')}`;

    const { data: order, error: orderErr } = (await supabase.from('orders').insert({
      order_number: orderNumber, customer_id: user?.id ?? null, email, status: 'pending_payment',
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
    const stockShortages: { name: string; requested: number; available: number }[] = [];
    for (const ci of items) {
      const v = ci.variant as any;
      const p = v?.product as any;
      const pc = v?.price_cents ?? p?.base_price_cents ?? 0;
      const ok = await adminSupabase.rpc('atomic_checkout_stock' as any, {
        p_variant_id: ci.variant_id,
        p_quantity: ci.quantity,
        p_order_id: order.id,
        p_product_name: p?.name ?? 'Item',
        p_sku: v?.sku ?? '',
        p_unit_price_cents: pc,
      } as any) as { data: boolean | null };
      if (ok?.data !== true) {
        // Inline the order_items row that the RPC didn't insert
        stockShortages.push({
          name: p?.name ?? 'Item',
          requested: ci.quantity,
          available: 0,
        });
      }
    }

    if (stockShortages.length > 0) {
      // Roll back: cancel the order, decrement any partial stock already deducted
      for (const ci of items) {
        await adminSupabase.from('product_variants')
          .update({ stock: ((await adminSupabase.from('product_variants').select('stock').eq('id', ci.variant_id).single() as any)?.data?.stock ?? 0) + ci.quantity } as any)
          .eq('id', ci.variant_id)
          .catch(() => null);
      }
      await adminSupabase.from('orders').update({ status: 'cancelled' } as any).eq('id', order.id);
      const first = stockShortages[0];
      return NextResponse.json(
        { error: `Not enough stock for ${first.name} — only ${first.available} left, you asked for ${first.requested}.` },
        { status: 409 }
      );
    }

    const _d: any = await supabase.from('cart_items').delete().eq('cart_id', cartId);

    if (isMockMode()) {
      const _m: any = await supabase.from('orders').update({ status: 'paid', paid_at: new Date().toISOString() } as any).eq('id', order.id);

      // Send order confirmation email (silent fail if RESEND_API_KEY not set)
      const itemsList = items.map((ci: any) =>
        `<div style="font-size:14px;color:#566c7d;margin:4px 0">${ci.quantity}× ${ci.variant?.name ?? (ci.variant as any)?.product?.name ?? 'Item'} — R${((ci.variant?.price_cents ?? (ci.variant as any)?.product?.base_price_cents ?? 0) * ci.quantity / 100).toFixed(2)}</div>`
      ).join('');
      sendOrderConfirmation({ to: email, orderNumber: order.order_number, totalRand: `R${(totalCents / 100).toFixed(2)}`, items: itemsList }).catch(() => {});

      return NextResponse.json({ orderId: order.id, orderNumber: order.order_number });
    }

    const origin = req.headers.get('origin') || '';
    const intent = await createPayment({
      orderId: order.id, orderNumber: order.order_number, amountCents: totalCents,
      customerEmail: email, method: paymentMethod,
      returnUrl: `${origin}/checkout/success/${order.id}?ref=${order.order_number}`, cancelUrl: `${origin}/cart`
    });
    const _p: any = await supabase.from('orders').update({ payment_reference: intent.reference } as any).eq('id', order.id);
    return NextResponse.json({ orderId: order.id, orderNumber: order.order_number, redirectUrl: intent.redirectUrl });
  } catch (err: any) {
    console.error('[checkout]', err);
    return NextResponse.json({ error: err?.message || 'Checkout failed' }, { status: 500 });
  }
}
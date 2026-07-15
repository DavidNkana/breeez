import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { createPayment, isMockMode } from '@/lib/payments/server';
import { bookShipment } from '@/lib/shipping';
import { createClient } from '@/lib/supabase/server';

/**
 * Place an order: create the order row via RPC, decrement stock, return payment redirect.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cartId, email, fullName, phone, shippingMethod, paymentMethod, shippingAddress } = body;

    if (!cartId || !email || !shippingMethod || !paymentMethod || !shippingAddress?.line1) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

  const admin: any = createAdminClient();
  const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Get cart items + prices to compute totals
    const { data: cartItems, error: cartErr } = await admin
      .from('cart_items')
      .select('*, variant:product_variants(*, product:products(base_price_cents, weight_grams))')
      .eq('cart_id', cartId);
    if (cartErr || !cartItems || (cartItems as any[]).length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // Compute subtotal
    let subtotalCents = 0;
    for (const ci of (cartItems as any[])) {
      const priceCents = ci.variant?.price_cents ?? ci.variant?.product?.base_price_cents ?? 0;
      subtotalCents += priceCents * ci.quantity;
    }

    // Shipping cost
    const { calculateShippingCents } = await import('@/lib/shipping');
    const shippingCents = calculateShippingCents(shippingMethod, subtotalCents);
    const totalCents = subtotalCents + shippingCents;

    // If logged in, update phone/name on customer profile
    if (user) {
      await admin.from('customers').update({
        full_name: fullName || null,
        phone: phone || null
      } as any).eq('id', user.id);
    }

    // Create the order via RPC
    const { data: orderId, error: rpcErr } = await admin.rpc('place_order' as any, {
      p_cart_id: cartId,
      p_email: email,
      p_shipping_address: shippingAddress,
      p_shipping_method: shippingMethod,
      p_payment_gateway: paymentMethod,
      p_subtotal_cents: subtotalCents,
      p_shipping_cents: shippingCents,
      p_discount_cents: 0,
      p_total_cents: totalCents
    });
    if (rpcErr) throw rpcErr;

    // Fetch the created order to get order_number
    const { data: order } = await admin
      .from('orders')
      .select('*')
      .eq('id', orderId as any)
      .single();

    const orderRow = order as any;

    // In mock mode, mark as paid immediately
    if (isMockMode()) {
      await admin.from('orders').update({ status: 'paid', paid_at: new Date().toISOString() } as any).eq('id', orderId as any);
      await admin.from('order_events').insert({
        order_id: orderId,
        event_type: 'payment_received',
        payload: { mock: true, gateway: paymentMethod }
      } as any);
    } else {
      // Real payment: create gateway intent
      const origin = req.headers.get('origin') || `https://${req.headers.get('host')}`;
      const intent = await createPayment({
        orderId: orderId!,
        orderNumber: orderRow.order_number,
        amountCents: totalCents,
        customerEmail: email,
        method: paymentMethod,
        returnUrl: `${origin}/checkout/success/${orderId}?ref=${orderRow.order_number}`,
        cancelUrl: `${origin}/cart`
      });
      await admin.from('orders').update({ payment_reference: intent.reference } as any).eq('id', orderId as any);
      return NextResponse.json({ orderId, orderNumber: orderRow.order_number, redirectUrl: intent.redirectUrl });
    }

    return NextResponse.json({ orderId, orderNumber: orderRow.order_number });
  } catch (err: any) {
    console.error('Checkout error:', err);
    return NextResponse.json({ error: err.message || 'Checkout failed' }, { status: 500 });
  }
}
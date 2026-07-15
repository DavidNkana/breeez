import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { createPayment } from '@/lib/payments';
import { bookShipment } from '@/lib/shipping';
import { createClient } from '@/lib/supabase/server';
import { isMockMode } from '@/lib/payments';

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

    const admin = createAdminClient();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Get cart items + prices to compute totals
    const { data: cartItems, error: cartErr } = await admin
      .from('cart_items')
      .select('*, variant:product_variants(*, product:products(base_price_cents, weight_grams))')
      .eq('cart_id', cartId);
    if (cartErr || !cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // Compute subtotal
    let subtotalCents = 0;
    for (const ci of cartItems) {
      const priceCents = (ci as any).variant?.price_cents ?? (ci as any).variant?.product?.base_price_cents ?? 0;
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
      }).eq('id', user.id);
    }

    // Create the order via RPC
    const { data: orderId, error: rpcErr } = await admin.rpc('place_order', {
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
      .eq('id', orderId)
      .single();

    // In mock mode, mark as paid immediately
    if (isMockMode()) {
      await admin.from('orders').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', orderId);
      await admin.from('order_events').insert({
        order_id: orderId,
        event_type: 'payment_received',
        payload: { mock: true, gateway: paymentMethod }
      });
    } else {
      // Real payment: create gateway intent
      const origin = req.headers.get('origin') || `https://${req.headers.get('host')}`;
      const intent = await createPayment({
        orderId: orderId!,
        orderNumber: order!.order_number,
        amountCents: totalCents,
        customerEmail: email,
        method: paymentMethod,
        returnUrl: `${origin}/checkout/success/${orderId}?ref=${order!.order_number}`,
        cancelUrl: `${origin}/cart`
      });
      await admin.from('orders').update({ payment_reference: intent.reference }).eq('id', orderId);
      return NextResponse.json({ orderId, orderNumber: order!.order_number, redirectUrl: intent.redirectUrl });
    }

    return NextResponse.json({ orderId, orderNumber: order!.order_number });
  } catch (err: any) {
    console.error('Checkout error:', err);
    return NextResponse.json({ error: err.message || 'Checkout failed' }, { status: 500 });
  }
}
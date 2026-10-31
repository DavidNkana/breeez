import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyOrderAccess } from '@/lib/orders/access';

/**
 * POST /api/checkout/cancel
 * Body: { orderId, email? }
 *
 * The customer backed out of the payment step. The order is cancelled and
 * its stock goes straight back to the products, and we hand the items back
 * to the cart so they can try again.
 *
 * The order must either belong to the signed-in customer or carry the
 * signed access token that was issued with the payment request.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const orderId = String(body?.orderId ?? '').trim();
  const email = String(body?.email ?? '').trim();
  const token = String(body?.token ?? '').trim();
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });

  const admin = await createAdminClient();

  const { data: order } = (await admin
    .from('orders')
    .select('id, order_number, email, status, customer_id')
    .eq('id', orderId)
    .maybeSingle()) as any;
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  // Authorisation: the signed token, or the signed-in owner.
  const authorised = verifyOrderAccess(order.id, order.email, token);
  if (!authorised) {
    const { getCurrentUser } = await import('@/lib/auth/session');
    const user = await getCurrentUser().catch(() => null);
    if (!user || order.customer_id !== user.id) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    }
  }

  // Only an order that is still awaiting payment can be walked away from.
  if (!['pending_payment', 'cancellation_pending'].includes(order.status)) {
    return NextResponse.json({ ok: true, alreadyFinal: true, status: order.status, orderNumber: order.order_number });
  }

  // Cancel the order and return the stock.
  const { data: cancelled, error } = (await (admin as any).rpc('cancel_order_and_restore_stock', {
    p_order_id: orderId,
  })) as any;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Hand the items back to the cart so the customer can try again.
  const { data: items } = (await admin
    .from('order_items')
    .select('variant_id, quantity, product_name, variant_name, sku, unit_price_cents')
    .eq('order_id', orderId)) as any;

  return NextResponse.json({
    ok: cancelled === true,
    orderNumber: order.order_number,
    items: (items ?? []).map((i: any) => ({
      variantId: i.variant_id,
      quantity: i.quantity,
      name: i.variant_name || i.product_name,
      priceCents: i.unit_price_cents,
    })),
  });
}

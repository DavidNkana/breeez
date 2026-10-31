import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendOrderShipped, sendOrderProcessing, sendOrderDelivered } from '@/lib/email/resend';
import { signOrderAccess } from '@/lib/orders/access';
import { getPayFastAppOrigin } from '@/lib/payments/payfast';

/**
 * PATCH /api/admin/orders/[orderId]/status
 * Body: { status, tracking_number? }
 *
 * Admin-only. Updates the order row and dispatches the shipped email
 * automatically when transitioning to "shipped".
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const orderId = params.orderId;
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });

  const body = await req.json().catch(() => null);
  const status: string | undefined = body?.status;
  const tracking_number: string | null = (body?.tracking_number ?? null) || null;
  if (!status) return NextResponse.json({ error: 'status required' }, { status: 400 });

  const VALID = ['pending_payment', 'cancellation_pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
  if (!VALID.includes(status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 });
  }

  const admin = await createAdminClient();
  // Note: orders table doesn't have an updated_at column (it has per-state
  // timestamps: created_at, paid_at, shipped_at, delivered_at). Don't try to
  // update updated_at here or the query fails with a schema-cache error.
  const update: Record<string, any> = { status };
  if (tracking_number !== null) update.shipping_tracking = tracking_number;
  if (status === 'shipped') update.shipped_at = new Date().toISOString();
  if (status === 'delivered') update.delivered_at = new Date().toISOString();

  const { data: previous } = (await (admin as any)
    .from('orders')
    .select('id, status')
    .eq('id', orderId)
    .maybeSingle()) as any;

  // Cancelling returns the reserved stock to the products. The order items
  // stay on the order so the invoice is still readable.
  if (status === 'cancelled') {
    const { data: cancelled, error: cancelError } = (await (admin as any).rpc(
      'cancel_order_and_restore_stock' as any,
      { p_order_id: orderId } as any,
    )) as any;
    if (cancelError || cancelled !== true) {
      return NextResponse.json(
        { error: cancelError?.message ?? 'This order could not be cancelled' },
        { status: 409 },
      );
    }
    await (admin as any).from('orders').update({ status }).eq('id', orderId);
    const { data: order } = (await (admin as any)
      .from('orders')
      .select('id, order_number, email, status')
      .eq('id', orderId)
      .single()) as any;
    return NextResponse.json({ order, stockRestored: true, previousStatus: previous?.status ?? null });
  }

  const { data: order, error } = await (admin as any)
    .from('orders')
    .update(update)
    .eq('id', orderId)
    .select('id, order_number, email, status')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Customer notifications. The customer gets told at every step so they can
  // follow their order without chasing us.
  if (order?.email) {
    const receiptUrl = `${getPayFastAppOrigin()}/checkout/success/${order.id}?ref=${order.order_number}&token=${signOrderAccess(order.id, order.email)}`;
    if (status === 'processing') {
      sendOrderProcessing({ to: order.email, orderNumber: order.order_number, receiptUrl }).catch(() => {});
    }
    if (status === 'shipped') {
      sendOrderShipped({
        to: order.email,
        orderNumber: order.order_number,
        tracking: tracking_number || undefined,
      }).catch(() => {});
    }
    if (status === 'delivered') {
      sendOrderDelivered({ to: order.email, orderNumber: order.order_number, receiptUrl }).catch(() => {});
    }
  }

  return NextResponse.json({ order });
}

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendOrderShipped } from '@/lib/email/resend';

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

  const VALID = ['pending_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
  if (!VALID.includes(status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 });
  }

  const admin = await createAdminClient();
  const update: Record<string, any> = { status, updated_at: new Date().toISOString() };
  if (tracking_number !== null) update.tracking_number = tracking_number;
  if (status === 'shipped' && !('shipped_at' in update)) update.shipped_at = new Date().toISOString();
  if (status === 'delivered' && !('delivered_at' in update)) update.delivered_at = new Date().toISOString();

  const { data: order, error } = await (admin as any)
    .from('orders')
    .update(update)
    .eq('id', orderId)
    .select('id, order_number, email, status')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fire-and-forget shipped email
  if (status === 'shipped' && order?.email) {
    sendOrderShipped({
      to: order.email,
      orderNumber: order.order_number,
      trackingNumber: tracking_number || '—',
      courier: 'Our delivery partner',
    }).catch(() => {});
  }

  return NextResponse.json({ order });
}

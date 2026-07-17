import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/session';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const user = await requireUser();
  const supabase: any = await createClient();

  const { orderId, reason, description } = await req.json();

  if (!orderId || !reason) {
    return NextResponse.json({ error: 'Order ID and reason are required' }, { status: 400 });
  }

  // Verify the order belongs to this customer
  const { data: order } = await supabase.from('orders').select('id, customer_id, status, total_cents')
    .eq('id', orderId).eq('customer_id', user.id).maybeSingle();

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (order.status !== 'paid' && order.status !== 'shipped' && order.status !== 'delivered') {
    return NextResponse.json({ error: 'Order cannot be returned in its current state' }, { status: 400 });
  }

  // Check for existing return
  const { data: existing } = await supabase.from('returns').select('id')
    .eq('order_id', orderId).eq('customer_id', user.id).maybeSingle();
  if (existing) return NextResponse.json({ error: 'A return has already been requested for this order' }, { status: 400 });

  const { data: returnRow, error } = await supabase.from('returns').insert({
    order_id: orderId,
    customer_id: user.id,
    reason,
    description: description || null,
    status: 'requested'
  }).select('id, status').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log the event
  await supabase.from('order_events').insert({
    order_id: orderId,
    event_type: 'return_requested',
    payload: { reason, description },
    actor_id: user.id
  });

  return NextResponse.json({ ok: true, returnId: returnRow.id, status: returnRow.status });
}
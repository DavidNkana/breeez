import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/session';
import { NextResponse } from 'next/server';

export async function PATCH(req: Request) {
  await requireAdmin();
  const supabase: any = await createClient();
  const { returnId, status } = await req.json();

  if (!returnId || !['approved', 'rejected', 'received', 'refunded'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const update: any = { status, updated_at: new Date().toISOString() };

  const { data: ret, error } = await supabase.from('returns')
    .update(update).eq('id', returnId).select('id, order_id, status, customer_id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log + update order status if refunded
  await supabase.from('order_events').insert({
    order_id: ret.order_id,
    event_type: `return_${status}`,
    payload: { returnId, status }
  });

  if (status === 'refunded') {
    // Set order to refunded
    await supabase.from('orders').update({ status: 'refunded' }).eq('id', ret.order_id);
  }

  return NextResponse.json({ ok: true, returnId: ret.id, status: ret.status });
}
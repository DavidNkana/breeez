import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/session';

/**
 * POST /api/account/orders/[orderId]/delivery-review
 * Body: { rating: 1..5, body?: string }
 *
 * The customer's rating of the delivery service for one of their orders.
 * Item ratings use /api/reviews; this is for the delivery itself.
 */
export async function POST(
  req: Request,
  { params }: { params: { orderId: string } }
) {
  const user = await requireUser();
  const body = await req.json().catch(() => null);
  const rating = parseInt(String(body?.rating ?? ''), 10);
  const reviewBody = String(body?.body ?? '').trim();

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
  }
  if (reviewBody && reviewBody.length < 10) {
    return NextResponse.json({ error: 'Please write at least 10 characters' }, { status: 400 });
  }

  const supabase = await createClient();

  // The customer must own this order, and the order must have been paid for
  // — you cannot rate a delivery that never happened.
  const { data: order } = (await supabase
    .from('orders')
    .select('id, customer_id, status, paid_at')
    .eq('id', params.orderId)
    .maybeSingle()) as any;

  if (!order || order.customer_id !== user.id) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  if (!order.paid_at || !['paid', 'processing', 'shipped', 'delivered'].includes(order.status)) {
    return NextResponse.json({ error: 'You can rate a delivery once it has been paid for' }, { status: 400 });
  }

  const { data, error } = (await supabase
    .from('order_delivery_reviews')
    .upsert(
      {
        order_id: params.orderId,
        customer_id: user.id,
        rating,
        body: reviewBody || null,
      } as any,
      { onConflict: 'order_id' },
    )
    .select('id, rating, body, created_at')
    .single()) as any;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Keep the order's own columns in step so admin views can read them.
  await (supabase as any)
    .from('orders')
    .update({
      delivery_rating: rating,
      delivery_review_body: reviewBody || null,
      delivery_rated_at: new Date().toISOString(),
    })
    .eq('id', params.orderId);

  return NextResponse.json({ review: data });
}

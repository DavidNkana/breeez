import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/session';

/**
 * GET /api/reviews?product=<productId>&cursor=<created_at>&limit=<n>
 * Public. Returns paginated reviews for a product, newest first.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const productId = req.nextUrl.searchParams.get('product');
  const cursor = req.nextUrl.searchParams.get('cursor');
  const limit = Math.min(50, parseInt(req.nextUrl.searchParams.get('limit') || '10', 10));

  if (!productId) {
    return NextResponse.json({ error: 'product required' }, { status: 400 });
  }

  let query = (supabase as any)
    .from('reviews')
    .select('id, rating, title, body, reviewer_display_name, is_verified_purchase, created_at')
    .eq('product_id', productId)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ reviews: data ?? [] });
}

/**
 * POST /api/reviews
 * Body: { productId, rating, title?, body }
 * Auth: required.
 *
 * Rules:
 *  - Customer must have a PAID order containing this product (verified buyer check).
 *  - One review per product per customer (enforced by unique index).
 */
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: 'Sign in required to leave a review' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const productId = body?.productId;
  const rating = parseInt(body?.rating, 10);
  const title: string | null = body?.title?.trim() || null;
  const reviewBody: string = (body?.body ?? '').trim();

  if (!productId || !Number.isFinite(rating)) {
    return NextResponse.json({ error: 'productId and rating required' }, { status: 400 });
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'rating must be 1..5' }, { status: 400 });
  }
  if (reviewBody.length < 10) {
    return NextResponse.json({ error: 'Please write at least 10 characters' }, { status: 400 });
  }

  const supabase = await createClient();

  // 1. Confirm the customer has a PAID order containing this product
  const { data: orderRow, error: orderErr } = await (supabase as any)
    .from('order_items')
    .select('id, order_id, orders!inner(id, customer_id, status, paid_at)')
    .eq('product_id', productId)
    .eq('orders.customer_id', user.id)
    .in('orders.status', ['paid', 'processing', 'shipped', 'delivered'])
    .not('orders.paid_at', 'is', null)
    .limit(1)
    .maybeSingle();

  if (orderErr) {
    return NextResponse.json({ error: orderErr.message }, { status: 500 });
  }

  const isVerifiedPurchase = !!orderRow;

  // Display name: use customers.display_name from auth email if no profile name
  const { data: customer } = await (supabase as any)
    .from('customers')
    .select('display_name, email')
    .eq('id', user.id)
    .single();

  const reviewerDisplayName = customer?.display_name?.trim() || customerEmailPrefix(customer?.email);

  const insertRow: any = {
    product_id: productId,
    customer_id: user.id,
    order_id: orderRow?.order_id ?? null,
    order_item_id: orderRow?.id ?? null,
    rating,
    title,
    body: reviewBody,
    reviewer_display_name: reviewerDisplayName,
    is_verified_purchase: isVerifiedPurchase,
  };

  const { data: created, error: insertErr } = await (supabase as any)
    .from('reviews')
    .insert(insertRow)
    .select('id, rating, title, body, reviewer_display_name, created_at')
    .single();

  if (insertErr) {
    if (String(insertErr.message || '').includes('reviews_product_customer_unique')) {
      return NextResponse.json(
        { error: 'You have already reviewed this product' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ review: created });
}

function customerEmailPrefix(email: string | undefined | null): string {
  if (!email) return 'Customer';
  const local = email.split('@')[0];
  if (!local) return 'Customer';
  return local.charAt(0).toUpperCase() + local.slice(1);
}

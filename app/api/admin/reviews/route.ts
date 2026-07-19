import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/admin/reviews?status=pending|published|hidden&product=<id>&q=<text>&page=<n>
 * Admin moderation: lists all reviews with filters.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const sp = req.nextUrl.searchParams;
  const status = sp.get('status') || 'pending';
  const productId = sp.get('product');
  const q = sp.get('q')?.trim();
  const page = Math.max(0, parseInt(sp.get('page') || '0', 10));
  const pageSize = 25;

  if (!['pending', 'published', 'hidden', 'all'].includes(status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 });
  }

  let query = (supabase as any)
    .from('reviews')
    .select(
      'id, product_id, customer_id, rating, title, body, reviewer_display_name, is_published, is_verified_purchase, created_at, products(name, slug)'
    )
    .order('created_at', { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1);

  if (status === 'pending') query = query.eq('is_published', true); // user-facing pending here = unmoderated queue
  if (status === 'published') query = query.eq('is_published', true);
  if (status === 'hidden') query = query.eq('is_published', false);
  if (productId) query = query.eq('product_id', productId);
  if (q) query = query.or(`body.ilike.%${q}%,title.ilike.%${q}%,reviewer_display_name.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ reviews: data ?? [] });
}

/**
 * PATCH /api/admin/reviews
 * Body: { id, isPublished }
 * Toggles a review's published state.
 */
export async function PATCH(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const id = body?.id;
  const isPublished = !!body?.isPublished;

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const admin = await createAdminClient();
  const { error } = await (admin as any)
    .from('reviews')
    .update({ is_published: isPublished })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/admin/reviews?id=<id>
 * Permanently deletes a review.
 */
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const admin = await createAdminClient();
  const { error } = await (admin as any).from('reviews').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

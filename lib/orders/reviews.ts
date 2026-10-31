import { createAdminClient } from '@/lib/supabase/admin';

/**
 * The customer's own reviews for an order: one per item plus the delivery
 * rating. Used to show "Rated" instead of an empty form, and to pre-fill the
 * form when they come back to change their mind.
 */
export async function loadOrderReviews(
  orderId: string,
  customerId: string | null,
): Promise<{ delivery: { rating: number; body: string | null } | null; items: Record<string, { rating: number; body: string; title: string | null }> }> {
  const empty = { delivery: null, items: {} as Record<string, { rating: number; body: string; title: string | null }> };
  if (!customerId) return empty;

  const admin = await createAdminClient();

  const { data: deliveryRows } = (await admin
    .from('order_delivery_reviews')
    .select('rating, body')
    .eq('order_id', orderId)
    .eq('customer_id', customerId)
    .maybeSingle()) as any;

  const { data: itemRows } = (await admin
    .from('reviews')
    .select('order_item_id, rating, body, title')
    .eq('order_id', orderId)
    .eq('customer_id', customerId)) as any;

  const items: Record<string, { rating: number; body: string; title: string | null }> = {};
  for (const row of itemRows ?? []) {
    if (row.order_item_id) {
      items[row.order_item_id] = { rating: row.rating, body: row.body, title: row.title ?? null };
    }
  }

  return {
    delivery: deliveryRows ? { rating: deliveryRows.rating, body: deliveryRows.body ?? null } : null,
    items,
  };
}

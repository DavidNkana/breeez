import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/session';
import { StarRating } from './StarRating';
import { ReviewForm } from './ReviewForm';

/**
 * Server component: reviews block on the PDP.
 * Shows summary, average, list, and the review form (if eligible).
 */
export async function ReviewSection({ productId }: { productId: string }) {
  const supabase = await createClient();

  // Summary (one row, fast)
  const { data: summary } = (await (supabase as any)
    .from('review_summary')
    .select('*')
    .eq('product_id', productId)
    .maybeSingle()) ?? { data: null };

  // Top reviews
  const { data: reviews } = (await (supabase as any)
    .from('reviews')
    .select('id, rating, title, body, reviewer_display_name, is_verified_purchase, created_at')
    .eq('product_id', productId)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(20)) as { data: any[] | null };

  // Eligibility: customer logged in AND has a PAID order with this product AND has not yet reviewed
  let eligibility: { canReview: boolean; reason?: string } = { canReview: false };
  let loggedIn = false;
  try {
    const user = await requireUser();
    loggedIn = true;

    const { data: existing } = await (supabase as any)
      .from('reviews')
      .select('id')
      .eq('product_id', productId)
      .eq('customer_id', user.id)
      .maybeSingle();

    if (existing) {
      eligibility = { canReview: false, reason: 'You have already reviewed this product.' };
    } else {
      const { data: orderItem } = await (supabase as any)
        .from('order_items')
        .select('id, orders!inner(customer_id, status, paid_at)')
        .eq('product_id', productId)
        .eq('orders.customer_id', user.id)
        .in('orders.status', ['paid', 'processing', 'shipped', 'delivered'])
        .not('orders.paid_at', 'is', null)
        .limit(1)
        .maybeSingle();
      if (orderItem) {
        eligibility = { canReview: true };
      } else {
        eligibility = {
          canReview: false,
          reason: 'Reviews are only available to verified buyers.',
        };
      }
    }
  } catch {
    eligibility = {
      canReview: false,
      reason: 'Sign in to leave a review. Only verified buyers can review.',
    };
  }

  const count = summary?.review_count ?? 0;
  const avg = summary ? Number(summary.avg_rating) : 0;

  return (
    <section className="mt-12 border-t border-brand-200 pt-8">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-xl font-semibold text-brand-950">Customer reviews</h2>
        {count > 0 && (
          <div className="flex items-center gap-3">
            <StarRating value={avg} size="lg" />
            <span className="text-base text-brand-700">
              {avg.toFixed(1)} out of 5 · {count} review{count === 1 ? '' : 's'}
            </span>
          </div>
        )}
      </header>

      {/* Distribution summary */}
      {count > 0 && summary && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-lg bg-brand-50 border border-brand-100">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-semibold text-brand-950">{avg.toFixed(1)}</span>
              <span className="text-brand-600 text-sm">/ 5</span>
            </div>
            <div className="mt-1 text-sm text-brand-600">
              Based on {count} verified review{count === 1 ? '' : 's'}
            </div>
          </div>
          <div className="space-y-1">
            {[
              { star: 5, count: summary.five_count ?? 0 },
              { star: 4, count: summary.four_count ?? 0 },
              { star: 3, count: summary.three_count ?? 0 },
              { star: 2, count: summary.two_count ?? 0 },
              { star: 1, count: summary.one_count ?? 0 },
            ].map((row) => {
              const pct = count > 0 ? Math.round((row.count / count) * 100) : 0;
              return (
                <div key={row.star} className="flex items-center gap-2 text-xs">
                  <span className="w-8 text-brand-700">{row.star}★</span>
                  <div className="flex-1 h-2 rounded-full bg-brand-100 overflow-hidden">
                    <div
                      className="h-full bg-amber-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-brand-600">{row.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Review form for verified buyers */}
      <ReviewForm productId={productId} loggedIn={loggedIn} eligibility={eligibility} />

      {/* Reviews list (only when there are reviews to show) */}
      {reviews && reviews.length > 0 && (
        <ul className="mt-8 space-y-6">
          {reviews.map((r) => (
            <li key={r.id} className="border-b border-brand-100 pb-6 last:border-b-0">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div
                    className="h-9 w-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold uppercase"
                    aria-hidden="true"
                  >
                    {(r.reviewer_display_name || 'C').charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-brand-900">{r.reviewer_display_name}</p>
                    <p className="text-xs text-brand-500">
                      {new Date(r.created_at).toLocaleDateString('en-ZA', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                      {r.is_verified_purchase && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Verified buyer
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <StarRating value={r.rating} size="sm" />
              </div>
              {r.title && (
                <h3 className="mt-3 text-sm font-semibold text-brand-950">{r.title}</h3>
              )}
              <p className="mt-1 text-sm text-brand-800 whitespace-pre-line leading-relaxed">
                {r.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      {/* "No reviews" message — only ONE message, the most helpful one for the viewer's state.
          ReviewForm above already handles "sign in to review" and "only verified buyers".
          So if they're here with no reviews, we add a one-line note that's context-specific. */}
      {count === 0 && (
        <p className="mt-8 text-sm text-brand-500 italic">
          {loggedIn
            ? eligibility.canReview
              ? 'No reviews yet for this product. Be the first.'
              : 'No reviews yet for this product.'
            : 'No reviews yet for this product.'}
        </p>
      )}
    </section>
  );
}

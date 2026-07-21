import { requireAdmin } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ReviewsManager } from '@/components/admin/ReviewsManager';
import { LogoutButton } from '@/components/auth/LogoutButton';

export const dynamic = 'force-dynamic';

export default async function AdminReviewsPage() {
  await requireAdmin();
  const supabase = (await createAdminClient()) as any;

  // All reviews, newest first. Joins product name/slug for context.
  const { data } = await supabase
    .from('reviews')
    .select('id, product_id, customer_id, rating, title, body, reviewer_display_name, is_published, is_verified_purchase, created_at, products(name, slug)')
    .order('created_at', { ascending: false })
    .limit(100);

  const reviews = (data ?? []) as any[];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-10 pb-20 safe-bottom">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-brand-950">Reviews</h1>
            <p className="mt-1 text-sm text-brand-600">
              Moderate customer reviews. Hidden reviews do not show on the product page.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/admin" className="text-sm text-brand-700 hover:underline">← Back to dashboard</a>
            <LogoutButton />
          </div>
        </div>

        <ReviewsManager initialReviews={reviews} />
      </main>
      <Footer />
    </>
  );
}

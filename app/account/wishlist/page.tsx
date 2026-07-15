import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/session';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { EmptyState } from '@/components/ui/EmptyState';

export default async function WishlistPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: items } = await supabase
    .from('wishlists')
    .select('*, variant:product_variants(*, product:products(name, slug))')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10 pb-20 safe-bottom">
        <h1 className="text-2xl font-semibold text-brand-950">My wishlist</h1>
        <p className="mt-1 text-sm text-brand-600">Items you saved for later.</p>

        <div className="mt-6">
          {items && items.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {items.map((w: any) => (
                <a key={w.id} href={`/p/${w.variant?.product?.slug}`} className="block rounded-lg border border-brand-200 bg-white p-3 hover:border-brand-400">
                  <p className="text-sm font-medium text-brand-900 line-clamp-1">{w.variant?.product?.name}</p>
                  <p className="text-xs text-brand-500">{w.variant?.name}</p>
                </a>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Your wishlist is empty"
              description="Tap the heart on any product to save it for later."
              action={{ label: 'Browse products', href: '/' }}
            />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
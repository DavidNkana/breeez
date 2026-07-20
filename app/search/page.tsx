import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductGrid } from '@/components/shop/ProductGrid';
import { searchProducts } from '@/lib/catalog/queries';
import { EmptyState } from '@/components/ui/EmptyState';

type Props = { searchParams: { q?: string } };

export default async function SearchPage({ searchParams }: Props) {
  const q = (searchParams.q || '').trim();
  const results = q.length >= 2 ? await searchProducts(q, 40) : [];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl min-w-0 overflow-x-hidden px-4 py-6 pb-20 safe-bottom">
        <h1 className="text-2xl font-semibold text-brand-950">
          {q ? `Results for "${q}"` : 'Search'}
        </h1>
        <p className="mt-1 text-sm text-brand-600">
          {q ? `${results.length} ${results.length === 1 ? 'product' : 'products'} found` : 'Use the search bar above to find products.'}
        </p>

        <div className="mt-6">
          {q && results.length === 0 ? (
            <EmptyState
              title="No products found"
              description={`We couldn't find anything matching "${q}". Try different keywords.`}
              action={{ label: 'Browse categories', href: '/' }}
            />
          ) : (
            <ProductGrid products={results} />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
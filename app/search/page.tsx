import { ProductGrid } from '@/components/shop/ProductGrid';
import { listProductsPage } from '@/lib/catalog/queries';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProductPagination } from '@/components/shop/ProductPagination';
import { parsePage, pageHref, PRODUCTS_PER_PAGE, shouldRedirectToCanonicalPage, shouldRedirectToFirstPage, type QueryParams } from '@/lib/catalog/pagination';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

type Props = { searchParams: QueryParams };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = typeof searchParams.q === 'string' ? searchParams.q.trim() : '';
  return {
    title: q ? `Search results for ${q} — Evasale` : 'Search — Evasale',
    alternates: { canonical: pageHref('/search', searchParams, parsePage(searchParams.page)) },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const q = (typeof searchParams.q === 'string' ? searchParams.q : '').trim();
  const sort = (searchParams.sort === 'price_asc' || searchParams.sort === 'price_desc' || searchParams.sort === 'popular') ? searchParams.sort : 'newest';
  const page = parsePage(searchParams.page);
  if (shouldRedirectToCanonicalPage(searchParams.page, page)) redirect(pageHref('/search', searchParams, page));
  const { products: results, totalCount } = q.length >= 2
    ? await listProductsPage({ search: q, sort, limit: PRODUCTS_PER_PAGE, offset: (page - 1) * PRODUCTS_PER_PAGE })
    : { products: [], totalCount: 0 };
  const totalPages = Math.ceil(totalCount / PRODUCTS_PER_PAGE);
  if (shouldRedirectToFirstPage(page, totalPages)) redirect(pageHref('/search', searchParams, 1));

  return (
    <>
      <main className="mx-auto max-w-6xl min-w-0 overflow-x-hidden px-4 py-6 pb-20 safe-bottom">
        <h1 className="text-2xl font-semibold text-brand-950">
          {q ? `Results for "${q}"` : 'Search'}
        </h1>
        <p className="mt-1 text-sm text-brand-600">
           {q ? `${totalCount} ${totalCount === 1 ? 'product' : 'products'} found` : 'Use the search bar above to find products.'}
        </p>

        <div className="mt-6">
          {q && results.length === 0 ? (
            <EmptyState
              title="No products found"
              description={`We couldn't find anything matching "${q}". Try different keywords.`}
              action={{ label: 'Browse categories', href: '/' }}
            />
          ) : (
            <>
              <ProductGrid products={results} />
              <ProductPagination pathname="/search" query={searchParams} page={page} totalCount={totalCount} />
            </>
          )}
        </div>
      </main>
    </>
  );
}

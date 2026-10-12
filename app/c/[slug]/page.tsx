import { ProductGrid } from '@/components/shop/ProductGrid';
import { getCategoryBySlug, listProductsPage } from '@/lib/catalog/queries';
import { notFound, redirect } from 'next/navigation';
import { parsePage, pageHref, PRODUCTS_PER_PAGE, shouldRedirectToCanonicalPage, shouldRedirectToFirstPage, type QueryParams } from '@/lib/catalog/pagination';
import { ProductPagination } from '@/components/shop/ProductPagination';
import Link from 'next/link';
import type { Metadata } from 'next';

type Props = { params: { slug: string }; searchParams: QueryParams };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const category = await getCategoryBySlug(params.slug);
  if (!category) return { title: 'Category not found — Evasale' };
  return {
    title: `${category.name} — Evasale`,
    description: category.description || `Shop ${category.name} at Evasale. ZAR. SA-wide delivery.`,
    alternates: { canonical: pageHref(`/c/${category.slug}`, searchParams, parsePage(searchParams.page)) },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const category = await getCategoryBySlug(params.slug);
  if (!category) notFound();

  const sort = (searchParams.sort === 'price_asc' || searchParams.sort === 'price_desc' || searchParams.sort === 'popular') ? searchParams.sort : 'newest';
  const minPrice = typeof searchParams.minPrice === 'string' ? Number.parseFloat(searchParams.minPrice) : NaN;
  const maxPrice = typeof searchParams.maxPrice === 'string' ? Number.parseFloat(searchParams.maxPrice) : NaN;
  const minPriceCents = Number.isFinite(minPrice) ? Math.round(minPrice * 100) : undefined;
  const maxPriceCents = Number.isFinite(maxPrice) ? Math.round(maxPrice * 100) : undefined;
  const page = parsePage(searchParams.page);
  if (shouldRedirectToCanonicalPage(searchParams.page, page)) redirect(pageHref(`/c/${category.slug}`, searchParams, page));

  const { products, totalCount } = await listProductsPage({
    categoryId: category.id,
    sort,
    minPriceCents,
    maxPriceCents,
    limit: PRODUCTS_PER_PAGE,
    offset: (page - 1) * PRODUCTS_PER_PAGE
  });
  const totalPages = Math.ceil(totalCount / PRODUCTS_PER_PAGE);
  if (shouldRedirectToFirstPage(page, totalPages)) redirect(pageHref(`/c/${category.slug}`, searchParams, 1));

  return (
    <>
      <main className="mx-auto max-w-6xl min-w-0 overflow-x-hidden px-4 py-6 pb-20 safe-bottom">
        <nav className="text-xs text-brand-500">
          <Link href="/" className="hover:underline">Home</Link>
          <span className="mx-1">/</span>
           <span className="text-brand-700 dark:text-brand-200">{category.name}</span>
        </nav>

        <div className="mt-2 flex items-baseline justify-between">
           <h1 className="text-2xl md:text-3xl font-semibold text-brand-950 dark:text-brand-50">{category.name}</h1>
           <p className="text-sm text-brand-600 dark:text-brand-300">{totalCount} {totalCount === 1 ? 'product' : 'products'}</p>
        </div>

        {category.description && (
           <p className="mt-1 text-sm text-brand-600 dark:text-brand-300">{category.description}</p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-brand-100 pb-4">
           <span className="text-sm text-brand-600 dark:text-brand-300">Sort:</span>
          {(['newest', 'price_asc', 'price_desc', 'popular'] as const).map((s) => {
            const label = s === 'newest' ? 'Newest' : s === 'price_asc' ? 'Price: Low → High' : s === 'price_desc' ? 'Price: High → Low' : 'Popular';
            const isActive = sort === s;
            const href = pageHref(`/c/${category.slug}`, { ...searchParams, sort: s }, 1);
            return (
              <Link
                key={s}
                href={href}
                 className={isActive ? 'rounded-full bg-brand-900 px-3 py-1 text-xs font-medium text-white' : 'rounded-full border border-brand-300 bg-white dark:border-brand-600 dark:bg-brand-900 dark:text-brand-100 px-3 py-1 text-xs font-medium text-brand-700 hover:border-brand-500'}
              >
                {label}
              </Link>
            );
          })}
        </div>

        <div className="mt-6">
         <ProductGrid products={products} />
         <ProductPagination pathname={`/c/${category.slug}`} query={searchParams} page={page} totalCount={totalCount} />
        </div>
      </main>
    </>
  );
}

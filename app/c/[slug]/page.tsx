import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductGrid } from '@/components/shop/ProductGrid';
import { getCategoryBySlug, listProducts } from '@/lib/catalog/queries';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

type Props = { params: { slug: string }; searchParams: { sort?: string; minPrice?: string; maxPrice?: string; page?: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategoryBySlug(params.slug);
  if (!category) return { title: 'Category not found — Trends Day-to-Day' };
  return {
    title: `${category.name} — Trends Day-to-Day`,
    description: category.description || `Shop ${category.name} at Trends Day-to-Day. ZAR. SA-wide delivery.`
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const category = await getCategoryBySlug(params.slug);
  if (!category) notFound();

  const sort = (searchParams.sort as 'newest' | 'price_asc' | 'price_desc' | 'popular') || 'newest';
  const minPriceCents = searchParams.minPrice ? Math.round(parseFloat(searchParams.minPrice) * 100) : undefined;
  const maxPriceCents = searchParams.maxPrice ? Math.round(parseFloat(searchParams.maxPrice) * 100) : undefined;
  const page = Math.max(1, parseInt(searchParams.page || '1', 10));
  const limit = 24;
  const offset = (page - 1) * limit;

  const products = await listProducts({
    categoryId: category.id,
    sort,
    minPriceCents,
    maxPriceCents,
    limit,
    offset
  });

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl min-w-0 overflow-x-hidden px-4 py-6 pb-20 safe-bottom">
        <nav className="text-xs text-brand-500">
          <Link href="/" className="hover:underline">Home</Link>
          <span className="mx-1">/</span>
          <span className="text-brand-700">{category.name}</span>
        </nav>

        <div className="mt-2 flex items-baseline justify-between">
          <h1 className="text-2xl md:text-3xl font-semibold text-brand-950">{category.name}</h1>
          <p className="text-sm text-brand-600">{products.length} {products.length === 1 ? 'product' : 'products'}</p>
        </div>

        {category.description && (
          <p className="mt-1 text-sm text-brand-600">{category.description}</p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-brand-100 pb-4">
          <span className="text-sm text-brand-600">Sort:</span>
          {(['newest', 'price_asc', 'price_desc', 'popular'] as const).map((s) => {
            const label = s === 'newest' ? 'Newest' : s === 'price_asc' ? 'Price: Low → High' : s === 'price_desc' ? 'Price: High → Low' : 'Popular';
            const isActive = sort === s;
            const params = new URLSearchParams({ ...searchParams, sort: s, page: '1' });
            const href = `/c/${category.slug}?${params.toString()}`;
            return (
              <Link
                key={s}
                href={href}
                className={isActive ? 'rounded-full bg-brand-900 px-3 py-1 text-xs font-medium text-white' : 'rounded-full border border-brand-300 bg-white px-3 py-1 text-xs font-medium text-brand-700 hover:border-brand-500'}
              >
                {label}
              </Link>
            );
          })}
        </div>

        <div className="mt-6">
          <ProductGrid products={products} />
        </div>
      </main>
      <Footer />
    </>
  );
}
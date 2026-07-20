import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductGrid } from '@/components/shop/ProductGrid';
import { listProducts } from '@/lib/catalog/queries';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'New Arrivals — Trends Day-to-Day',
  description: 'The newest products at Trends Day-to-Day. All categories, latest first.'
};

type Props = { searchParams: { sort?: string } };

export default async function NewArrivalsPage({ searchParams }: Props) {
  const sort = (searchParams.sort as 'newest' | 'price_asc' | 'price_desc' | 'popular') || 'newest';
  const products = await listProducts({ sort, limit: 40 });

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl min-w-0 overflow-x-hidden px-4 py-6 pb-20 safe-bottom">
        <nav className="text-xs text-brand-500">
          <Link href="/" className="hover:underline">Home</Link>
          <span className="mx-1">/</span>
          <span className="text-brand-700">New arrivals</span>
        </nav>

        <div className="mt-2 flex items-baseline justify-between">
          <h1 className="text-2xl md:text-3xl font-semibold text-brand-950">New arrivals</h1>
          <p className="text-sm text-brand-600">{products.length} {products.length === 1 ? 'product' : 'products'}</p>
        </div>

        <p className="mt-1 text-sm text-brand-600">The latest products across all categories, newest first.</p>

        <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-brand-100 pb-4">
          <span className="text-sm text-brand-600">Sort:</span>
          {(['newest', 'price_asc', 'price_desc', 'popular'] as const).map((s) => {
            const label = s === 'newest' ? 'Newest' : s === 'price_asc' ? 'Price: Low → High' : s === 'price_desc' ? 'Price: High → Low' : 'Popular';
            const isActive = sort === s;
            return (
              <Link
                key={s}
                href={`/new?sort=${s}`}
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
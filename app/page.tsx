import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CategoryGrid } from '@/components/shop/CategoryGrid';
import { ProductCard } from '@/components/shop/ProductCard';

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="flex-1 pb-20 safe-bottom">
        {/* Hero */}
        <section className="bg-gradient-to-br from-brand-50 via-white to-accent-50">
          <div className="mx-auto max-w-6xl px-4 py-10 md:py-20">
            <p className="text-sm font-medium text-accent-700">Welcome to Breeez</p>
            <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-brand-950 leading-tight">
              Shop SA, all in one place.
            </h1>
            <p className="mt-3 max-w-xl text-base md:text-lg text-brand-700 leading-relaxed">
              Apparel, home, kitchen, school and more — curated for South African homes,
              delivered nationwide.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link
                href="/c/apparel"
                className="inline-flex items-center justify-center rounded-md bg-brand-900 px-5 py-3 text-sm font-medium text-white hover:bg-brand-800 transition-colors"
              >
                Shop new arrivals
              </Link>
              <Link
                href="/c/kitchen"
                className="inline-flex items-center justify-center rounded-md border border-brand-300 bg-white px-5 py-3 text-sm font-medium text-brand-900 hover:bg-brand-50 transition-colors"
              >
                Browse kitchen
              </Link>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-xl md:text-2xl font-semibold text-brand-950">Shop by category</h2>
            <Link href="/categories" className="text-sm text-brand-600 hover:underline whitespace-nowrap">View all</Link>
          </div>
          <CategoryGrid />
        </section>

        {/* Featured products placeholder */}
        <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <h2 className="text-xl md:text-2xl font-semibold text-brand-950">Featured</h2>
          <p className="mt-1 text-sm text-brand-600">Hand-picked favourites for you.</p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <ProductCard
                key={i}
                slug={`placeholder-${i}`}
                name={`Featured item ${i}`}
                priceCents={12900 + i * 500}
                imageUrl={`https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop&q=${i * 20}`}
              />
            ))}
          </div>
        </section>

        {/* Trust strip */}
        <section className="border-t border-brand-200 bg-brand-50">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-8 md:grid-cols-3 md:gap-8 md:py-10">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-white flex items-center justify-center text-brand-900">🚚</div>
              <div>
                <p className="font-medium text-brand-900">Free delivery over R500</p>
                <p className="text-sm text-brand-600">Pargo pickup, The Courier Guy, or Dawn Wing same-day.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-white flex items-center justify-center text-brand-900">↩</div>
              <div>
                <p className="font-medium text-brand-900">7-day returns</p>
                <p className="text-sm text-brand-600">Not right? Send it back within 7 days.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-white flex items-center justify-center text-brand-900">🔒</div>
              <div>
                <p className="font-medium text-brand-900">Secure payments</p>
                <p className="text-sm text-brand-600">PayFast, Yoco, Ozow. SA gateways, ZAR.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
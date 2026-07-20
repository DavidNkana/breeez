import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CategoryGrid } from '@/components/shop/CategoryGrid';
import { ProductGrid } from '@/components/shop/ProductGrid';
import { RecentlyViewed } from '@/components/shop/RecentlyViewed';
import { getTodaysPicks, listProducts } from '@/lib/catalog/queries';
import { brand } from '@/lib/brand';

export default async function HomePage() {
  const todaysPicks = await getTodaysPicks(10);
  const featured = await listProducts({ featured: true, sort: 'newest', limit: 6 });

  return (
    <>
      <Header />
      <main className="flex-1 min-w-0 overflow-x-hidden pb-12 safe-bottom">
        <section className="bg-gradient-to-br from-brand-50 via-white to-accent-50">
          <div className="mx-auto max-w-6xl min-w-0 overflow-x-hidden px-4 py-10 md:py-20">
            <p className="text-sm font-medium text-accent-700">{brand.home.eyebrow}</p>
            <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-brand-950 leading-tight">
              {brand.home.headline}
            </h1>
            <p className="mt-3 max-w-xl text-base md:text-lg text-brand-700 leading-relaxed">
              {brand.home.subheadline}
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link
                href={brand.home.primaryCta.href}
                className="inline-flex items-center justify-center rounded-md bg-accent-500 hover:bg-accent-600 px-5 py-3 text-sm font-medium text-white transition-colors"
              >
                {brand.home.primaryCta.label}
              </Link>
              <Link
                href={brand.home.secondaryCta.href}
                className="inline-flex items-center justify-center rounded-md border border-brand-300 bg-white px-5 py-3 text-sm font-medium text-brand-900 hover:bg-brand-50 transition-colors"
              >
                {brand.home.secondaryCta.label}
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl min-w-0 overflow-x-hidden px-4 py-10 md:py-14">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-xl md:text-2xl font-semibold text-brand-950">Shop by category</h2>
            <Link href="/categories" className="text-sm text-brand-600 hover:underline whitespace-nowrap">View all</Link>
          </div>
          <CategoryGrid />
        </section>

        {/* Today's picks — newest products (or today's if any added today) */}
        {todaysPicks.length > 0 && (
          <section className="mx-auto max-w-6xl min-w-0 overflow-x-hidden px-4 py-10 md:py-14">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-xl md:text-2xl font-semibold text-brand-950">Today&apos;s picks</h2>
              <Link href="/new" className="text-sm text-brand-600 hover:underline whitespace-nowrap">View all</Link>
            </div>
            <p className="mt-1 text-sm text-brand-600">
              {todaysPicks.length} new product{todaysPicks.length === 1 ? '' : 's'} added recently.
            </p>
            <div className="mt-6">
              <ProductGrid products={todaysPicks} />
            </div>
            {todaysPicks.length >= 10 && (
              <div className="mt-6 text-center">
                <Link
                  href="/new"
                  className="inline-flex items-center rounded-md border border-brand-300 bg-white px-5 py-2.5 text-sm font-medium text-brand-900 hover:bg-brand-50"
                >
                  View all products →
                </Link>
              </div>
            )}
          </section>
        )}

        {featured.length > 0 && (
          <section className="mx-auto max-w-6xl min-w-0 overflow-x-hidden px-4 py-10 md:py-14">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-xl md:text-2xl font-semibold text-brand-950">Featured</h2>
              <Link href="/new" className="text-sm text-brand-600 hover:underline whitespace-nowrap">Shop all</Link>
            </div>
            <p className="mt-1 text-sm text-brand-600">Hand-picked favourites from the team.</p>
            <div className="mt-6">
              <ProductGrid products={featured} showPreview />
            </div>
          </section>
        )}

        <section className="mt-8 border-t border-brand-200 bg-brand-50">
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

        {/* Recently viewed — only renders after the user has visited any product */}
        <section className="mx-auto max-w-6xl min-w-0 overflow-x-hidden px-4 pb-4">
          <RecentlyViewed heading="Continue where you left off" />
        </section>
      </main>
      <Footer />
    </>
  );
}
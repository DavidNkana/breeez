import Link from 'next/link';
import { Suspense } from 'react';
import { CategoryGrid } from '@/components/shop/CategoryGrid';
import { ProductGrid } from '@/components/shop/ProductGrid';
import { RecentlyViewed } from '@/components/shop/RecentlyViewed';
import { PromoBanner } from '@/components/shop/PromoBanner';
import { VideoBanner } from '@/components/shop/VideoBanner';
import { getTodaysPicks, listProducts } from '@/lib/catalog/queries';
import { brand } from '@/lib/brand';

export default async function HomePage() {
  const todaysPicks = await getTodaysPicks(10);
  const featured = await listProducts({ featured: true, sort: 'newest', limit: 6 });

  return (
    <>
      <main className="flex-1 pb-12 safe-bottom">
        <section className="bg-black border-b border-brand-800">
          <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-8 md:py-12">
            <img
              src={brand.subtextLogo}
              alt={`${brand.name} logo with tagline`}
              className="h-16 sm:h-20 md:h-28 lg:h-32 w-auto max-w-full"
            />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-6 md:py-10">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-xl md:text-2xl font-semibold text-brand-950 dark:text-brand-50">Shop by category</h2>
            <Link href="/categories" className="text-sm text-brand-600 dark:text-brand-300 hover:underline whitespace-nowrap">View all</Link>
          </div>
          <Suspense fallback={null}>
            <CategoryGrid homeOnly />
          </Suspense>
        </section>

        {/* Promo banner 1 — full-bleed image, between Categories and Today's picks */}
        <PromoBanner
          imageUrl="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=2000&q=70"
          alt="A warm, naturally lit modern South African living room"
          eyebrow="Curated for SA homes"
          headline="Designed for how South Africans actually live"
          subheadline="Home essentials that look right, last long, and arrive when you need them — nationwide."
          ctaHref="/c/home-decor"
          ctaLabel="Shop home"
        />

        {/* Today's picks — newest products (or today's if any added today) */}
        {todaysPicks.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-xl md:text-2xl font-semibold text-brand-950 dark:text-brand-50">Today&apos;s picks</h2>
              <Link href="/new" className="text-sm text-brand-600 dark:text-brand-300 hover:underline whitespace-nowrap">View all</Link>
            </div>
            <p className="mt-1 text-sm text-brand-600 dark:text-brand-300">
              {todaysPicks.length} new product{todaysPicks.length === 1 ? '' : 's'} added recently.
            </p>
            <div className="mt-6">
              <ProductGrid products={todaysPicks} />
            </div>
            {todaysPicks.length >= 10 && (
              <div className="mt-6 text-center">
                <Link
                  href="/new"
                  className="inline-flex items-center rounded-md border border-brand-300 bg-white px-5 py-2.5 text-sm font-medium text-brand-900 hover:bg-brand-50 dark:bg-brand-900 dark:text-white dark:hover:bg-brand-800"
                >
                  View all products →
                </Link>
              </div>
            )}
          </section>
        )}

        {featured.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-xl md:text-2xl font-semibold text-brand-950 dark:text-brand-50">Featured</h2>
              <Link href="/new" className="text-sm text-brand-600 dark:text-brand-300 hover:underline whitespace-nowrap">Shop all</Link>
            </div>
            <p className="mt-1 text-sm text-brand-600 dark:text-brand-300">Hand-picked favourites from the team.</p>
            <div className="mt-6">
              <ProductGrid products={featured} showPreview />
            </div>
          </section>
        )}

        {/* Promo banner 2 — full-bleed LOOPING VIDEO, before the trust strip */}
        <VideoBanner
          videoUrl="https://cdn.pixabay.com/video/2015/10/16/1006-142621176_large.mp4"
          posterUrl="https://cdn.pixabay.com/video/2015/10/16/1006-142621176_tiny.jpg"
          eyebrow="New season"
          headline="New wardrobe. Better prices."
          subheadline="Women, men, kids, shoes and bags — for SA weather and SA budgets. Delivered nationwide."
          ctaHref="/c/women"
          ctaLabel="Shop women"
        />

        <div className="mx-auto mt-4 max-w-6xl px-4"><div className="rounded-lg bg-accent-500 px-4 py-3 text-center text-sm font-semibold text-white">App-only: Free shipping on orders over R650</div></div>
        <section className="mt-8 border-t border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-900">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-8 md:grid-cols-3 md:gap-8 md:py-10">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-white dark:bg-brand-800 flex items-center justify-center text-brand-900 dark:text-brand-100"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7zM7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" /></svg></div>
              <div>
                 <p className="font-medium text-brand-900 dark:text-white">Nationwide delivery</p>
                 <p className="text-sm text-brand-600 dark:text-brand-300">Pargo pickup, The Courier Guy, or Dawn Wing same-day.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-white dark:bg-brand-800 flex items-center justify-center text-brand-900 dark:text-brand-100"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M9 7H4v5M4 12a8 8 0 1 0 2-5" /></svg></div>
              <div>
                 <p className="font-medium text-brand-900 dark:text-white">13-day returns</p>
                 <p className="text-sm text-brand-600 dark:text-brand-300">Not right? Send it back within 13 days.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-white dark:bg-brand-800 flex items-center justify-center text-brand-900 dark:text-brand-100"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg></div>
              <div>
                 <p className="font-medium text-brand-900 dark:text-white">Secure payments</p>
                 <p className="text-sm text-brand-600 dark:text-brand-300">PayFast, Yoco, Ozow. SA gateways, ZAR.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Recently viewed — only renders after the user has visited any product */}
        <section className="mx-auto max-w-6xl px-4 pb-4">
          <RecentlyViewed heading="Continue where you left off" />
        </section>
      </main>
    </>
  );
}

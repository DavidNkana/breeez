import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-xl px-4 py-16 pb-20 safe-bottom text-center">
        <p className="text-6xl font-bold text-brand-900">404</p>
        <h1 className="mt-3 text-2xl font-semibold text-brand-950">
          We can&apos;t find that page
        </h1>
        <p className="mt-2 text-sm text-brand-700">
          The link may be out of date, or the product may have been removed.
          Try one of these instead.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center rounded-md bg-brand-900 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
          >
            Go home
          </Link>
          <Link
            href="/new"
            className="inline-flex items-center rounded-md border border-brand-300 bg-white px-4 py-2 text-sm font-medium text-brand-900 hover:bg-brand-50"
          >
            New arrivals
          </Link>
          <Link
            href="/categories"
            className="inline-flex items-center rounded-md border border-brand-300 bg-white px-4 py-2 text-sm font-medium text-brand-900 hover:bg-brand-50"
          >
            Browse categories
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}

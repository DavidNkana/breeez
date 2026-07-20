import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import Link from 'next/link';
import { CategoryGrid } from '@/components/shop/CategoryGrid';

export default function CategoriesPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-20 safe-bottom">
        <nav className="text-xs text-brand-500">
          <Link href="/" className="hover:underline">Home</Link>
          <span className="mx-1">/</span>
          <span className="text-brand-700">All categories</span>
        </nav>
        <h1 className="mt-2 text-2xl md:text-3xl font-semibold text-brand-950">All categories</h1>
        <p className="mt-1 text-sm text-brand-600">Browse everything Trends Day-to-Day has to offer.</p>
        <div className="mt-6">
          <CategoryGrid />
        </div>
      </main>
      <Footer />
    </>
  );
}
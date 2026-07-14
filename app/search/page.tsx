import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function SearchPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10 pb-20 safe-bottom">
        <h1 className="text-2xl font-semibold text-brand-950">Search</h1>
        <input
          type="search"
          placeholder="Search products..."
          className="mt-4 w-full rounded-md border border-brand-300 px-3 py-2 text-sm"
        />
        <p className="mt-4 text-sm text-brand-600">
          Search results placeholder. Postgres FTS wired in plan Task 11.
        </p>
      </main>
      <Footer />
    </>
  );
}
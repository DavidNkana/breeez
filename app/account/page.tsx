import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function AccountPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10 pb-20 safe-bottom">
        <h1 className="text-2xl font-semibold text-brand-950">My account</h1>
        <p className="mt-2 text-sm text-brand-600">
          Account placeholder. Supabase auth + orders + addresses wired in plan Task 13.
        </p>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {['Orders', 'Addresses', 'Wishlist', 'Settings'].map((label) => (
            <a
              key={label}
              href="#"
              className="rounded-lg border border-brand-200 bg-white p-4 text-sm font-medium text-brand-800 hover:border-brand-400"
            >
              {label}
            </a>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
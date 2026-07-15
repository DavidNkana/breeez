import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function AddressesPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10 pb-20 safe-bottom">
        <h1 className="text-2xl font-semibold text-brand-950">My addresses</h1>
        <p className="mt-2 text-sm text-brand-600">
          Address book placeholder. Wired in plan Task 13 (account).
        </p>
        <div className="mt-6 rounded-lg border border-dashed border-brand-300 p-8 text-center text-sm text-brand-500">
          No saved addresses.
        </div>
      </main>
      <Footer />
    </>
  );
}
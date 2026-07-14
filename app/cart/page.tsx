import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function CartPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10 pb-20 safe-bottom">
        <h1 className="text-2xl font-semibold text-brand-950">Your cart</h1>
        <p className="mt-2 text-sm text-brand-600">
          Cart page placeholder. Full cart drawer + page wired in plan Task 14.
        </p>
        <div className="mt-6 rounded-lg border border-dashed border-brand-300 p-8 text-center text-sm text-brand-500">
          Your cart is empty.
        </div>
      </main>
      <Footer />
    </>
  );
}
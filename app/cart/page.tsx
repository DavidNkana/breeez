import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartView } from '@/components/shop/CartView';

export default function CartPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10 pb-20 safe-bottom">
        <h1 className="text-2xl font-semibold text-brand-950">Your cart</h1>
        <div className="mt-6">
          <CartView />
        </div>
      </main>
      <Footer />
    </>
  );
}
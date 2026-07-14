import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function CheckoutPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10 pb-20 safe-bottom">
        <h1 className="text-2xl font-semibold text-brand-950">Checkout</h1>
        <p className="mt-2 text-sm text-brand-600">
          Checkout placeholder. Payment gateways (PayFast + Yoco + Ozow) wired in plan Task 18.
        </p>
      </main>
      <Footer />
    </>
  );
}
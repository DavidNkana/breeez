import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import { requireUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export default async function CheckoutPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: savedAddresses } = (await supabase
    .from('addresses')
    .select('*')
    .eq('customer_id', user.id)
    .order('is_default', { ascending: false })) as any;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-10 pb-20 safe-bottom">
        <h1 className="text-2xl font-semibold text-brand-950">Checkout</h1>
        <p className="mt-1 text-sm text-brand-600">Almost there. Just a few details.</p>

        <div className="mt-6">
          <CheckoutForm user={user} savedAddresses={savedAddresses} />
        </div>
      </main>
      <Footer />
    </>
  );
}
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth/session';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AddressBook } from '@/components/account/AddressBook';

export const dynamic = 'force-dynamic';

export default async function AddressesPage() {
  const user = await requireUser();
  const supabase = await createAdminClient();

  const { data: addresses } = (await supabase
    .from('addresses')
    .select('*')
    .eq('customer_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })) as { data: any[] | null };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10 pb-20 safe-bottom">
        <h1 className="text-2xl font-semibold text-brand-950">My addresses</h1>
        <p className="mt-1 text-sm text-brand-600">Manage your delivery addresses.</p>

        <AddressBook initialAddresses={addresses ?? []} />
      </main>
      <Footer />
    </>
  );
}

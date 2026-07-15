import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/session';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { EmptyState } from '@/components/ui/EmptyState';

export default async function AddressesPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: addresses } = (await supabase
    .from('addresses')
    .select('*')
    .eq('customer_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })) as any;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10 pb-20 safe-bottom">
        <h1 className="text-2xl font-semibold text-brand-950">My addresses</h1>
        <p className="mt-1 text-sm text-brand-600">Manage your delivery addresses.</p>

        <div className="mt-6">
          {addresses && addresses.length > 0 ? (
            <div className="space-y-3">
              {((addresses ?? []) as any[]).map((a) => (
                <div key={a.id} className="rounded-lg border border-brand-200 bg-white p-4">
                  <div className="flex items-baseline justify-between">
                    <p className="font-medium text-brand-900">{a.label}</p>
                    {a.is_default && <span className="text-xs text-accent-700">Default</span>}
                  </div>
                  <p className="mt-1 text-sm text-brand-700">
                    {a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />
                    {a.city}, {a.province} {a.postal_code}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No saved addresses"
              description="Add an address at checkout to save it for next time."
            />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
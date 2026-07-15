import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/session';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRand } from '@/lib/format';

export default async function OrdersPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: orders } = (await supabase
    .from('orders')
    .select('*')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })) as any;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10 pb-20 safe-bottom">
        <h1 className="text-2xl font-semibold text-brand-950">My orders</h1>
        <p className="mt-1 text-sm text-brand-600">Track and manage your orders.</p>

        <div className="mt-6">
          {orders && orders.length > 0 ? (
            <div className="space-y-3">
              {((orders ?? []) as any[]).map((o) => (
                <Link
                  key={o.id}
                  href={`/account/orders/${o.id}`}
                  className="block rounded-lg border border-brand-200 bg-white p-4 hover:border-brand-400"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-sm text-brand-900">{o.order_number}</p>
                      <p className="mt-0.5 text-xs text-brand-500">
                        {new Date(o.created_at).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered' ? 'success' : o.status === 'cancelled' || o.status === 'refunded' ? 'danger' : 'warning'}>
                        {o.status.replace('_', ' ')}
                      </Badge>
                      <p className="mt-1 text-sm font-semibold text-brand-950">{formatRand(o.total_cents)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No orders yet"
              description="When you place orders, they'll appear here."
              action={{ label: 'Start shopping', href: '/' }}
            />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
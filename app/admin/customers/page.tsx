import { requireAdmin } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import Link from 'next/link';
import { formatRand } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';

export const dynamic = 'force-dynamic';

export default async function AdminCustomersPage() {
  await requireAdmin();
  const supabase = await createClient();

  // customers + their orders count + total spent in one go
  const { data: customers } = await supabase
    .from('customers')
    .select(`
      id,
      email,
      display_name,
      created_at,
      orders:orders(count)
    `)
    .order('created_at', { ascending: false })
    .limit(200);

  // Aggregate total spent
  const { data: spendRows } = await supabase
    .from('orders')
    .select('customer_id, total_cents')
    .not('customer_id', 'is', null);
  const spendByCustomer = new Map<string, number>();
  for (const r of spendRows ?? []) {
    if (!r.customer_id) continue;
    spendByCustomer.set(r.customer_id, (spendByCustomer.get(r.customer_id) ?? 0) + r.total_cents);
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10 pb-20 safe-bottom">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-brand-950">Customers</h1>
            <p className="mt-1 text-sm text-brand-600">All registered customers.</p>
          </div>
          <Link href="/admin" className="text-sm text-brand-700 underline hover:text-brand-900">
            ← Back to dashboard
          </Link>
        </div>

        <div className="mt-6 rounded-lg border border-brand-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-xs uppercase text-brand-600">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Total spent</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100">
              {((customers ?? []) as any[]).map((c) => {
                const orderCount = c.orders?.[0]?.count ?? 0;
                const totalSpent = spendByCustomer.get(c.id) ?? 0;
                return (
                  <tr key={c.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold uppercase">
                          {(c.display_name || c.email || 'C').charAt(0)}
                        </div>
                        <span className="font-medium">{c.display_name || <span className="text-brand-500">Not set</span>}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-brand-700">{c.email}</td>
                    <td className="px-4 py-3">
                      {orderCount > 0 ? (
                        <Badge variant="success">{orderCount}</Badge>
                      ) : (
                        <span className="text-brand-500">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{formatRand(totalSpent)}</td>
                    <td className="px-4 py-3 text-brand-500 text-xs">
                      {new Date(c.created_at).toLocaleDateString('en-ZA')}
                    </td>
                  </tr>
                );
              })}
              {(!customers || customers.length === 0) && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-brand-500">No customers yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
      <Footer />
    </>
  );
}

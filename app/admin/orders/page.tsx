import { requireAdmin } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import Link from 'next/link';
import { formatRand } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { OrderRowActions } from '@/components/admin/OrderRowActions';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: orders } = (await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)) as { data: any[] | null };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl min-w-0 overflow-x-hidden px-4 py-10 pb-20 safe-bottom">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-brand-950">Orders</h1>
            <p className="mt-1 text-sm text-brand-600">All customer orders.</p>
          </div>
          <Link href="/admin/customers" className="text-sm text-brand-700 underline hover:text-brand-900">
            Customer list →
          </Link>
        </div>

        <div className="mt-6 rounded-lg border border-brand-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-xs uppercase text-brand-600">
              <tr>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100">
              {((orders ?? []) as any[]).map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 font-mono text-xs">{o.order_number}</td>
                  <td className="px-4 py-3 text-brand-700">{o.email}</td>
                  <td className="px-4 py-3 font-medium">{formatRand(o.total_cents)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={['paid', 'shipped', 'delivered'].includes(o.status) ? 'success' : 'warning'}>
                      {o.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-brand-500 text-xs">
                    {new Date(o.created_at).toLocaleDateString('en-ZA')}
                  </td>
                  <td className="px-4 py-3">
                    <OrderRowActions order={{
                      id: o.id,
                      order_number: o.order_number,
                      email: o.email,
                      status: o.status,
                      shipping_method: o.shipping_method,
                      shipping_address: o.shipping_address,
                    }} onChanged={() => null} />
                  </td>
                </tr>
              ))}
              {(!orders || orders.length === 0) && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-brand-500">No orders yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
      <Footer />
    </>
  );
}

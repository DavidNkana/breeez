import { requireAdmin } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { LogoutButton } from '@/components/auth/LogoutButton';

export default async function AdminDashboard() {
  await requireAdmin();
  const supabase = await createClient();

  const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true);
  const { count: orderCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });
  const { count: returnCount } = await supabase.from('returns').select('*', { count: 'exact', head: true }).eq('status', 'requested');

  const { data: recentOrders } = await supabase
    .from('orders')
    .select('id, order_number, email, total_cents, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10 pb-20 safe-bottom">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-brand-950">Admin</h1>
          <LogoutButton redirectTo="/" />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-brand-200 bg-white p-4">
            <p className="text-xs uppercase text-brand-500">Active products</p>
            <p className="mt-1 text-3xl font-semibold text-brand-950">{productCount ?? 0}</p>
          </div>
          <div className="rounded-lg border border-brand-200 bg-white p-4">
            <p className="text-xs uppercase text-brand-500">Total orders</p>
            <p className="mt-1 text-3xl font-semibold text-brand-950">{orderCount ?? 0}</p>
          </div>
          <div className="rounded-lg border border-brand-200 bg-white p-4">
            <p className="text-xs uppercase text-brand-500">Categories</p>
            <p className="mt-1 text-3xl font-semibold text-brand-950">10</p>
          </div>
          <div className="rounded-lg border border-brand-200 bg-white p-4">
            <p className="text-xs uppercase text-brand-500">Pending returns</p>
            <p className="mt-1 text-3xl font-semibold text-brand-950">{returnCount ?? 0}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-3">
          <a href="/admin/products" className="rounded-lg border border-brand-200 bg-white p-4 hover:border-brand-400">
            <p className="font-medium text-brand-900">Manage products</p>
            <p className="mt-1 text-sm text-brand-600">Add, edit, or remove products from your catalogue.</p>
          </a>
          <a href="/admin/orders" className="rounded-lg border border-brand-200 bg-white p-4 hover:border-brand-400">
            <p className="font-medium text-brand-900">View orders</p>
            <p className="mt-1 text-sm text-brand-600">Process and ship customer orders.</p>
          </a>
          <a href="/admin/returns" className="rounded-lg border border-brand-200 bg-white p-4 hover:border-brand-400">
            <p className="font-medium text-brand-900">Manage returns</p>
            <p className="mt-1 text-sm text-brand-600">Approve or reject customer return requests.</p>
          </a>
        </div>

        {recentOrders && recentOrders.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-brand-950">Recent orders</h2>
            <div className="mt-4 rounded-lg border border-brand-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-brand-50 text-left text-xs uppercase text-brand-600">
                  <tr>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-100">
                  {recentOrders.map((o: any) => (
                    <tr key={o.id}>
                      <td className="px-4 py-3 font-mono text-xs">{o.order_number}</td>
                      <td className="px-4 py-3">{o.email}</td>
                      <td className="px-4 py-3">R{(o.total_cents / 100).toFixed(2)}</td>
                      <td className="px-4 py-3">{o.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
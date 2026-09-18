import Link from 'next/link';
import { formatRand } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { OrderRowActions } from '@/components/admin/OrderRowActions';
import { logError } from '@/lib/utils/error-logger';
import { requireAdmin } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  // requireAdmin throws NEXT_REDIRECT to bounce non-admins to /.
  // Do NOT wrap this in try/catch — the catch was eating the redirect
  // signal and leaving users stuck on the page.
  await requireAdmin();

  let orders: any[] = [];
  let errorTitle = 'Failed to load orders';
  let errorDetail: string | null = null;

  try {
    const supabase = await createAdminClient();
    const { data, error } = (await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)) as { data: any[] | null; error: { message: string } | null };

    if (error) {
      errorDetail = error.message ?? 'Unknown database error';
      logError({ message: `[admin/orders] query failed: ${errorDetail}`, severity: 'error' });
    } else {
      orders = (data ?? []) as any[];
    }
  } catch (err: any) {
    errorDetail = err?.message ?? String(err);
    logError({ message: `[admin/orders] thrown: ${errorDetail}`, severity: 'error' });
    console.error('[admin/orders] error:', err);
  }

  return (
    <>
      <main className="mx-auto max-w-6xl min-w-0 overflow-x-hidden px-4 py-10 pb-20 safe-bottom">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-brand-950 dark:text-white">Orders</h1>
            <p className="mt-1 text-sm text-brand-600 dark:text-brand-300">All customer orders.</p>
          </div>
          <Link
            href="/admin/customers"
            className="text-sm text-brand-700 dark:text-brand-300 underline hover:text-brand-900 dark:hover:text-white"
          >
            Customer list →
          </Link>
        </div>

        {errorDetail && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/40">
            <p className="font-medium text-red-900 dark:text-red-300">{errorTitle}</p>
            <p className="mt-1 text-sm text-red-700 dark:text-red-400 font-mono break-all">{errorDetail}</p>
            <p className="mt-2 text-xs text-red-600 dark:text-red-500">
              The full stack trace is in Vercel logs (Deployments → latest → Logs).
            </p>
          </div>
        )}

        {!errorDetail && orders.length === 0 && (
          <div className="mt-6 rounded-lg border border-brand-200 dark:border-brand-700 bg-white dark:bg-brand-900 p-8 text-center text-sm text-brand-500 dark:text-brand-400">
            No orders yet.
          </div>
        )}

        {!errorDetail && orders.length > 0 && (
          <div className="mt-6 rounded-lg border border-brand-200 dark:border-brand-700 bg-white dark:bg-brand-900 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-50 dark:bg-brand-800 text-left text-xs uppercase text-brand-600 dark:text-brand-300">
                <tr>
                  <th className="px-4 py-3">Order #</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100 dark:divide-brand-700">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-3 font-mono text-xs">{o.order_number}</td>
                    <td className="px-4 py-3 text-brand-700 dark:text-brand-300">{o.email}</td>
                    <td className="px-4 py-3 font-medium text-brand-950 dark:text-white">
                      {formatRand(o.total_cents)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={['paid', 'shipped', 'delivered'].includes(o.status) ? 'success' : 'warning'}
                      >
                        {o.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-brand-500 dark:text-brand-400 text-xs">
                      {new Date(o.created_at).toLocaleDateString('en-ZA')}
                    </td>
                    <td className="px-4 py-3">
                      <OrderRowActions
                        order={{
                          id: o.id,
                          order_number: o.order_number,
                          email: o.email,
                          status: o.status,
                          shipping_method: o.shipping_method,
                          shipping_address: o.shipping_address,
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}

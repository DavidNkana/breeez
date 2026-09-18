import { requireAdmin } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { formatRand } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';

export const dynamic = 'force-dynamic';

type DerivedCustomer = {
  email: string;
  customer_id: string | null;
  display_name: string | null;
  is_signed_up: boolean;
  orderCount: number;
  totalSpent: number;
  firstOrderAt: string;
  lastOrderAt: string;
};

export default async function AdminCustomersPage() {
  await requireAdmin();
  const supabase = await createAdminClient();

  // Pull every order's email + totals. Guest checkouts have email but
  // customer_id=null; signed-up users have both. Either way the email
  // is the unique identifier for "a customer" from the admin POV.
  const { data: orders } = (await supabase
    .from('orders')
    .select('email, customer_id, total_cents, created_at')
    .order('created_at', { ascending: false })) as { data: any[] | null };

  // Aggregate per email
  const byEmail = new Map<string, DerivedCustomer>();
  for (const o of orders ?? []) {
    const existing = byEmail.get(o.email);
    if (existing) {
      existing.orderCount += 1;
      existing.totalSpent += o.total_cents;
      if (o.created_at < existing.firstOrderAt) existing.firstOrderAt = o.created_at;
      if (o.created_at > existing.lastOrderAt) existing.lastOrderAt = o.created_at;
    } else {
      byEmail.set(o.email, {
        email: o.email,
        customer_id: o.customer_id,
        display_name: null,
        is_signed_up: false,
        orderCount: 1,
        totalSpent: o.total_cents,
        firstOrderAt: o.created_at,
        lastOrderAt: o.created_at,
      });
    }
  }

  // Cross-reference with the customers table to get display_name + flag
  // signed-up customers vs guest checkouts.
  const customerList = Array.from(byEmail.values());
  if (customerList.length > 0) {
    const { data: profiles } = (await supabase
      .from('customers')
      .select('id, email, display_name')
      .in('email', customerList.map((c) => c.email))) as { data: any[] | null };
    const profileByEmail = new Map<string, any>();
    for (const p of profiles ?? []) profileByEmail.set(p.email, p);
    for (const c of customerList) {
      const p = profileByEmail.get(c.email);
      if (p) {
        c.display_name = p.display_name ?? null;
        c.is_signed_up = true;
        c.customer_id = c.customer_id ?? p.id;
      }
    }
  }

  // Sort by total spent desc (most valuable customers first)
  customerList.sort((a, b) => b.totalSpent - a.totalSpent);

  return (
    <>
      <main className="mx-auto max-w-6xl min-w-0 overflow-x-hidden px-4 py-10 pb-20 safe-bottom">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-brand-950 dark:text-white">Customers</h1>
            <p className="mt-1 text-sm text-brand-600 dark:text-brand-300">
              Everyone who&apos;s ever ordered, including guest checkouts.
            </p>
          </div>
          <Link
            href="/admin"
            className="text-sm text-brand-700 dark:text-brand-300 underline hover:text-brand-900 dark:hover:text-white"
          >
            ← Back to dashboard
          </Link>
        </div>

        <div className="mt-6 rounded-lg border border-brand-200 dark:border-brand-700 bg-white dark:bg-brand-900 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brand-50 dark:bg-brand-800 text-left text-xs uppercase text-brand-600 dark:text-brand-300">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Total spent</th>
                <th className="px-4 py-3">First / Last order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100 dark:divide-brand-700">
              {customerList.map((c) => (
                <tr key={c.email}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-brand-100 dark:bg-brand-800 text-brand-700 dark:text-brand-200 flex items-center justify-center font-semibold uppercase">
                        {(c.display_name || c.email).charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-brand-950 dark:text-white">
                          {c.display_name || (
                            <span className="text-brand-500 dark:text-brand-400">Guest checkout</span>
                          )}
                        </div>
                        {!c.is_signed_up && (
                          <div className="text-xs text-brand-500 dark:text-brand-400">
                            No account — only orders via email
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-brand-700 dark:text-brand-300">{c.email}</td>
                  <td className="px-4 py-3">
                    {c.orderCount > 0 ? (
                      <Badge variant="success">{c.orderCount}</Badge>
                    ) : (
                      <span className="text-brand-500">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-brand-950 dark:text-white">
                    {formatRand(c.totalSpent)}
                  </td>
                  <td className="px-4 py-3 text-brand-500 dark:text-brand-400 text-xs">
                    {new Date(c.firstOrderAt).toLocaleDateString('en-ZA')}
                    <br />
                    {new Date(c.lastOrderAt).toLocaleDateString('en-ZA')}
                  </td>
                </tr>
              ))}
              {customerList.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-brand-500 dark:text-brand-400">
                    No orders yet — customers appear here once an order is placed.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}

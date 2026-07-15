import { requireAdmin } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import Link from 'next/link';
import { formatRand } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { LogoutButton } from '@/components/auth/LogoutButton';

export default async function AdminProductsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: products } = await supabase
    .from('products')
    .select('*, category:categories(name, slug)')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10 pb-20 safe-bottom">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-brand-950">Products</h1>
            <p className="mt-1 text-sm text-brand-600">Manage your Breeez catalogue.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/products/new" className="inline-flex items-center rounded-md bg-brand-900 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
              + New product
            </Link>
            <LogoutButton redirectTo="/" />
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-brand-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-xs uppercase text-brand-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100">
              {(products ?? []).map((p: any) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-brand-900">{p.name}</p>
                    <p className="text-xs text-brand-500">/{p.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-brand-700">{p.category?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-brand-900">{formatRand(p.base_price_cents)}</td>
                  <td className="px-4 py-3">
                    {p.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="warning">Draft</Badge>}
                  </td>
                </tr>
              ))}
              {(!products || products.length === 0) && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-brand-500">No products yet. Add your first one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
      <Footer />
    </>
  );
}
import { requireAdmin } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import Link from 'next/link';
import { formatRand, calcDiscountPercent } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { DeleteProductButton } from '@/components/admin/DeleteProductButton';

export default async function AdminProductsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: products } = (await supabase
    .from('products')
    .select('*, category:categories(name, slug), images:product_images(url, sort_order)')
    .order('created_at', { ascending: false })
    .limit(50)) as any;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10 pb-20 safe-bottom">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-brand-950">Products</h1>
            <p className="mt-1 text-sm text-brand-600">Manage your Trends Day-to-Day catalogue.</p>
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
                <th className="px-4 py-3">Image</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100">
              {((products ?? []) as any[]).map((p) => {
                const imgs = (p.images ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);
                const mainImg = imgs[0]?.url;
                const discount = calcDiscountPercent(p.base_price_cents, p.compare_at_cents);
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-3">
                      <Link href={`/p/${p.slug}`} className="block h-12 w-12 overflow-hidden rounded bg-brand-100">
                        {mainImg ? (
                          <img src={mainImg} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-xs text-brand-400">—</div>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/p/${p.slug}`} className="font-medium text-brand-900 hover:underline">
                        {p.name}
                      </Link>
                      <p className="text-xs text-brand-500">/{p.slug}</p>
                      {discount && (
                        <Badge variant="danger" className="mt-1">{discount}% OFF</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-brand-700">{p.category?.name ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-brand-900">{formatRand(p.base_price_cents)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {p.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="warning">Draft</Badge>}
                        {p.is_featured && <Badge variant="accent">Featured</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/products/${p.id}/edit`}
                          className="inline-flex items-center rounded-md border border-brand-300 bg-white px-3 py-1.5 text-xs font-medium text-brand-900 hover:bg-brand-50"
                        >
                          Edit
                        </Link>
                        <DeleteProductButton productId={p.id} productName={p.name} />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(!products || (products as any[]).length === 0) && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-brand-500">No products yet. Add your first one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
      <Footer />
    </>
  );
}
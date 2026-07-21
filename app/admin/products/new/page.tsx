import { requireAdmin } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { NewProductForm } from '@/components/admin/NewProductForm';
import Link from 'next/link';

export default async function NewProductPage() {
  await requireAdmin();
  const supabase = await createAdminClient();
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('sort_order');

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-10 pb-20 safe-bottom">
        <Link href="/admin/products" className="text-sm text-brand-600 hover:underline">← Back to products</Link>
        <h1 className="mt-2 text-2xl font-semibold text-brand-950">Add new product</h1>
        <p className="mt-1 text-sm text-brand-600">Create a product with variants, images, and pricing.</p>

        <div className="mt-6">
          <NewProductForm categories={categories ?? []} />
        </div>
      </main>
      <Footer />
    </>
  );
}
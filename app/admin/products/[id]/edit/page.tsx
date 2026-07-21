import { requireAdmin } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { EditProductForm } from '@/components/admin/EditProductForm';
import Link from 'next/link';
import { notFound } from 'next/navigation';

type Props = { params: { id: string } };

export default async function EditProductPage({ params }: Props) {
  await requireAdmin();
  const supabase = await createAdminClient();

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (!product) notFound();

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('sort_order');

  const { data: images } = await supabase
    .from('product_images')
    .select('id, url, sort_order')
    .eq('product_id', params.id)
    .order('sort_order');

  const { data: variants } = (await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', params.id)
    .order('sort_order')) as any;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-10 pb-20 safe-bottom">
        <Link href="/admin/products" className="text-sm text-brand-600 hover:underline">← Back to products</Link>
        <h1 className="mt-2 text-2xl font-semibold text-brand-950">Edit product</h1>
        <p className="mt-1 text-sm text-brand-600">Update the product details, variants, images, and visibility.</p>

        <div className="mt-6">
          <EditProductForm
            categories={categories ?? []}
            product={product as any}
            existingImages={images ?? []}
            existingVariants={(variants ?? []).map((v: any) => ({
              ...v,
              options: v.options || {}
            }))}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
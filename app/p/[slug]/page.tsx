import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductGallery } from '@/components/shop/ProductGallery';
import { ProductActions } from '@/components/shop/ProductActions';
import { ProductGrid } from '@/components/shop/ProductGrid';
import { getProductBySlug, getRelatedProducts } from '@/lib/catalog/queries';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return { title: 'Product not found — Breeez' };
  return {
    title: `${product.name} — Breeez`,
    description: product.description.slice(0, 160) || `Buy ${product.name} on Breeez.`
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();

  const related = product.category_id
    ? await getRelatedProducts(product.id, product.category_id, 4)
    : [];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-20 safe-bottom">
        <nav className="text-xs text-brand-500">
          <Link href="/" className="hover:underline">Home</Link>
          {product.category && (
            <>
              <span className="mx-1">/</span>
              <Link href={`/c/${product.category.slug}`} className="hover:underline">{product.category.name}</Link>
            </>
          )}
          <span className="mx-1">/</span>
          <span className="text-brand-700">{product.name}</span>
        </nav>

        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <ProductGallery images={product.images} />

          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-brand-950">{product.name}</h1>

            {product.description && (
              <p className="mt-3 text-sm text-brand-700 whitespace-pre-line">{product.description}</p>
            )}

            <ProductActions
              productId={product.id}
              productSlug={product.slug}
              productName={product.name}
              basePriceCents={product.base_price_cents}
              compareAtCents={product.compare_at_cents}
              variants={product.variants}
              images={product.images}
            />
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-semibold text-brand-950">You might also like</h2>
            <div className="mt-4">
              <ProductGrid products={related} />
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
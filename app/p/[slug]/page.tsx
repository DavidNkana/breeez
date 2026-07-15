import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductGallery } from '@/components/shop/ProductGallery';
import { VariantPicker } from '@/components/shop/VariantPicker';
import { AddToCartButton } from '@/components/shop/AddToCartButton';
import { PriceDisplay } from '@/components/shop/PriceDisplay';
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

            <PriceDisplay
              priceCents={product.variants[0]?.price_cents ?? product.base_price_cents}
              compareAtCents={product.variants[0]?.compare_at_cents ?? product.compare_at_cents}
            />

            {product.description && (
              <p className="mt-4 text-sm text-brand-700 whitespace-pre-line">{product.description}</p>
            )}

            {product.variants.length > 0 && (
              <div className="mt-6">
                <VariantPicker
                  variants={product.variants}
                  basePriceCents={product.base_price_cents}
                />
              </div>
            )}

            <div className="mt-6">
              <AddToCartButton
                productId={product.id}
                productSlug={product.slug}
                productName={product.name}
                imageUrl={product.images[0]?.url}
                variants={product.variants}
                basePriceCents={product.base_price_cents}
              />
            </div>

            <div className="mt-6 text-xs text-brand-500 space-y-1">
              <p>• Free delivery over R500</p>
              <p>• 7-day returns, customer pays return shipping</p>
              <p>• Secure payments via PayFast / Yoco / Ozow</p>
            </div>
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
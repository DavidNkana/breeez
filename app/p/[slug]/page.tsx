import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductGallery } from '@/components/shop/ProductGallery';
import { ProductActions } from '@/components/shop/ProductActions';
import { ProductGrid } from '@/components/shop/ProductGrid';
import { ReviewSection } from '@/components/shop/ReviewSection';
import { RecentlyViewed } from '@/components/shop/RecentlyViewed';
import { TrackRecentlyViewed } from '@/components/shop/TrackRecentlyViewed';
import { getProductBySlug, getRelatedProducts } from '@/lib/catalog/queries';
import { brand } from '@/lib/brand';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return { title: 'Product not found — Trends Day-to-Day' };
  const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://breeez-lyart.vercel.app').replace(/\/+$/, '');
  const priceCents = product.variants[0]?.price_cents ?? 0;
  const priceRand = `R${(priceCents / 100).toFixed(2)}`;
  return {
    title: `${product.name} — Trends Day-to-Day`,
    description: product.description.slice(0, 160) || `Buy ${product.name} at Trends Day-to-Day for ${priceRand}.`,
    openGraph: {
      type: 'website',
      title: product.name,
      description: product.description.slice(0, 160) || `Buy ${product.name} for ${priceRand}`,
      url: `${SITE}/p/${params.slug}`,
      images: product.images[0]?.url ? [{ url: product.images[0].url }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: `Buy ${product.name} for ${priceRand}`,
      images: product.images[0]?.url ? [product.images[0].url] : undefined,
    },
    alternates: { canonical: `${SITE}/p/${params.slug}` },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();

  const related = product.category_id
    ? await getRelatedProducts(product.id, product.category_id, 4)
    : [];

  const priceCents = product.variants[0]?.price_cents ?? 0;
  const compareAt = product.variants[0]?.compare_at_cents ?? null;
  const inStock = product.variants.some((v) => v.stock > 0);
  const SITE_URL = brand.siteUrl;

  // JSON-LD structured data — drives Google rich snippets + product cards
  const jsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    description: product.description || `${product.name} available at ${brand.name}`,
    image: product.images.map((i) => i.url).filter(Boolean),
    sku: product.variants[0]?.sku ?? product.id,
    brand: { '@type': 'Brand', name: brand.name },
    category: product.category?.name,
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/p/${params.slug}`,
      priceCurrency: 'ZAR',
      price: (priceCents / 100).toFixed(2),
      ...(compareAt && compareAt > priceCents
        ? {
            priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          }
        : {}),
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: brand.name },
    },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      product.category && {
        '@type': 'ListItem',
        position: 2,
        name: product.category.name,
        item: `${SITE_URL}/c/${product.category.slug}`,
      },
      { '@type': 'ListItem', position: 3, name: product.name, item: `${SITE_URL}/p/${params.slug}` },
    ].filter(Boolean),
  };

  const orgLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: brand.name,
    url: SITE_URL,
    logo: `${SITE_URL}${brand.logo}`,
  };

  return (
    <>
      {/* JSON-LD: drives Google rich snippets, BreadcrumbList, Organization. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
      />
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
            <h2 className="text-lg font-semibold text-brand-950">You may also like</h2>
            <div className="mt-4">
              <ProductGrid products={related} />
            </div>
          </section>
        )}

        <ReviewSection productId={product.id} />

        <RecentlyViewed currentSlug={product.slug} />

        {/* Invisible client component for tracking */}
        <TrackRecentlyViewed
          slug={product.slug}
          name={product.name}
          imageUrl={product.images[0]?.url || '/placeholder.svg'}
          priceCents={
            product.variants[0]?.price_cents ?? 0
          }
        />
      </main>
      <Footer />
    </>
  );
}
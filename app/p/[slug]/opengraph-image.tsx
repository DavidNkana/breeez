import { ImageResponse } from 'next/og';
import { getProductBySlug } from '@/lib/catalog/queries';

export const runtime = 'nodejs';
export const alt = 'Breeez product';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Dynamic OG image for a product. Generated at /p/[slug]/opengraph-image.
 * Falls back to /opengraph-image if the image isn't there.
 */
export default async function OpengraphImage({
  params,
}: {
  params: { slug: string };
}) {
  const product = await getProductBySlug(params.slug);
  if (!product) {
    return new ImageResponse(
      (
        <div
          style={{
            background: '#1a1f26',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 48,
            fontWeight: 700,
          }}
        >
          Breeez — Shop South Africa
        </div>
      ),
      { ...size }
    );
  }

  const priceCents = product.variants[0]?.price_cents ?? 0;
  const priceRand = `R${(priceCents / 100).toFixed(2)}`;
  const image = product.images[0]?.url;

  return new ImageResponse(
    (
      <div
        style={{
          background: '#1a1f26',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          color: '#fff',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Left: image */}
        <div
          style={{
            width: 630,
            height: 630,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
          }}
        >
          {image ? (
            <img
              src={image}
              alt={product.name}
              width={630}
              height={630}
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div style={{ fontSize: 28, color: '#1a1f26', fontWeight: 700 }}>Breeez</div>
          )}
        </div>

        {/* Right: text */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: 50,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <div
              style={{
                width: 32,
                height: 32,
                background: '#ee3a3f',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                fontWeight: 700,
                color: '#fff',
              }}
            >
              B
            </div>
            <span style={{ fontSize: 18, fontWeight: 600, color: '#cbd5e1' }}>Breeez</span>
          </div>
          <div style={{ fontSize: 22, color: '#94a3b8', marginBottom: 8 }}>
            {product.category?.name ?? 'Product'}
          </div>
          <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.05, marginBottom: 24 }}>
            {product.name}
          </div>
          <div style={{ fontSize: 64, fontWeight: 800, color: '#ee3a3f', marginBottom: 24 }}>
            {priceRand}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div
              style={{
                background: '#ee3a3f',
                color: '#fff',
                padding: '16px 28px',
                borderRadius: 6,
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              Shop now
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

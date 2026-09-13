import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getProductBySlug } from '@/lib/catalog/queries';

export const runtime = 'nodejs';
export const alt = 'Evasale product';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

async function getLogoData() {
  let logo: ArrayBuffer | Uint8Array;
  try {
    const response = await fetch(new URL('../../../public/brand/evasale-logo.png', import.meta.url));
    if (!response.ok) throw new Error(`Logo fetch failed: ${response.status}`);
    logo = await response.arrayBuffer();
  } catch {
    logo = await readFile(path.join(process.cwd(), 'public/brand/evasale-logo.png'));
  }
  const bytes = logo instanceof ArrayBuffer ? new Uint8Array(logo) : logo;
  return `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`;
}

/**
 * Dynamic OG image for a product. Generated at /p/[slug]/opengraph-image.
 * Falls back to /opengraph-image if the image isn't there.
 */
export default async function OpengraphImage({
  params,
}: {
  params: { slug: string };
}) {
  const logo = await getLogoData();
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
           <img src={logo} alt="Evasale" width="280" height="120" style={{ objectFit: 'contain' }} />
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
            <img src={logo} alt="Evasale" width="280" height="120" style={{ objectFit: 'contain' }} />
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
             <img src={logo} alt="Evasale" width="140" height="56" style={{ objectFit: 'contain' }} />
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

import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const alt = 'Evasale — Shop Smart, Save Big';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://breeez-lyart.vercel.app').replace(/\/+$/, '');

async function getLogoData() {
  let logo: ArrayBuffer | Uint8Array;
  try {
    const response = await fetch(new URL('../public/brand/evasale-logo.png', import.meta.url));
    if (!response.ok) throw new Error(`Logo fetch failed: ${response.status}`);
    logo = await response.arrayBuffer();
  } catch {
    logo = await readFile(path.join(process.cwd(), 'public/brand/evasale-logo.png'));
  }
  const bytes = logo instanceof ArrayBuffer ? new Uint8Array(logo) : logo;
  return `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`;
}

export default async function OpengraphImage() {
  const logo = await getLogoData();
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
        <div
          style={{
            flex: 1,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '50px 100px',
          }}
        >
          <div style={{ fontSize: 18, color: '#cbd5e1', letterSpacing: 4, textTransform: 'uppercase', marginBottom: 8 }}>
            South African ecommerce
          </div>
          <img src={logo} alt="Evasale" width="220" height="100" style={{ objectFit: 'contain', objectPosition: 'left center', marginBottom: 24 }} />
          <div style={{ fontSize: 28, color: '#94a3b8', marginBottom: 32 }}>
            Apparel · Home · Kitchen · School
          </div>
          <div style={{ fontSize: 22, color: '#cbd5e1' }}>
            7 Days Return Policy · PayFast / Yoco / Ozow
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

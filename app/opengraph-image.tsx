import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'Breeez — Shop South Africa';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://breeez-lyart.vercel.app').replace(/\/+$/, '');

export default function OpengraphImage() {
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
            width: 630,
            height: 630,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #ee3a3f 0%, #c62828 100%)',
            color: '#fff',
            fontSize: 320,
            fontWeight: 900,
          }}
        >
          B
        </div>
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: 50,
          }}
        >
          <div style={{ fontSize: 18, color: '#cbd5e1', letterSpacing: 4, textTransform: 'uppercase', marginBottom: 8 }}>
            South African ecommerce
          </div>
          <div style={{ fontSize: 88, fontWeight: 800, lineHeight: 1.0, marginBottom: 24 }}>
            Breeez
          </div>
          <div style={{ fontSize: 28, color: '#94a3b8', marginBottom: 32 }}>
            Apparel · Home · Kitchen · School
          </div>
          <div style={{ fontSize: 22, color: '#cbd5e1' }}>
            Free delivery over R500 · PayFast / Yoco / Ozow
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}

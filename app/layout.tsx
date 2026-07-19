import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { StorefrontProviders } from '@/components/shop/StorefrontProviders';
import { NavigationLoader } from '@/components/layout/NavigationLoader';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://breeez-lyart.vercel.app').replace(/\/+$/, '');
const SITE_NAME = 'Breeez';
const TITLE_DEFAULT = `${SITE_NAME} — Shop South Africa`;
const TITLE_TEMPLATE = `%s · ${SITE_NAME}`;
const DESCRIPTION =
  'South African multi-category ecommerce. Apparel, home, kitchen, school and more — curated for SA homes, delivered nationwide. Free delivery over R500.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE_DEFAULT,
    template: TITLE_TEMPLATE,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'South Africa',
    'online shopping SA',
    'home goods',
    'kitchen',
    'apparel',
    'bedroom',
    'bathroom',
    'Pargo',
    'PayFast',
    'Yoco',
    'Ozow',
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  formatDetection: { telephone: false, address: false, email: false },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/icon.svg' }],
  },
  manifest: '/site.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: SITE_NAME,
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: TITLE_DEFAULT,
    description: DESCRIPTION,
    url: SITE_URL,
    locale: 'en_ZA',
    alternateLocale: ['en_US'],
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Breeez — South African multi-category ecommerce',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE_DEFAULT,
    description: DESCRIPTION,
    images: ['/og-default.png'],
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#1a1f26',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA">
      <body className="min-h-screen flex flex-col bg-white text-brand-950 font-sans antialiased">
        <StorefrontProviders />
        <Suspense fallback={null}>
          <NavigationLoader />
        </Suspense>
        {children}
      </body>
    </html>
  );
}

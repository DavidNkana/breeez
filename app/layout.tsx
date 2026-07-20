import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { StorefrontProviders } from '@/components/shop/StorefrontProviders';
import { NavigationLoader } from '@/components/layout/NavigationLoader';
import { brand } from '@/lib/brand';

const SITE_URL = brand.siteUrl;
const SITE_NAME = brand.name;
const TITLE_DEFAULT = `${SITE_NAME} — Shop Smart, Save Big`;
const TITLE_TEMPLATE = `%s · ${SITE_NAME}`;
const DESCRIPTION = brand.shortDescription;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE_DEFAULT,
    template: TITLE_TEMPLATE,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'Trends Day-to-Day',
    'South Africa',
    'online shopping SA',
    'household essentials',
    'groceries',
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
      { url: brand.favicon, type: 'image/png' },
      { url: brand.favicon, sizes: '150x150', type: 'image/png' },
    ],
    apple: [{ url: brand.favicon }],
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
        url: brand.ogDefault,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — everyday essentials`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE_DEFAULT,
    description: DESCRIPTION,
    images: [brand.ogDefault],
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: brand.colors.primary,
  viewportFit: 'cover',
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

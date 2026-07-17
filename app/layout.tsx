import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { StorefrontProviders } from '@/components/shop/StorefrontProviders';
import { NavigationLoader } from '@/components/layout/NavigationLoader';

export const metadata: Metadata = {
  title: 'Breeez — Shop SA',
  description: 'South African multi-category ecommerce. Apparel, home, kitchen, school and more.',
  applicationName: 'Breeez',
  icons: { icon: '/icon.svg' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Breeez'
  },
  formatDetection: { telephone: false }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#1a1f26'
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
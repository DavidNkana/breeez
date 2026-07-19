import type { MetadataRoute } from 'next';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://breeez-lyart.vercel.app').replace(/\/+$/, '');

/**
 * /robots.txt — Next.js picks this up automatically.
 *
 * Allows everything except /admin (internal), /api (programmatic),
 * /account (private), /auth (private), /cart, /checkout.
 * Points search engines at /sitemap.xml and a friendly crawl-delay.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api', '/account', '/auth', '/cart', '/checkout', '/checkout/'],
        crawlDelay: 1,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

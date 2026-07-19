import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://breeez-lyart.vercel.app').replace(/\/+$/, '');

/**
 * Dynamic sitemap.xml — Next.js picks this up at /sitemap.xml.
 * Includes home, all categories, all live products.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/categories`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/new`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/legal/terms`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/legal/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/legal/returns`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/legal/shipping`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/cart`, changeFrequency: 'never', priority: 0.1 },
    { url: `${SITE_URL}/auth/login`, changeFrequency: 'never', priority: 0.1 },
    { url: `${SITE_URL}/auth/register`, changeFrequency: 'never', priority: 0.1 },
  ];

  // Categories
  const { data: categories } = await supabase
    .from('categories')
    .select('slug, updated_at')
    .order('name');

  const categoryRoutes: MetadataRoute.Sitemap = (categories ?? []).map((c: any) => ({
    url: `${SITE_URL}/c/${c.slug}`,
    lastModified: c.updated_at ?? undefined,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  // Products
  const { data: products } = await supabase
    .from('products')
    .select('slug, updated_at')
    .eq('is_active', true);

  const productRoutes: MetadataRoute.Sitemap = (products ?? []).map((p: any) => ({
    url: `${SITE_URL}/p/${p.slug}`,
    lastModified: p.updated_at ?? undefined,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}

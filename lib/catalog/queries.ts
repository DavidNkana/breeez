import { createClient } from '@/lib/supabase/server';
import type { Category, Product, ProductImage, ProductVariant } from '@/lib/supabase/types';

/**
 * Catalog queries — read-only data fetching from Supabase.
 * Used in RSC pages, server components, and route handlers.
 */

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type ListProductsParams = {
  categoryId?: string;
  categorySlug?: string;
  search?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular';
  featured?: boolean;
  limit?: number;
  offset?: number;
};

export type ProductListItem = Product & {
  category: Pick<Category, 'id' | 'slug' | 'name'> | null;
  primary_image: ProductImage | null;
  price_min_cents: number;
  price_max_cents: number;
  total_stock: number;
};

export async function listProducts(params: ListProductsParams = {}): Promise<ProductListItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from('products')
    .select(`
      *,
      category:categories(id, slug, name),
      images:product_images(*)
    `)
    .eq('is_active', true);

  if (params.categoryId) {
    query = query.eq('category_id', params.categoryId);
  }
  if (params.featured) {
    query = query.eq('is_featured', true);
  }
  if (params.minPriceCents != null) {
    query = query.gte('base_price_cents', params.minPriceCents);
  }
  if (params.maxPriceCents != null) {
    query = query.lte('base_price_cents', params.maxPriceCents);
  }
  if (params.search) {
    query = query.textSearch('search_tsv', params.search, { type: 'websearch', config: 'english' });
  }

  switch (params.sort) {
    case 'price_asc':  query = query.order('base_price_cents', { ascending: true }); break;
    case 'price_desc': query = query.order('base_price_cents', { ascending: false }); break;
    case 'popular':    query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false }); break;
    case 'newest':
    default:           query = query.order('created_at', { ascending: false });
  }

  if (params.limit) {
    query = query.limit(params.limit);
  }
  if (params.offset) {
    query = query.range(params.offset, params.offset + (params.limit ?? 20) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  type RowWithJoins = Product & { images: ProductImage[] | null; category: { id: string; slug: string; name: string } | null };
  return ((data ?? []) as RowWithJoins[]).map((p) => {
    const images = p.images ?? [];
    const sortedImages = [...images].sort((a, b) => a.sort_order - b.sort_order);
    return {
      ...p,
      primary_image: sortedImages[0] ?? null,
      price_min_cents: p.base_price_cents,
      price_max_cents: p.base_price_cents,
      total_stock: 0
    };
  });
}

export type ProductDetail = Product & {
  category: Pick<Category, 'id' | 'slug' | 'name'> | null;
  variants: ProductVariant[];
  images: ProductImage[];
};

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(id, slug, name),
      variants:product_variants(*),
      images:product_images(*)
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  type RowWithJoins = Product & {
    variants: ProductVariant[] | null;
    images: ProductImage[] | null;
    category: { id: string; slug: string; name: string } | null;
  };
  const row = data as RowWithJoins;

  const variants = (row.variants ?? [])
    .filter((v) => v.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
  const images = [...(row.images ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  return { ...row, variants, images };
}

export async function getRelatedProducts(productId: string, categoryId: string | null, limit = 4): Promise<ProductListItem[]> {
  if (!categoryId) return [];
  return listProducts({ categoryId, limit });
}

export async function searchProducts(query: string, limit = 20): Promise<ProductListItem[]> {
  return listProducts({ search: query, limit });
}

/**
 * "Today's picks" — for the home page.
 *
 * Uses South African Standard Time (SAST, UTC+2) for "today" so the
 * result matches what a South African customer sees on their wall clock.
 * If no products were added today (SAST), falls back to the `limit` newest
 * products overall (last 7 days, to avoid showing ancient products).
 */
export async function getTodaysPicks(limit = 9): Promise<ProductListItem[]> {
  const supabase = await createClient();
  const now = new Date();
  // SAST = UTC+2, so subtract 2 hours to get "SAST midnight" in UTC
  const nowSAST = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const startOfDaySAST = new Date(Date.UTC(nowSAST.getUTCFullYear(), nowSAST.getUTCMonth(), nowSAST.getUTCDate(), 0, 0, 0));
  // Convert back to UTC: add 2 hours
  const startOfDayUTC = new Date(startOfDaySAST.getTime() + 2 * 60 * 60 * 1000);
  const startOfDayISO = startOfDayUTC.toISOString();

  // First try: products created today (SAST)
  const { data: todays } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(id, slug, name),
      images:product_images(*)
    `)
    .eq('is_active', true)
    .gte('created_at', startOfDayISO)
    .order('created_at', { ascending: false })
    .limit(limit);

  type RowWithJoins = Product & { images: ProductImage[] | null; category: { id: string; slug: string; name: string } | null };

  if (todays && todays.length > 0) {
    return (todays as RowWithJoins[]).map((p) => {
      const images = [...(p.images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
      return {
        ...p,
        primary_image: images[0] ?? null,
        price_min_cents: p.base_price_cents,
        price_max_cents: p.base_price_cents,
        total_stock: 0
      };
    });
  }

  // Fallback: any active product sorted by created_at desc (not just today)
  return listProducts({ sort: 'newest', limit });
}
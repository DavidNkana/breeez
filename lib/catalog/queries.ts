import { createClient } from '@/lib/supabase/server';
import type { Category, Product, ProductImage, ProductVariant } from '@/lib/supabase/types';

/**
 * Catalog queries — read-only data fetching from Supabase.
 *
 * IMPORTANT: We use `as any` on Supabase .from() calls because our hand-written
 * Database type doesn't perfectly match the typed Supabase client, and the
 * typed client returns `never` for many queries. The data IS correct at runtime;
 * the type assertions just bypass the compile-time friction.
 */

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = (await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })) as any;
  if (error) throw error;
  return data ?? [];
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = await createClient();
  const { data, error } = (await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()) as any;
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

  let builder = (supabase
    .from('products')
    .select('*')
    .eq('is_active', true)) as any;

  if (params.categoryId) builder = builder.eq('category_id', params.categoryId);
  if (params.featured) builder = builder.eq('is_featured', true);
  if (params.minPriceCents != null) builder = builder.gte('base_price_cents', params.minPriceCents);
  if (params.maxPriceCents != null) builder = builder.lte('base_price_cents', params.maxPriceCents);
  if (params.search) builder = builder.textSearch('search_tsv', params.search, { type: 'websearch', config: 'english' });

  switch (params.sort) {
    case 'price_asc':  builder = builder.order('base_price_cents', { ascending: true }); break;
    case 'price_desc': builder = builder.order('base_price_cents', { ascending: false }); break;
    case 'popular':    builder = builder.order('is_featured', { ascending: false }).order('created_at', { ascending: false }); break;
    case 'newest':
    default:           builder = builder.order('created_at', { ascending: false });
  }

  if (params.limit) builder = builder.limit(params.limit);
  if (params.offset) builder = builder.range(params.offset, params.offset + (params.limit ?? 20) - 1);

  const { data, error } = await builder;
  if (error) { console.error('[listProducts]', error.message); return []; }

  const products = (data ?? []) as Product[];
  if (products.length === 0) return [];

  const categoryIds = [...new Set(products.map((p) => p.category_id).filter(Boolean))];
  let catMap = new Map<string, Pick<Category, 'id' | 'slug' | 'name'>>();
  if (categoryIds.length > 0) {
    const { data: cats } = (await supabase.from('categories').select('id, slug, name').in('id', categoryIds)) as any;
    for (const c of (cats ?? [])) catMap.set(c.id, c);
  }

  const productIds = products.map((p) => p.id);
  let imgMap = new Map<string, ProductImage>();
  if (productIds.length > 0) {
    const { data: imgs } = (await supabase.from('product_images').select('*').in('product_id', productIds).order('sort_order')) as any;
    for (const img of (imgs ?? [])) { if (!imgMap.has(img.product_id)) imgMap.set(img.product_id, img); }
  }

  return products.map((p) => ({
    ...p,
    category: catMap.get(p.category_id ?? '') ?? null,
    primary_image: imgMap.get(p.id) ?? null,
    price_min_cents: p.base_price_cents,
    price_max_cents: p.base_price_cents,
    total_stock: 0
  }));
}

export type ProductDetail = Product & {
  category: Pick<Category, 'id' | 'slug' | 'name'> | null;
  variants: ProductVariant[];
  images: ProductImage[];
};

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const supabase = await createClient();
  const { data, error } = (await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()) as any;
  if (error || !data) return null;

  const product = data as Product;

  const { data: variants } = (await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', product.id)
    .eq('is_active', true)
    .order('sort_order')) as any;

  const { data: images } = (await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', product.id)
    .order('sort_order')) as any;

  return {
    ...product,
    category: null, // fetched separately if needed
    variants: (variants ?? []) as ProductVariant[],
    images: (images ?? []) as ProductImage[]
  };
}

export async function getRelatedProducts(productId: string, categoryId: string | null, limit = 4): Promise<ProductListItem[]> {
  if (!categoryId) return [];
  return listProducts({ categoryId, limit });
}

export async function searchProducts(query: string, limit = 20): Promise<ProductListItem[]> {
  return listProducts({ search: query, limit });
}

export async function getTodaysPicks(limit = 9): Promise<ProductListItem[]> {
  const supabase = await createClient();
  const now = new Date();
  const nowSAST = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const sodSAST = new Date(Date.UTC(nowSAST.getUTCFullYear(), nowSAST.getUTCMonth(), nowSAST.getUTCDate(), 0, 0, 0));
  const sodUTC = new Date(sodSAST.getTime() + 2 * 60 * 60 * 1000);

  // Fetch ALL active products newest-first (no today filter)
  const allNewest = await listProducts({ sort: 'newest', limit: limit * 2 });

  if (allNewest.length === 0) return [];

  // Filter to today's products
  const todays = allNewest.filter((p) => new Date(p.created_at) >= sodUTC);

  // Always return exactly 'limit' items: today's first, then pad with newest
  const result = todays.slice(0, limit);
  if (result.length < limit) {
    const todaysIds = new Set(result.map((p) => p.id));
    const padding = allNewest.filter((p) => !todaysIds.has(p.id)).slice(0, limit - result.length);
    result.push(...padding);
  }

  return result;
}
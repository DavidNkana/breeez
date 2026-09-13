import { createClient } from '@/lib/supabase/server';
import type { Category, Product, ProductImage, ProductVariant } from '@/lib/supabase/types';
import { logError } from '@/lib/utils/error-logger';

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

export type CategoryListItem = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  parentId: string | null;
  showOnHome: boolean;
};

const STATIC_CATEGORY_FALLBACK: Array<Pick<CategoryListItem, 'slug' | 'name' | 'imageUrl' | 'showOnHome'>> = [
  { slug: 'women', name: 'Women', imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&h=600&fit=crop&q=80', showOnHome: true },
  { slug: 'men', name: 'Men', imageUrl: 'https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?w=600&h=600&fit=crop&q=80', showOnHome: true },
  { slug: 'kids', name: 'Kids', imageUrl: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=600&h=600&fit=crop&q=80', showOnHome: true },
  { slug: 'babywear', name: 'Babywear', imageUrl: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=600&h=600&fit=crop&q=80', showOnHome: false },
  { slug: 'plus-size', name: 'Plus Size', imageUrl: 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=600&h=600&fit=crop&q=80', showOnHome: false },
  { slug: 'shoes', name: 'Shoes', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop&q=80', showOnHome: true },
  { slug: 'bags', name: 'Bags', imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=600&fit=crop&q=80', showOnHome: true },
  { slug: 'home-decor', name: 'Home Decor', imageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&h=600&fit=crop&q=80', showOnHome: true },
  { slug: 'kitchen', name: 'Kitchen', imageUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=600&fit=crop&q=80', showOnHome: true },
  { slug: 'bed-bath', name: 'Bed & Bath', imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&h=600&fit=crop&q=80', showOnHome: true },
  { slug: 'curtains', name: 'Curtains', imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&h=600&fit=crop&q=80', showOnHome: false },
  { slug: 'everyday-essentials', name: 'Everyday Essentials', imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&h=600&fit=crop&q=80', showOnHome: false },
  { slug: 'back-to-school', name: 'Back to School', imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=600&fit=crop&q=80', showOnHome: false },
];

export function getCategoriesStaticFallback(): CategoryListItem[] {
  return STATIC_CATEGORY_FALLBACK.map((category, index) => ({
    ...category,
    id: `00000000-0000-0000-0000-${String(index + 1).padStart(12, '0')}`,
    parentId: null,
  }));
}

export async function listCategories(opts: { homeOnly?: boolean; parentId?: string | null } = {}): Promise<CategoryListItem[]> {
  try {
    const supabase = await createClient();
    let query = (supabase
      .from('categories')
      .select('id, slug, name, image_url, parent_id, show_on_home')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })) as any;

    if (opts.homeOnly) query = query.eq('show_on_home', true);
    if (opts.parentId === null) query = query.is('parent_id', null);
    else if (opts.parentId) query = query.eq('parent_id', opts.parentId);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((category: any) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      imageUrl: category.image_url ?? null,
      parentId: category.parent_id ?? null,
      showOnHome: category.show_on_home ?? false,
    }));
  } catch (error) {
    logError({
      message: '[listCategories] fell back to static list',
      severity: 'warning',
      extra: { error: error instanceof Error ? error.message : String(error) },
    });
    return getCategoriesStaticFallback().filter((category) =>
      (!opts.homeOnly || category.showOnHome) &&
      (opts.parentId === undefined || opts.parentId === null),
    );
  }
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
  avg_rating?: number;
  review_count?: number;
  variants: ProductVariant[];
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
  if (error) { logError({ message: `[listProducts] ${error.message}`, severity: 'error' }); return []; }

  const products = (data ?? []) as Product[];
  if (products.length === 0) return [];

  const categoryIds = [...new Set(products.map((p) => p.category_id).filter(Boolean))];
  let catMap = new Map<string, Pick<Category, 'id' | 'slug' | 'name'>>();
  if (categoryIds.length > 0) {
    const { data: cats } = (await supabase.from('categories').select('id, slug, name').in('id', categoryIds)) as any;
    for (const c of (cats ?? [])) catMap.set(c.id, c);
  }

  const productIds = products.map((p) => p.id);
  const stockMap = new Map<string, number>();
  const variantMap = new Map<string, ProductVariant[]>();
  const { data: variants } = (await supabase.from('product_variants').select('*').in('product_id', productIds).eq('is_active', true).order('sort_order')) as any;
  for (const variant of variants ?? []) {
    stockMap.set(variant.product_id, (stockMap.get(variant.product_id) ?? 0) + Number(variant.stock ?? 0));
    const list = variantMap.get(variant.product_id) ?? [];
    list.push(variant as ProductVariant);
    variantMap.set(variant.product_id, list);
  }
  let imgMap = new Map<string, ProductImage>();
  if (productIds.length > 0) {
    const { data: imgs } = (await supabase.from('product_images').select('*').in('product_id', productIds).order('sort_order')) as any;
    for (const img of (imgs ?? [])) { if (!imgMap.has(img.product_id)) imgMap.set(img.product_id, img); }
  }

  // Review summaries in one query
  let ratingMap = new Map<string, { avg_rating: number; review_count: number }>();
  if (productIds.length > 0) {
    const { data: sums } = (await supabase
      .from('review_summary')
      .select('product_id, avg_rating, review_count')
      .in('product_id', productIds)) as any;
    for (const s of sums ?? []) {
      ratingMap.set(s.product_id, {
        avg_rating: Number(s.avg_rating ?? 0),
        review_count: s.review_count ?? 0,
      });
    }
  }

  return products.map((p) => {
    const r = ratingMap.get(p.id);
    return {
      ...p,
      category: catMap.get(p.category_id ?? '') ?? null,
      primary_image: imgMap.get(p.id) ?? null,
      price_min_cents: p.base_price_cents,
      price_max_cents: p.base_price_cents,
       total_stock: stockMap.get(p.id) ?? 0,
      avg_rating: r?.avg_rating ?? 0,
      review_count: r?.review_count ?? 0,
      variants: variantMap.get(p.id) ?? [],
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

/**
 * Smarter related products: same category, exclude the current product,
 * mix featured + newest for visual variety.
 */
export async function getRelatedProducts(productId: string, categoryId: string | null, limit = 4): Promise<ProductListItem[]> {
  if (!categoryId) return [];
  // Get more than we need so we can filter out the current one
  const all = await listProducts({ categoryId, sort: 'popular', limit: limit + 4 });
  const filtered = all.filter((p) => p.id !== productId).slice(0, limit);
  if (filtered.length >= limit) return filtered;
  // Fallback: pull from other categories if not enough siblings
  if (filtered.length < limit) {
    const extras = await listProducts({ sort: 'popular', limit: limit + 2 });
    const seen = new Set([productId, ...filtered.map((p) => p.id)]);
    for (const p of extras) {
      if (filtered.length >= limit) break;
      if (!seen.has(p.id)) {
        seen.add(p.id);
        filtered.push(p);
      }
    }
  }
  return filtered;
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

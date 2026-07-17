import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { Product, ProductImage } from '@/lib/supabase/types';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select('id, slug, name, base_price_cents')
    .eq('is_active', true)
    .textSearch('search_tsv', q, { type: 'websearch', config: 'english' })
    .limit(10);

  const products = (data ?? []) as Pick<Product, 'id' | 'slug' | 'name' | 'base_price_cents'>[];

  if (products.length === 0) return NextResponse.json({ results: [] });

  // Batch-fetch first image per product
  const productIds = products.map((p) => p.id);
  const { data: imgs } = (await supabase
    .from('product_images')
    .select('product_id, url, sort_order')
    .in('product_id', productIds)
    .order('sort_order', { ascending: true })) as any;

  const imageMap: Map<string, string> = new Map();
  for (const img of (imgs ?? [])) {
    if (!imageMap.has(img.product_id)) imageMap.set(img.product_id, img.url);
  }

  const results = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    base_price_cents: p.base_price_cents,
    image_url: imageMap.get(p.id) ?? null
  }));

  return NextResponse.json({ results });
}
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select('id, slug, name, base_price_cents, images:product_images(url, sort_order)')
    .eq('is_active', true)
    .textSearch('search_tsv', q, { type: 'websearch', config: 'english' })
    .limit(10);

  const results = (data ?? []).map((p: any) => {
    const imgs = p.images ?? [];
    const sortedImgs = [...imgs].sort((a, b) => a.sort_order - b.sort_order);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      base_price_cents: p.base_price_cents,
      image_url: sortedImgs[0]?.url ?? null
    };
  });

  return NextResponse.json({ results });
}
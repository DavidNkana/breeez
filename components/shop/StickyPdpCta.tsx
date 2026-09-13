'use client';

import { formatRand } from '@/lib/format';
import { AddToCartButton } from './AddToCartButton';
import type { ProductVariant } from '@/lib/supabase/types';

export function StickyPdpCta({ productId, slug, name, priceCents, variants, imageUrl }: { productId: string; slug: string; name: string; priceCents: number; variants: ProductVariant[]; imageUrl: string }) {
  return <div className="fixed inset-x-0 z-30 border-t border-brand-200 bg-white/95 p-3 shadow-lg backdrop-blur md:hidden" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 64px)' }}><div className="mx-auto flex max-w-lg items-center gap-3"><span className="font-semibold text-brand-950">{formatRand(priceCents)}</span><div className="flex-1"><AddToCartButton productId={productId} productSlug={slug} productName={name} imageUrl={imageUrl} variants={variants} basePriceCents={priceCents} size="md" /></div></div></div>;
}

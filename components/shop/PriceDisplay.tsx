'use client';

import { formatRand } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';

type PriceDisplayProps = {
  priceCents: number;
  compareAtCents?: number | null;
};

export function PriceDisplay({ priceCents, compareAtCents }: PriceDisplayProps) {
  const onSale = compareAtCents != null && compareAtCents > priceCents;
  return (
    <div className="mt-2 flex items-baseline gap-3">
      <span className="text-2xl font-semibold text-brand-950">{formatRand(priceCents)}</span>
      {onSale && (
        <>
          <span className="text-base text-brand-500 line-through">{formatRand(compareAtCents!)}</span>
          <Badge variant="accent">SALE</Badge>
        </>
      )}
    </div>
  );
}
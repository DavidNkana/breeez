/** Convert imported rand prices to safe persisted cents values. */
function finiteCents(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  const cents = Math.round(value * 100);
  return Number.isFinite(cents) ? cents : null;
}

/** Keep a variant compare-at price only when it is a valid price above that variant's price. */
export function normalizeVariantCompareAtCents(priceCents: unknown, compareAtCents: unknown): number | null {
  if (typeof priceCents !== 'number' || !Number.isFinite(priceCents) || priceCents < 0) return null;
  if (typeof compareAtCents !== 'number' || !Number.isFinite(compareAtCents) || compareAtCents < 0) return null;
  return compareAtCents > priceCents ? compareAtCents : null;
}

export function mapImportedVariantPrices(price: unknown, comparePrice: unknown) {
  const priceCents = finiteCents(price) ?? 0;
  const compareCents = finiteCents(comparePrice);
  const sellingPrice = typeof price === 'number' && Number.isFinite(price) ? price : null;
  const compare = typeof comparePrice === 'number' && Number.isFinite(comparePrice) ? comparePrice : null;

  return {
    price_cents: priceCents,
    compare_at_cents: sellingPrice != null && compare != null && compare > sellingPrice
      ? normalizeVariantCompareAtCents(priceCents, compareCents)
      : null,
  };
}

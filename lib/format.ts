/**
 * Trends Day-to-Day formatting helpers.
 * Money is stored as integer cents (ZAR × 100). All timestamps are UTC.
 */

/**
 * Format an integer-cents amount as South African Rand (ZAR).
 *   formatRand(12900) === 'R129.00'
 *   formatRand(0)      === 'R0.00'
 */
export function formatRand(cents: number): string {
  const rands = Math.floor(cents / 100);
  const remainder = (cents % 100).toString().padStart(2, '0');
  return `R${rands.toLocaleString('en-ZA')}.${remainder}`;
}

/**
 * Calculate discount percentage between base + compare-at prices.
 * Returns null if not on sale (no compare-at, or compare <= base).
 */
export function calcDiscountPercent(basePriceCents: number, compareAtCents: number | null | undefined): number | null {
  if (compareAtCents == null) return null;
  if (compareAtCents <= basePriceCents) return null;
  return Math.round((1 - basePriceCents / compareAtCents) * 100);
}
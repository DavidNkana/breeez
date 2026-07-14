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
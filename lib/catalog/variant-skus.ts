export const MAX_VARIANT_SKU_LENGTH = 64;
const MAX_SKU_ATTEMPTS = 1000;

type VariantSkuSource = { sku?: unknown; options?: Record<string, unknown> };

/** Keep generated SKUs portable across retailers and bounded for admin entry. */
export function sanitizeVariantSku(value: unknown, fallback = 'VARIANT') {
  const clean = (input: unknown) => String(input ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
  const cleaned = clean(value) || clean(fallback) || 'VARIANT';
  return cleaned.slice(0, MAX_VARIANT_SKU_LENGTH).replace(/-+$/, '') || 'VARIANT';
}

function optionSuffix(options: Record<string, unknown> | undefined) {
  return Object.values(options ?? {})
    .join('-');
}

function shortHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).toUpperCase();
}

/** Add a suffix without truncating it away; long suffixes retain a stable hash. */
function boundedSku(base: string, suffix: string) {
  const normalizedBase = sanitizeVariantSku(base, 'VARIANT');
  const normalizedSuffix = sanitizeVariantSku(suffix, 'VARIANT');
  const suffixWithHash = normalizedSuffix.length > 16
    ? `${normalizedSuffix.slice(0, 8)}-${shortHash(normalizedSuffix)}`
    : normalizedSuffix;
  const suffixLimit = Math.max(1, MAX_VARIANT_SKU_LENGTH - 1);
  const finalSuffix = suffixWithHash.slice(0, suffixLimit).replace(/-+$/, '') || 'VARIANT';
  const baseLimit = Math.max(1, MAX_VARIANT_SKU_LENGTH - finalSuffix.length - 1);
  const boundedBase = normalizedBase.slice(0, baseLimit).replace(/-+$/, '') || 'VARIANT';
  return `${boundedBase}-${finalSuffix}`.slice(0, MAX_VARIANT_SKU_LENGTH).replace(/-+$/, '') || 'VARIANT';
}

function uniqueSku(base: string, used: Set<string>, index: number) {
  let sku = sanitizeVariantSku(base, `IMPORT-${index + 1}`);
  for (let attempt = 0; attempt < MAX_SKU_ATTEMPTS && used.has(sku.toLowerCase()); attempt += 1) {
    sku = boundedSku(base, String(attempt + 2));
  }
  if (used.has(sku.toLowerCase())) {
    sku = boundedSku('VARIANT', `${index + 1}-${shortHash(base)}`);
  }
  if (used.has(sku.toLowerCase())) {
    throw new Error(`Unable to generate a unique SKU after ${MAX_SKU_ATTEMPTS} attempts`);
  }
  return sku;
}

/** Assign deterministic, non-empty SKUs unique within one imported product. */
export function assignVariantSkus<T extends VariantSkuSource>(variants: T[]): string[] {
  const sourceCounts = new Map<string, number>();
  variants.forEach((variant) => {
    const source = sanitizeVariantSku(variant.sku, 'VARIANT');
    sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
  });

  const used = new Set<string>();
  return variants.map((variant, index) => {
    const source = sanitizeVariantSku(variant.sku, `IMPORT-${index + 1}`);
    const base = (sourceCounts.get(source) ?? 0) > 1
      ? boundedSku(source, optionSuffix(variant.options) || `VARIANT-${index + 1}`)
      : source;
    const sku = uniqueSku(base, used, index);
    used.add(sku.toLowerCase());
    return sku;
  });
}

export function duplicateVariantSku(skus: string[]) {
  const seen = new Map<string, number>();
  for (let index = 0; index < skus.length; index += 1) {
    const sku = skus[index].trim();
    if (!sku) return { index, message: `Variant ${index + 1} needs a SKU` };
    const key = sku.toLowerCase();
    if (seen.has(key)) return { index, duplicateOf: seen.get(key)! + 1, message: `Variant SKU "${sku}" is duplicated` };
    seen.set(key, index);
  }
  return null;
}

function isUniqueViolation(error: { code?: string; message?: string } | null) {
  return error?.code === '23505' || /duplicate key|unique constraint/i.test(error?.message ?? '');
}

/** Insert variants one at a time so a SKU collision never retries the parent. */
export async function insertVariantsWithSkuRetry<T extends Record<string, unknown>>(input: {
  rows: T[];
  insert: (row: T) => Promise<{ error: { code?: string; message?: string } | null }>;
  maxAttempts?: number;
}) {
  const inserted: T[] = [];
  const maxAttempts = input.maxAttempts ?? 20;
  for (const original of input.rows) {
    const base = sanitizeVariantSku(original.sku, 'VARIANT');
    let lastError: { code?: string; message?: string } | null = null;
    const attemptLimit = Math.min(Math.max(1, maxAttempts), MAX_SKU_ATTEMPTS);
    for (let attempt = 0; attempt < attemptLimit; attempt += 1) {
      const sku = attempt === 0 ? base : boundedSku(base, String(attempt + 1));
      const result = await input.insert({ ...original, sku });
      if (!result.error) {
        inserted.push({ ...original, sku });
        break;
      }
      lastError = result.error;
      if (!isUniqueViolation(result.error)) throw result.error;
      if (attempt === attemptLimit - 1) throw lastError;
    }
  }
  return inserted;
}

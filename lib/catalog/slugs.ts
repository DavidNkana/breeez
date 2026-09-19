/** Convert a product name or user-entered slug into the URL-safe form we store. */
export function normalizeProductSlug(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Return the deterministic candidates used after a slug uniqueness conflict.
 * Attempt zero is deliberately the requested slug; later attempts never
 * replace an existing product and are safe to retry after a concurrent insert.
 */
export function productSlugCandidate(slug: string, attempt: number): string {
  if (attempt <= 0) return slug;
  return `${slug}-${attempt + 1}`;
}

export function isProductSlugConflict(error: { code?: string; message?: string } | null | undefined): boolean {
  return error?.code === '23505' && /products_slug_key|slug/i.test(error.message ?? '');
}

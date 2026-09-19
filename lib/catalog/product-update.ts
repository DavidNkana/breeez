import { isProductSlugConflict, normalizeProductSlug, productSlugCandidate } from './slugs';

export type ProductUpdateError = { code?: string; message?: string };

type Result = { error: ProductUpdateError | null };

/**
 * Update product scalars and children as one logical operation.
 *
 * The database writes are still separate requests, so a child failure must
 * restore the scalar row. The restore callback is expected to guard the
 * update with the values written by this operation, avoiding overwriting a
 * concurrent edit.
 */
export async function updateProductWithChildren(input: {
  next: Record<string, unknown>;
  previous: Record<string, unknown>;
  updateProduct: (values: Record<string, unknown>) => Promise<Result>;
  restoreProduct: (
    expected: Record<string, unknown>,
    previous: Record<string, unknown>,
  ) => Promise<Result>;
  replaceChildren: () => Promise<void>;
}): Promise<void> {
  const updated = await input.updateProduct(input.next);
  if (updated.error) throw updated.error;

  try {
    await input.replaceChildren();
  } catch (caught) {
    const childError = asProductUpdateError(caught, 'Could not save variants or images');
    let restoreError: ProductUpdateError | null = null;

    try {
      restoreError = (await input.restoreProduct(input.next, input.previous)).error;
    } catch (caughtRestore) {
      restoreError = asProductUpdateError(caughtRestore, 'Could not restore product fields');
    }

    if (restoreError) {
      throw {
        ...childError,
        message: `${childError.message}; scalar fields were not restored: ${restoreError.message}`,
      };
    }
    throw childError;
  }
}

/**
 * Update a product using the same bounded, unique-index-led slug retry as
 * creation. Children are replaced only after one scalar update succeeds, so a
 * slug conflict never causes duplicate child writes.
 */
export async function updateProductWithSlugRetry(input: {
  requestedSlug: string;
  currentSlug: string;
  maxAttempts?: number;
  next: Record<string, unknown>;
  previous: Record<string, unknown>;
  updateProduct: (values: Record<string, unknown>) => Promise<Result>;
  restoreProduct: (expected: Record<string, unknown>, previous: Record<string, unknown>) => Promise<Result>;
  replaceChildren: () => Promise<void>;
}): Promise<void> {
  const normalizedSlug = normalizeProductSlug(input.requestedSlug);
  if (!normalizedSlug) throw { message: 'A valid product slug is required' } satisfies ProductUpdateError;

  const maxAttempts = input.maxAttempts ?? 10;
  let error: ProductUpdateError | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const slug = productSlugCandidate(normalizedSlug, attempt);
    const next = { ...input.next, slug };
    // The current product may keep its own slug; the unique index accepts it.
    const updated = await updateProductWithChildren({
      next,
      previous: input.previous,
      updateProduct: input.updateProduct,
      restoreProduct: input.restoreProduct,
      replaceChildren: input.replaceChildren,
    }).then(() => ({ error: null as ProductUpdateError | null }), (caught) => ({
      error: asProductUpdateError(caught, 'Could not update product'),
    }));

    if (!updated.error) return;
    error = updated.error;
    if (!isProductSlugConflict(updated.error) || slug === input.currentSlug) throw updated.error;
  }
  throw error ?? { message: 'Could not update product' };
}

function asProductUpdateError(value: unknown, fallback: string): ProductUpdateError {
  if (value && typeof value === 'object') {
    const error = value as { code?: unknown; message?: unknown };
    return {
      code: typeof error.code === 'string' ? error.code : undefined,
      message: typeof error.message === 'string' ? error.message : fallback,
    };
  }
  return { message: fallback };
}

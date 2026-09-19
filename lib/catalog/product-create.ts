import { isProductSlugConflict, normalizeProductSlug, productSlugCandidate } from './slugs';

export type ProductInsertError = { code?: string; message?: string };

export async function createProductWithSlugRetry<T extends { id: string }>(input: {
  requestedSlug: string;
  maxAttempts?: number;
  insertProduct: (slug: string) => Promise<{ data: T | null; error: ProductInsertError | null }>;
  onCreated: (product: T) => Promise<void>;
  cleanupCreated?: (product: T) => Promise<void>;
}): Promise<{ product: T | null; error: ProductInsertError | null }> {
  const requestedSlug = normalizeProductSlug(input.requestedSlug);
  const maxAttempts = input.maxAttempts ?? 10;
  let error: ProductInsertError | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const result = await input.insertProduct(productSlugCandidate(requestedSlug, attempt));
    if (!result.error && result.data) {
      try {
        await input.onCreated(result.data);
        return { product: result.data, error: null };
      } catch (caught) {
        const error = toProductInsertError(caught, 'Failed to create product children');
        if (input.cleanupCreated) {
          try {
            await input.cleanupCreated(result.data);
          } catch (cleanupError) {
            return {
              product: null,
              error: {
                ...error,
                message: `${error.message}; cleanup also failed: ${toProductInsertError(cleanupError, 'unknown cleanup error').message}`,
              },
            };
          }
        }
        return { product: null, error };
      }
    }
    error = result.error;
    if (!isProductSlugConflict(result.error)) break;
  }

  return { product: null, error };
}

function toProductInsertError(value: unknown, fallback: string): ProductInsertError {
  if (value && typeof value === 'object') {
    const error = value as { code?: unknown; message?: unknown };
    return {
      code: typeof error.code === 'string' ? error.code : undefined,
      message: typeof error.message === 'string' ? error.message : fallback,
    };
  }
  return { message: fallback };
}

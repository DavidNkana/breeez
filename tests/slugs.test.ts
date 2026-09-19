import assert from 'node:assert/strict';
import test from 'node:test';
import { isProductSlugConflict, normalizeProductSlug, productSlugCandidate } from '../lib/catalog/slugs';
import { createProductWithSlugRetry } from '../lib/catalog/product-create';
import { updateProductWithSlugRetry } from '../lib/catalog/product-update';

test('normalizes generated and user-entered product slugs', () => {
  assert.equal(normalizeProductSlug('  Summer Towel!! '), 'summer-towel');
  assert.equal(normalizeProductSlug('already-valid-2'), 'already-valid-2');
});

test('uses deterministic suffixes for slug conflicts', () => {
  assert.deepEqual([0, 1, 2].map((attempt) => productSlugCandidate('summer-towel', attempt)), [
    'summer-towel', 'summer-towel-2', 'summer-towel-3'
  ]);
});

test('only retries the products slug unique constraint', () => {
  assert.equal(isProductSlugConflict({ code: '23505', message: 'duplicate key products_slug_key' }), true);
  assert.equal(isProductSlugConflict({ code: '23505', message: 'duplicate key product_variants_sku_key' }), false);
  assert.equal(isProductSlugConflict({ code: '42501', message: 'not authorized' }), false);
});

test('product creation retries a bounded conflict sequence and preserves a manual slug', async () => {
  const attemptedSlugs: string[] = [];
  const sideEffects: string[] = [];
  const result = await createProductWithSlugRetry({
    requestedSlug: 'my-manual-slug',
    insertProduct: async (slug) => {
      attemptedSlugs.push(slug);
      if (attemptedSlugs.length < 3) {
        return { data: null, error: { code: '23505', message: 'products_slug_key' } };
      }
      return { data: { id: 'product-1' }, error: null };
    },
    onCreated: async () => {
      sideEffects.push('variants', 'images');
    },
  });

  assert.deepEqual(attemptedSlugs, ['my-manual-slug', 'my-manual-slug-2', 'my-manual-slug-3']);
  assert.deepEqual(sideEffects, ['variants', 'images']);
  assert.equal(result.product?.id, 'product-1');
});

test('product creation stops after ten conflicts and never runs side effects', async () => {
  const attemptedSlugs: string[] = [];
  let sideEffectCalls = 0;
  const result = await createProductWithSlugRetry({
    requestedSlug: 'occupied',
    insertProduct: async (slug) => {
      attemptedSlugs.push(slug);
      return { data: null, error: { code: '23505', message: 'duplicate products_slug_key' } };
    },
    onCreated: async () => {
      sideEffectCalls += 1;
    },
  });

  assert.equal(attemptedSlugs.length, 10);
  assert.equal(attemptedSlugs[0], 'occupied');
  assert.equal(attemptedSlugs[9], 'occupied-10');
  assert.equal(sideEffectCalls, 0);
  assert.equal(result.product, null);
  assert.equal(result.error?.code, '23505');
});

test('product editing normalizes a manually entered slug and lets the product retain it', async () => {
  const attemptedSlugs: string[] = [];
  await updateProductWithSlugRetry({
    requestedSlug: '  Summer Towel!! ',
    currentSlug: 'summer-towel',
    next: { name: 'Summer Towel' },
    previous: { name: 'Old name' },
    updateProduct: async (values) => {
      attemptedSlugs.push(String(values.slug));
      return { error: null };
    },
    restoreProduct: async () => ({ error: null }),
    replaceChildren: async () => undefined,
  });
  assert.deepEqual(attemptedSlugs, ['summer-towel']);
});

test('product editing retries a conflicting slug with deterministic suffixes', async () => {
  const attemptedSlugs: string[] = [];
  await updateProductWithSlugRetry({
    requestedSlug: 'Summer Towel',
    currentSlug: 'old-slug',
    next: { name: 'Summer Towel' },
    previous: { name: 'Old name', slug: 'old-slug' },
    updateProduct: async (values) => {
      const slug = String(values.slug);
      attemptedSlugs.push(slug);
      return attemptedSlugs.length === 1
        ? { error: { code: '23505', message: 'duplicate key products_slug_key' } }
        : { error: null };
    },
    restoreProduct: async () => ({ error: null }),
    replaceChildren: async () => undefined,
  });
  assert.deepEqual(attemptedSlugs, ['summer-towel', 'summer-towel-2']);
});

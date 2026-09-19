import assert from 'node:assert/strict';
import test from 'node:test';
import { createProductWithSlugRetry } from '../lib/catalog/product-create';
import { replaceProductChildren } from '../lib/catalog/product-children';
import { updateProductWithChildren } from '../lib/catalog/product-update';

test('product creation propagates a variant failure, cleans up, and does not report success', async () => {
  const calls: string[] = [];
  const result = await createProductWithSlugRetry({
    requestedSlug: 'new-product',
    insertProduct: async () => ({ data: { id: 'product-1' }, error: null }),
    onCreated: async () => {
      calls.push('variants');
      throw { code: '23505', message: 'duplicate SKU' };
    },
    cleanupCreated: async (product) => { calls.push(`cleanup:${product.id}`); },
  });

  assert.equal(result.product, null);
  assert.equal(result.error?.message, 'duplicate SKU');
  assert.deepEqual(calls, ['variants', 'cleanup:product-1']);
});

test('product creation cleans up when image insertion fails', async () => {
  let cleanupCalls = 0;
  const result = await createProductWithSlugRetry({
    requestedSlug: 'new-product',
    insertProduct: async () => ({ data: { id: 'product-1' }, error: null }),
    onCreated: async () => { throw new Error('image insert failed'); },
    cleanupCreated: async () => { cleanupCalls += 1; },
  });

  assert.equal(result.product, null);
  assert.equal(result.error?.message, 'image insert failed');
  assert.equal(cleanupCalls, 1);
});

test('child replacement restores images when a child insert fails', async () => {
  const calls: string[] = [];
  await assert.rejects(
    replaceProductChildren({
      images: [{ url: 'new.jpg' }],
      previousImages: [{ url: 'old.jpg' }],
      variants: [],
      previousVariants: [],
      deleteImages: async () => { calls.push('delete-images'); return { error: null }; },
      insertImages: async (rows) => {
        calls.push(`insert-images:${rows.map((row) => row.url).join(',')}`);
        return rows[0]?.url === 'new.jpg' ? { error: { message: 'image insert failed' } } : { error: null };
      },
      deleteVariants: async () => ({ error: null }),
      insertVariants: async () => ({ error: null }),
    }),
    (error: unknown) => error instanceof Object && (error as { message?: string }).message === 'image insert failed',
  );
  assert.deepEqual(calls, ['delete-images', 'insert-images:new.jpg', 'delete-images', 'insert-images:old.jpg']);
});

test('child replacement preserves the successful flow', async () => {
  const calls: string[] = [];
  await replaceProductChildren({
    images: [{ url: 'new.jpg' }],
    previousImages: [{ url: 'old.jpg' }],
    variants: [{ sku: 'NEW' }],
    previousVariants: [{ sku: 'OLD' }],
    deleteImages: async () => { calls.push('delete-images'); return { error: null }; },
    insertImages: async () => { calls.push('insert-images'); return { error: null }; },
    deleteVariants: async () => { calls.push('delete-variants'); return { error: null }; },
    insertVariants: async () => { calls.push('insert-variants'); return { error: null }; },
  });
  assert.deepEqual(calls, ['delete-images', 'insert-images', 'delete-variants', 'insert-variants']);
});

test('product edit restores every scalar when child synchronization fails', async () => {
  const previous = {
    slug: 'old-slug', name: 'Old name', description: 'Old description', category_id: 'old-category',
    base_price_cents: 1000, compare_at_cents: 1500, tags: ['old'], is_active: true, is_featured: false,
  };
  const next = {
    slug: 'new-slug', name: 'New name', description: 'New description', category_id: 'new-category',
    base_price_cents: 1200, compare_at_cents: 1800, tags: ['new'], is_active: false, is_featured: true,
  };
  let row = { ...previous };
  let restoreCalls = 0;

  await assert.rejects(
    updateProductWithChildren({
      next,
      previous,
      updateProduct: async (values) => { row = { ...row, ...values }; return { error: null }; },
      restoreProduct: async (expected, values) => {
        restoreCalls += 1;
        if (JSON.stringify(row) !== JSON.stringify(expected)) return { error: { message: 'concurrent edit' } };
        row = { ...row, ...values };
        return { error: null };
      },
      replaceChildren: async () => { throw new Error('variant insert failed'); },
    }),
    (error: unknown) => error instanceof Object && (error as { message?: string }).message === 'variant insert failed',
  );

  assert.deepEqual(row, previous);
  assert.equal(restoreCalls, 1);
});

test('successful product edit keeps the new scalars and does not restore them', async () => {
  const previous = { name: 'Old name', base_price_cents: 1000 };
  const next = { name: 'New name', base_price_cents: 1200 };
  let row = { ...previous };
  let restoreCalls = 0;

  await updateProductWithChildren({
    next,
    previous,
    updateProduct: async (values) => { row = { ...row, ...values }; return { error: null }; },
    restoreProduct: async () => { restoreCalls += 1; return { error: null }; },
    replaceChildren: async () => undefined,
  });

  assert.deepEqual(row, next);
  assert.equal(restoreCalls, 0);
});

test('product edit surfaces child failure and does not restore over a concurrent scalar edit', async () => {
  const previous = { name: 'Old name' };
  const next = { name: 'New name' };
  let row = { ...previous };

  await assert.rejects(
    updateProductWithChildren({
      next,
      previous,
      updateProduct: async (values) => { row = { ...row, ...values }; return { error: null }; },
      restoreProduct: async () => ({ error: { message: 'concurrent edit detected' } }),
      replaceChildren: async () => {
        row = { name: 'Someone else\'s edit' };
        throw new Error('image insert failed');
      },
    }),
    (error: unknown) => error instanceof Object &&
      (error as { message?: string }).message === 'image insert failed; scalar fields were not restored: concurrent edit detected',
  );

  assert.deepEqual(row, { name: "Someone else's edit" });
});

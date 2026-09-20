import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MAX_VARIANT_SKU_LENGTH,
  assignVariantSkus,
  duplicateVariantSku,
  insertVariantsWithSkuRetry,
  sanitizeVariantSku,
} from '../lib/catalog/variant-skus';

test('makes repeated source SKUs unique across every option dimension', () => {
  assert.deepEqual(assignVariantSkus([
    { sku: 'IQ7997', options: { Size: 'S', Color: 'Black' } },
    { sku: 'IQ7997', options: { Size: 'S', Color: 'White' } },
    { sku: 'IQ7997', options: { Size: 'M', Color: 'Black' } },
  ]), ['IQ7997-S-BLACK', 'IQ7997-S-WHITE', 'IQ7997-M-BLACK']);
});

test('deduplicates source SKUs case-insensitively and never returns blank', () => {
  const skus = assignVariantSkus([
    { sku: ' same sku ', options: {} },
    { sku: 'SAME-SKU', options: {} },
    { sku: '!!!', options: {} },
  ]);
  assert.equal(new Set(skus.map((sku) => sku.toLowerCase())).size, skus.length);
  assert.equal(skus.every(Boolean), true);
});

test('detects manual duplicate and blank SKUs before save', () => {
  assert.equal(duplicateVariantSku(['ABC', 'abc'])?.duplicateOf, 1);
  assert.match(duplicateVariantSku(['ABC', ''])?.message ?? '', /needs a SKU/);
});

test('retries only the colliding variant SKU, not the parent operation', async () => {
  const attempts: string[] = [];
  const inserted = await insertVariantsWithSkuRetry({
    rows: [{ sku: 'BASE-S', name: 'S' }, { sku: 'BASE-M', name: 'M' }],
    insert: async (row) => {
      attempts.push(String(row.sku));
      return row.sku === 'BASE-S' ? { error: { code: '23505', message: 'duplicate key' } } : { error: null };
    },
  });
  assert.deepEqual(attempts, ['BASE-S', 'BASE-S-2', 'BASE-M']);
  assert.deepEqual(inserted.map((row) => row.sku), ['BASE-S-2', 'BASE-M']);
});

test('keeps duplicate long source SKUs bounded and distinct', () => {
  const source = 'source-' + 'x'.repeat(120);
  const skus = assignVariantSkus([
    { sku: source, options: { Size: 'Small' } },
    { sku: source, options: { Size: 'Large' } },
    { sku: source, options: { Size: 'Medium' } },
  ]);

  assert.equal(new Set(skus.map((sku) => sku.toLowerCase())).size, skus.length);
  assert.equal(skus.every((sku) => sku.length <= MAX_VARIANT_SKU_LENGTH && sku.trim()), true);
  assert.match(skus[0], /-/);
});

test('keeps long option combinations unique without exceeding the SKU limit', () => {
  const skus = assignVariantSkus([
    { sku: 'OPTIONAL', options: { Size: 'x'.repeat(200) + '-A' } },
    { sku: 'OPTIONAL', options: { Size: 'x'.repeat(200) + '-B' } },
  ]);

  assert.equal(new Set(skus).size, 2);
  assert.equal(skus.every((sku) => sku.length <= MAX_VARIANT_SKU_LENGTH && sku.trim()), true);
});

test('retries long colliding values with bounded, changing SKUs', async () => {
  const attempts: string[] = [];
  const source = 'long-' + 'y'.repeat(120);
  const inserted = await insertVariantsWithSkuRetry({
    rows: [{ sku: source, name: 'Long' }],
    insert: async (row) => {
      attempts.push(String(row.sku));
      return attempts.length < 4 ? { error: { code: '23505', message: 'duplicate key' } } : { error: null };
    },
  });

  assert.equal(new Set(attempts).size, attempts.length);
  assert.equal(attempts.every((sku) => sku.length <= MAX_VARIANT_SKU_LENGTH && sku.trim()), true);
  assert.equal(inserted[0].sku, attempts[3]);
});

test('sanitizes fallback values and keeps their length bounded', () => {
  const fallback = sanitizeVariantSku('!!!', '  ' + 'fallback-'.repeat(20));
  assert.equal(fallback.length <= MAX_VARIANT_SKU_LENGTH, true);
  assert.equal(fallback.trim(), fallback);
  assert.notEqual(fallback, '');
  assert.equal(sanitizeVariantSku(null, '!!!'), 'VARIANT');
});

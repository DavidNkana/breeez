import assert from 'node:assert/strict';
import test from 'node:test';
import { mapImportedVariantPrices, normalizeVariantCompareAtCents } from '../lib/catalog/imported-prices';
import { importedStock, stockQuantity } from '../lib/catalog/importer';

test('maps imported variant selling and compare-at prices to cents', () => {
  assert.deepEqual(mapImportedVariantPrices(2.99, 3.99), {
    price_cents: 299,
    compare_at_cents: 399,
  });
});

test('does not persist compare-at when it is not greater than that variant price', () => {
  assert.equal(mapImportedVariantPrices(2.99, 2.99).compare_at_cents, null);
  assert.equal(mapImportedVariantPrices(3.99, 3.49).compare_at_cents, null);
  assert.equal(mapImportedVariantPrices(3.99, Number.NaN).compare_at_cents, null);
  assert.equal(mapImportedVariantPrices(3.99, undefined).compare_at_cents, null);
});

test('does not persist a rounded compare-at value equal to selling cents', () => {
  assert.equal(mapImportedVariantPrices(1, 1.001).compare_at_cents, null);
});

test('normalizes variant save payload compare-at cents without changing valid values', () => {
  assert.equal(normalizeVariantCompareAtCents(299, 399), 399);
  assert.equal(normalizeVariantCompareAtCents(299, 299), null);
  assert.equal(normalizeVariantCompareAtCents(299, 199), null);
  assert.equal(normalizeVariantCompareAtCents(299, Number.NaN), null);
  assert.equal(normalizeVariantCompareAtCents(299, Number.POSITIVE_INFINITY), null);
  assert.equal(normalizeVariantCompareAtCents(299, undefined), null);
  assert.equal(normalizeVariantCompareAtCents(299, -1), null);
  assert.equal(normalizeVariantCompareAtCents(Number.NaN, 399), null);
});

test('coerces imported stock into the database field and applies the import floor', () => {
  assert.equal(stockQuantity('12'), 12);
  assert.equal(stockQuantity('12.9'), 12);
  assert.equal(stockQuantity('not a quantity'), 0);
  assert.equal(importedStock('0'), 10);
  assert.equal(importedStock('12'), 12);
});

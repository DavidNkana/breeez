import assert from 'node:assert/strict';
import test from 'node:test';
import { canAddVariantToCart, getAvailableStock, getPurchasableVariantForOptions, getValidOptionValues, getVariantDisplayName, getVariantForOptions, getVariantOptionGroups, optionLabel, reconcileSelectedOptions, type VariantOptionSource } from '../lib/catalog/variant-options';

test('groups saved variant options with human-readable labels', () => {
  const variants: VariantOptionSource[] = [
    { options: { Size: 'M', Colour: 'Black' }, sku: 'RUN-M-B' },
    { options: { size: 'L', Color: 'White' }, sku: 'RUN-L-W' },
  ];

  assert.deepEqual(getVariantOptionGroups(variants), [
    { key: 'Size', values: ['M', 'L'] },
    { key: 'Color', values: ['Black', 'White'] },
  ]);
  assert.equal(getVariantDisplayName(variants[0]), 'M / Black');
  assert.equal(optionLabel('material_type'), 'Material Type');
});

test('does not use SKU as the primary variant label', () => {
  assert.equal(getVariantDisplayName({ name: 'SKU-123', sku: 'SKU-123', options: {} }), 'Standard');
  assert.equal(getVariantDisplayName({ name: 'Default', sku: 'SKU-123', options: {} }), 'Standard');
});

test('recovers stale selections while preserving the closest valid options', () => {
  const variants = [
    { id: 'small-red', options: { Size: 'S', Color: 'Red' }, price_cents: 1000, stock: 2 },
    { id: 'large-blue', options: { Size: 'L', Color: 'Blue' }, price_cents: 1200, stock: 4 },
  ];
  const keys = ['Size', 'Color'];

  assert.deepEqual(reconcileSelectedOptions(variants, keys, { Size: 'L', Color: 'Missing' }), {
    Size: 'L', Color: 'Blue'
  });
  assert.equal(getVariantForOptions(variants, keys, { Size: 'L', Color: 'Blue' })?.id, 'large-blue');
  assert.equal(getVariantForOptions(variants, keys, { Size: 'L', Color: 'Blue' })?.price_cents, 1200);
  assert.equal(getVariantForOptions(variants, keys, { Size: 'L', Color: 'Blue' })?.stock, 4);
});

test('normalizes unavailable stock for gating and display', () => {
  assert.equal(getAvailableStock(0), 0);
  assert.equal(getAvailableStock(-3), 0);
  assert.equal(getAvailableStock(undefined), 0);
  assert.equal(getAvailableStock(5), 5);
});

test('accepts numeric stock returned as a string at the PDP boundary', () => {
  const variant = { id: 'imported', options: { Size: 'M' }, stock: '12', is_active: true };
  assert.equal(getAvailableStock(variant.stock), 12);
  assert.equal(getPurchasableVariantForOptions([variant], ['Size'], { Size: 'M' })?.id, 'imported');
  assert.equal(canAddVariantToCart(variant, 12), true);
});

test('disables stockless option values without hiding valid combinations', () => {
  const variants: VariantOptionSource[] = [
    { options: { Size: 'S', Color: 'Red' }, stock: 0 },
    { options: { Size: 'S', Color: 'Blue' }, stock: 5 },
    { options: { Size: 'L', Color: 'Red' }, stock: 3 },
    { options: { Size: 'L', Color: 'Blue' }, stock: -2 },
  ];

  assert.deepEqual(getValidOptionValues(variants, ['Size', 'Color'], { Color: 'Red' }, 'Size'), ['L']);
  assert.deepEqual(getValidOptionValues(variants, ['Size', 'Color'], { Size: 'S' }, 'Color'), ['Blue']);
});

test('reconciles selections to an in-stock variant and passes its cart values', () => {
  const variants = [
    { id: 'sold-out', options: { Size: 'S' }, price_cents: 900, stock: 0 },
    { id: 'available', options: { Size: 'L' }, price_cents: 1200, stock: 4 },
  ];
  const selectedOptions = reconcileSelectedOptions(variants, ['Size'], { Size: 'S' });
  const selected = getPurchasableVariantForOptions(variants, ['Size'], selectedOptions);

  assert.deepEqual(selectedOptions, { Size: 'L' });
  assert.equal(selected?.id, 'available');
  assert.equal(selected?.price_cents, 1200);
  assert.equal(selected?.stock, 4);
  assert.equal(canAddVariantToCart(selected, 4), true);
  assert.equal(canAddVariantToCart({ ...variants[0], stock: -1 }, 1), false);
});

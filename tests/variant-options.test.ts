import assert from 'node:assert/strict';
import test from 'node:test';
import { canAddVariantToCart, getAvailableStock, getPurchasableVariantForOptions, getValidOptionValues, getVariantDisplayName, getVariantForOptions, getVariantOptionGroups, getVariantOptionRenderModel, optionLabel, reconcileSelectedOptions, type VariantOptionSource } from '../lib/catalog/variant-options';

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

test('marks source-unavailable values disabled even when their imported stock is floored', () => {
  const variants: VariantOptionSource[] = [
    { options: { Size: 'XS' }, stock: 10, is_active: true },
    { options: { Size: 'S' }, stock: 10, is_active: true },
    { options: { Size: '2XL' }, stock: 10, is_active: false },
  ];
  assert.deepEqual(getVariantOptionGroups(variants)[0].values, ['XS', 'S', '2XL']);
  assert.deepEqual(getValidOptionValues(variants, ['Size'], {}, 'Size'), ['XS', 'S']);
});

test('render model keeps inactive options visible, disabled, and crossed out', () => {
  const model = getVariantOptionRenderModel([
    { options: { Size: 'S' }, stock: 4, is_active: true },
    { options: { Size: 'L' }, stock: 4, is_active: false },
  ], {});

  assert.deepEqual(model[0].options, [
    { value: 'S', isSelected: false, disabled: false, crossedOut: false },
    { value: 'L', isSelected: false, disabled: true, crossedOut: true },
  ]);
});

test('keeps every size visible while crossing out sold-out and source-inactive variants', () => {
  const variants: VariantOptionSource[] = [
    { id: 's', options: { Size: 'S' }, stock: 10, is_active: true },
    { id: 'm', options: { Size: 'M' }, stock: 0, is_active: true },
    { id: 'l', options: { Size: 'L' }, stock: 10, is_active: false },
    { id: 'xl', options: { Size: 'XL' }, stock: 20, is_active: true },
  ];
  const model = getVariantOptionRenderModel(variants, { Size: 'S' });

  assert.deepEqual(model[0].options, [
    { value: 'S', isSelected: true, disabled: false, crossedOut: false },
    { value: 'M', isSelected: false, disabled: true, crossedOut: true },
    { value: 'L', isSelected: false, disabled: true, crossedOut: true },
    { value: 'XL', isSelected: false, disabled: false, crossedOut: false },
  ]);
  assert.equal(getVariantForOptions(variants, ['Size'], { Size: 'M' })?.id, 'm');
  assert.equal(canAddVariantToCart(getVariantForOptions(variants, ['Size'], { Size: 'M' }), 1), false);
  assert.equal(canAddVariantToCart(getVariantForOptions(variants, ['Size'], { Size: 'XL' }), 1), true);
});

test('crosses every option and reports no purchasable selection when all stock is zero', () => {
  const variants: VariantOptionSource[] = [
    { options: { Size: 'S' }, stock: 0 },
    { options: { Size: 'M' }, stock: 0 },
  ];
  const model = getVariantOptionRenderModel(variants, {});

  assert.deepEqual(model[0].options.map(({ value, disabled, crossedOut }) => ({ value, disabled, crossedOut })), [
    { value: 'S', disabled: true, crossedOut: true },
    { value: 'M', disabled: true, crossedOut: true },
  ]);
  assert.deepEqual(reconcileSelectedOptions(variants, ['Size'], {}), {});
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

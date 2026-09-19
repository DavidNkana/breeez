import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  executeProductDelete,
  planProductDelete,
  PRODUCT_DELETE_OPERATIONS,
  type ProductDeleteState,
} from '../lib/catalog/product-delete';

test('product deletion RPC has a restricted authenticated surface and safe definition', async () => {
  const sql = await readFile(resolve('supabase/migrations/019_atomic_product_delete.sql'), 'utf8');
  assert.match(sql, /create or replace function public\.delete_product\(p_product_id uuid\)/);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = public/);
  assert.match(sql, /revoke execute on function public\.delete_product\(uuid\) from public;/);
  assert.match(sql, /grant execute on function public\.delete_product\(uuid\) to authenticated;/);
  assert.match(sql, /if not public\.is_admin\(auth\.uid\(\)\)/);
});

test('product deletion removes only affected cart rows before restricted variants', async () => {
  const sql = await readFile(resolve('supabase/migrations/019_atomic_product_delete.sql'), 'utf8');
  assert.match(sql, /delete from public\.cart_items[\s\S]*where variant_id in/);
  assert.match(sql, /select id from public\.product_variants where product_id = p_product_id/);
  assert.ok(
    sql.indexOf('delete from public.cart_items') < sql.indexOf('delete from public.product_variants'),
    'cart references must be cleared before the RESTRICTed variants are deleted',
  );
  assert.match(sql, /delete from public\.product_images[\s\S]*delete from public\.product_variants[\s\S]*delete from public\.products/);
});

test('delete planning enforces admin authorization and scopes cart cleanup to product variants', () => {
  assert.throws(() => planProductDelete({
    actorIsAdmin: false,
    productId: 'product-a',
    variantIds: ['variant-a'],
    cartItems: [{ id: 'cart-a', variantId: 'variant-a' }],
  }), /not authorized/);

  const plan = planProductDelete({
    actorIsAdmin: true,
    productId: 'product-a',
    variantIds: ['variant-a', 'variant-b'],
    cartItems: [
      { id: 'cart-a', variantId: 'variant-a' },
      { id: 'cart-unrelated', variantId: 'variant-other-product' },
    ],
  });
  assert.deepEqual(plan.affectedCartItemIds, ['cart-a']);
  assert.deepEqual(plan.operations, PRODUCT_DELETE_OPERATIONS);
  assert.equal(plan.atomic, true);
});

test('delete contract preserves rollback/error semantics and dependency order', async () => {
  const sql = await readFile(resolve('supabase/migrations/019_atomic_product_delete.sql'), 'utf8');
  assert.match(sql, /language plpgsql/);
  assert.doesNotMatch(sql, /exception when others/);
  assert.deepEqual(PRODUCT_DELETE_OPERATIONS, [
    'delete_affected_cart_items',
    'delete_product_images',
    'delete_product_variants',
    'delete_product',
  ]);
  assert.match(sql, /delete from public\.cart_items[\s\S]*delete from public\.product_images[\s\S]*delete from public\.product_variants[\s\S]*delete from public\.products/);
});

const deleteState: ProductDeleteState = {
  products: ['product-a', 'product-b'],
  variantRows: [
    { id: 'variant-a', productId: 'product-a' },
    { id: 'variant-b', productId: 'product-b' },
  ],
  imageRows: [
    { id: 'image-a', productId: 'product-a' },
    { id: 'image-b', productId: 'product-b' },
  ],
  cartItems: [
    { id: 'cart-a', variantId: 'variant-a' },
    { id: 'cart-unrelated', variantId: 'variant-b' },
  ],
};

test('executable delete model denies anonymous and non-admin callers', () => {
  for (const actor of ['anonymous', 'authenticated'] as const) {
    assert.throws(() => executeProductDelete(deleteState, { actor, productId: 'product-a' }), /not authorized/);
  }
});

test('executable delete model gives admins scoped FK-safe cleanup', () => {
  const result = executeProductDelete(deleteState, { actor: 'admin', productId: 'product-a' });
  assert.deepEqual(result.products, ['product-b']);
  assert.deepEqual(result.variantRows, [{ id: 'variant-b', productId: 'product-b' }]);
  assert.deepEqual(result.imageRows, [{ id: 'image-b', productId: 'product-b' }]);
  assert.deepEqual(result.cartItems, [{ id: 'cart-unrelated', variantId: 'variant-b' }]);
  assert.deepEqual(deleteState.products, ['product-a', 'product-b'], 'source state remains transactionally isolated');
});

test('executable delete model rolls back every prior operation on failure', () => {
  assert.throws(() => executeProductDelete(deleteState, {
    actor: 'admin',
    productId: 'product-a',
    failAt: (operation) => operation === 'delete_product_variants',
  }), /delete failed at delete_product_variants/);
  assert.deepEqual(deleteState, {
    products: ['product-a', 'product-b'],
    variantRows: [
      { id: 'variant-a', productId: 'product-a' },
      { id: 'variant-b', productId: 'product-b' },
    ],
    imageRows: [
      { id: 'image-a', productId: 'product-a' },
      { id: 'image-b', productId: 'product-b' },
    ],
    cartItems: [
      { id: 'cart-a', variantId: 'variant-a' },
      { id: 'cart-unrelated', variantId: 'variant-b' },
    ],
  });
});

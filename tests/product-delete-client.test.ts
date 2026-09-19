import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../lib/supabase/types';
import { deleteProduct } from '../lib/catalog/product-delete-client';

function clientForRpc(result: { error: { code?: string; message?: string } | null }, calls: unknown[]) {
  return {
    rpc: (name: string, args: unknown) => {
      calls.push([name, args]);
      return Promise.resolve(result);
    },
  } as unknown as SupabaseClient<Database>;
}

test('product delete caller invokes the installed RPC with its explicit argument', async () => {
  const calls: unknown[] = [];
  const result = await deleteProduct(clientForRpc({ error: null }, calls), 'product-123');

  assert.equal(result, null);
  assert.deepEqual(calls, [['delete_product', { p_product_id: 'product-123' }]]);
});

test('product delete caller maps a missing RPC from PostgREST to an actionable migration error', async () => {
  const calls: unknown[] = [];
  const result = await deleteProduct(clientForRpc({ error: { code: 'PGRST202', message: 'function not found' } }, calls), 'product-123');

  assert.deepEqual(calls, [['delete_product', { p_product_id: 'product-123' }]]);
  assert.equal(result?.message, 'Product deletion is not installed on the database. Apply supabase/migrations/019_atomic_product_delete.sql (or run supabase db push), then retry.');
});

test('product delete caller preserves non-schema RPC errors', async () => {
  const error = { code: '42501', message: 'not authorized' };
  const result = await deleteProduct(clientForRpc({ error }, []), 'product-123');

  assert.equal(result, error);
});

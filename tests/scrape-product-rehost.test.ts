import assert from 'node:assert/strict';
import test, { mock } from 'node:test';

mock.module('node:dns/promises', {
  namedExports: { lookup: async () => [{ address: '93.184.216.34', family: 4 }] },
});
mock.module('@/lib/auth/session', { namedExports: { getCurrentUser: async () => null } });
mock.module('@/lib/supabase/admin', {
  namedExports: { createAdminClient: () => { throw new Error('Supabase is not configured'); } },
});

test('keeps validated original image URLs when Supabase rehosting is unavailable', async () => {
  const { rehostImages } = await import('../app/api/admin/scrape-product/route');
  const imageUrl = 'https://images.example/product.jpg';
  const result = await rehostImages([imageUrl], 'https://shop.example/product');

  assert.deepEqual(result.images, [imageUrl]);
  assert.deepEqual(result.warnings, ['Images kept at their original URLs (image storage is not configured)']);
});

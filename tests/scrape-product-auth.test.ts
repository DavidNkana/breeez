import assert from 'node:assert/strict';
import test, { mock } from 'node:test';

const getCurrentUser = mock.fn(async () => null);
const maybeSingle = mock.fn(async () => ({ data: null, error: null }));
const adminClient = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }) };

mock.module('@/lib/auth/session', { namedExports: { getCurrentUser } });
mock.module('@/lib/supabase/admin', { namedExports: { createAdminClient: () => adminClient } });

let POST: (request: Request) => Promise<Response>;

test.before(async () => {
  ({ POST } = await import('../app/api/admin/scrape-product/route'));
});

test('scrape route returns a JSON 401 for unauthenticated callers', async () => {
  getCurrentUser.mock.mockImplementation(async () => null);
  const response = await POST(new Request('http://localhost/api/admin/scrape-product', { method: 'POST' }));

  assert.equal(response.status, 401);
  assert.match(response.headers.get('content-type') ?? '', /^application\/json/);
  assert.deepEqual(await response.json(), { ok: false, error: 'You must be signed in as an administrator' });
});

test('scrape route returns a JSON 403 for signed-in non-admin callers', async () => {
  getCurrentUser.mock.mockImplementation(async () => ({ id: 'user-123' } as never));
  const response = await POST(new Request('http://localhost/api/admin/scrape-product', { method: 'POST' }));

  assert.equal(response.status, 403);
  assert.match(response.headers.get('content-type') ?? '', /^application\/json/);
  assert.deepEqual(await response.json(), { ok: false, error: 'Administrator access is required' });
});

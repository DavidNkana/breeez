import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { NextRequest } from 'next/server';

const resetPasswordForEmail = mock.fn(async (_email: string, _options: { emailRedirectTo: string }) => ({ error: null }));

mock.module('@/lib/supabase/server', {
  namedExports: {
    createClient: async () => ({ auth: { resetPasswordForEmail } }),
  },
});

let POST: (request: NextRequest) => Promise<Response>;

test.before(async () => {
  ({ POST } = await import('../app/api/auth/forgot-password/route'));
});

test.beforeEach(() => resetPasswordForEmail.mock.resetCalls());

test('uses the approved callback URL and ignores caller-controlled redirectTo', async () => {
  const response = await POST(new NextRequest('https://attacker.example/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: 'customer@example.com', redirectTo: 'https://attacker.example/steal' }),
    headers: { 'content-type': 'application/json' },
  }));

  assert.equal(response.status, 200);
  assert.deepEqual(resetPasswordForEmail.mock.calls[0]?.arguments, [
    'customer@example.com',
    { emailRedirectTo: 'https://www.evasale.co.za/auth/callback?next=%2Fauth%2Freset-password' },
  ]);
});

test('returns a clear error for a missing email', async () => {
  const response = await POST(new NextRequest('https://www.evasale.co.za/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({}),
    headers: { 'content-type': 'application/json' },
  }));

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Email required' });
  assert.equal(resetPasswordForEmail.mock.calls.length, 0);
});

test('returns a controlled error for a non-string email', async () => {
  const response = await POST(new NextRequest('http://localhost:3000/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: 123 }),
    headers: { 'content-type': 'application/json' },
  }));

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Email required' });
  assert.equal(resetPasswordForEmail.mock.calls.length, 0);
});

test('returns a controlled error for a malformed email', async () => {
  const response = await POST(new NextRequest('https://www.evasale.co.za/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: 'not-an-email' }),
    headers: { 'content-type': 'application/json' },
  }));

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Invalid email' });
  assert.equal(resetPasswordForEmail.mock.calls.length, 0);
});

test('accepts normal email addresses after trimming whitespace', async () => {
  const response = await POST(new NextRequest('https://www.evasale.co.za/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: '  customer+tag@shop.example.co.za  ' }),
    headers: { 'content-type': 'application/json' },
  }));

  assert.equal(response.status, 200);
  assert.equal(resetPasswordForEmail.mock.calls[0]?.arguments[0], 'customer+tag@shop.example.co.za');
});

test('uses the approved localhost origin for reset links during local development', async () => {
  const response = await POST(new NextRequest('http://localhost:3000/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: 'customer@example.com' }),
    headers: { 'content-type': 'application/json', 'x-client-origin': 'http://localhost:3000' },
  }));

  assert.equal(response.status, 200);
  assert.deepEqual(resetPasswordForEmail.mock.calls[0]?.arguments, [
    'customer@example.com',
    { emailRedirectTo: 'http://localhost:3000/auth/callback?next=%2Fauth%2Freset-password' },
  ]);
});

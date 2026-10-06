import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { NextRequest } from 'next/server';

const cookieStore = {
  getAll: mock.fn(() => []),
  set: mock.fn(),
};
let setAll: (cookies: { name: string; value: string; options: Record<string, unknown> }[]) => void = () => {};
const exchangeCodeForSession = mock.fn(async (_code: string): Promise<{ error: Error | null }> => {
  setAll([{ name: 'sb-session', value: 'session-value', options: { httpOnly: true } }]);
  return { error: null };
});
const verifyOtp = mock.fn(async (_input: { token_hash: string; type: 'signup' | 'email' | 'magiclink' | 'recovery' }): Promise<{ error: Error | null }> => ({ error: null }));

mock.module('@supabase/ssr', {
  namedExports: {
    createServerClient: (_url: string, _key: string, options: { cookies: { setAll: typeof setAll } }) => {
      setAll = options.cookies.setAll;
      return { auth: { exchangeCodeForSession, verifyOtp } };
    },
  },
});
mock.module('next/headers', {
  namedExports: { cookies: async () => cookieStore },
});

let GET: (request: NextRequest) => Promise<Response>;

test.before(async () => {
  ({ GET } = await import('../app/auth/callback/route'));
});

test.beforeEach(() => {
  exchangeCodeForSession.mock.resetCalls();
  verifyOtp.mock.resetCalls();
  cookieStore.getAll.mock.resetCalls();
  cookieStore.set.mock.resetCalls();
  exchangeCodeForSession.mock.mockImplementation(async () => {
    setAll([{ name: 'sb-session', value: 'session-value', options: { httpOnly: true } }]);
    return { error: null };
  });
  verifyOtp.mock.mockImplementation(async () => ({ error: null }));
});

test('exchanges a PKCE code, sets the session cookies, and safely redirects internally', async () => {
  const response = await GET(new NextRequest('https://www.evasale.co.za/auth/callback?code=pkce-code&next=/checkout?from=email'));
  const cookieAdapter = exchangeCodeForSession.mock.calls.length;

  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), 'https://www.evasale.co.za/checkout?from=email');
  assert.equal(cookieAdapter, 1);
});

test('exchanges a password reset PKCE code and redirects to the reset page', async () => {
  const response = await GET(new NextRequest('https://www.evasale.co.za/auth/callback?code=reset-pkce-code&next=%2Fauth%2Freset-password'));

  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), 'https://www.evasale.co.za/auth/reset-password');
  assert.equal(exchangeCodeForSession.mock.calls[0]?.arguments[0], 'reset-pkce-code');
});

test('ignores a hostile request origin when redirecting after callback', async () => {
  const response = await GET(new NextRequest('https://attacker.example/auth/callback?code=pkce-code&next=/checkout'));

  assert.equal(response.headers.get('location'), 'https://www.evasale.co.za/checkout');
  assert.equal(cookieStore.set.mock.calls[0]?.arguments[0], 'sb-session');
});

test('verifies signup token hashes and redirects to the safe default', async () => {
  const response = await GET(new NextRequest('https://www.evasale.co.za/auth/callback?token_hash=signup-token&type=signup'));

  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), 'https://www.evasale.co.za/account');
  assert.deepEqual(verifyOtp.mock.calls[0]?.arguments[0], { token_hash: 'signup-token', type: 'signup' });
});

test('verifies email token hashes and preserves a valid internal next path', async () => {
  const response = await GET(new NextRequest('https://www.evasale.co.za/auth/callback?token_hash=email-token&type=email&next=/orders'));

  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), 'https://www.evasale.co.za/orders');
  assert.deepEqual(verifyOtp.mock.calls[0]?.arguments[0], { token_hash: 'email-token', type: 'email' });
});

test('verifies magic-link token hashes, sets session cookies, and redirects safely', async () => {
  verifyOtp.mock.mockImplementationOnce(async () => {
    setAll([{ name: 'sb-session', value: 'magic-session', options: { httpOnly: true } }]);
    return { error: null };
  });

  const response = await GET(new NextRequest('http://localhost:3000/auth/callback?token_hash=magic-token&type=magiclink&next=/account'));

  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), 'http://localhost:3000/account');
  assert.deepEqual(verifyOtp.mock.calls[0]?.arguments[0], { token_hash: 'magic-token', type: 'magiclink' });
  assert.deepEqual(cookieStore.set.mock.calls[0]?.arguments, ['sb-session', 'magic-session', { httpOnly: true }]);
});

test('verifies recovery token hashes, sets the session cookie, and redirects to reset password', async () => {
  verifyOtp.mock.mockImplementationOnce(async () => {
    setAll([{ name: 'sb-session', value: 'recovery-session', options: { httpOnly: true } }]);
    return { error: null };
  });

  const response = await GET(new NextRequest('https://www.evasale.co.za/auth/callback?token_hash=recovery-token&type=recovery&next=//attacker.example'));

  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), 'https://www.evasale.co.za/auth/reset-password');
  assert.deepEqual(verifyOtp.mock.calls[0]?.arguments[0], { token_hash: 'recovery-token', type: 'recovery' });
  assert.deepEqual(cookieStore.set.mock.calls[0]?.arguments, ['sb-session', 'recovery-session', { httpOnly: true }]);
});

test('rejects an invalid recovery token without redirecting to a caller-controlled path', async () => {
  verifyOtp.mock.mockImplementationOnce(async () => ({ error: new Error('expired recovery token') }));

  const response = await GET(new NextRequest('https://www.evasale.co.za/auth/callback?token_hash=expired&type=recovery&next=/account'));

  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), 'https://www.evasale.co.za/auth/login?error=auth_callback_failed');
});

test('rejects invalid token types without calling Supabase', async () => {
  const response = await GET(new NextRequest('https://www.evasale.co.za/auth/callback?token_hash=bad-token&type=invite'));

  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), 'https://www.evasale.co.za/auth/login?error=auth_callback_failed');
  assert.equal(verifyOtp.mock.calls.length, 0);
  assert.equal(exchangeCodeForSession.mock.calls.length, 0);
});

test('redirects safely when Supabase returns an auth error', async () => {
  exchangeCodeForSession.mock.mockImplementationOnce(async () => ({ error: new Error('invalid code') }));

  const response = await GET(new NextRequest('https://www.evasale.co.za/auth/callback?code=expired&next=//attacker.example'));

  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), 'https://www.evasale.co.za/auth/login?error=auth_callback_failed');
});

test('redirects safely when Supabase throws during callback exchange', async () => {
  exchangeCodeForSession.mock.mockImplementationOnce(async () => {
    throw new Error('network failure');
  });

  const response = await GET(new NextRequest('https://www.evasale.co.za/auth/callback?code=unreachable'));

  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), 'https://www.evasale.co.za/auth/login?error=auth_callback_failed');
});

test('applies Supabase cookie updates through the server cookie adapter', async () => {
  exchangeCodeForSession.mock.mockImplementationOnce(async () => {
    setAll([{ name: 'sb-session', value: 'session-value', options: { httpOnly: true } }]);
    return { error: null };
  });

  await GET(new NextRequest('https://www.evasale.co.za/auth/callback?code=valid'));

  assert.deepEqual(cookieStore.set.mock.calls[0]?.arguments, ['sb-session', 'session-value', { httpOnly: true }]);
});

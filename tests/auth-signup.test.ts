import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getAuthCallbackUrl, getAuthOrigin, getAuthResetUrl, getLoginNextPath, getSafeNextPath } from '../lib/auth/redirect';
import { getSafeEmailPrefill, getSignupState } from '../lib/auth/signup';

test('signup callback uses the production HTTPS origin by default', () => {
  const callback = new URL(getAuthCallbackUrl('/account', 'https://attacker.example'));
  assert.equal(callback.origin, 'https://www.evasale.co.za');
  assert.equal(callback.pathname, '/auth/callback');
  assert.equal(callback.searchParams.get('next'), '/account');
});

test('local development can use localhost without allowing arbitrary origins', () => {
  assert.equal(getAuthOrigin('http://localhost:3000'), 'http://localhost:3000');
  assert.equal(getAuthOrigin('http://localhost:3001'), 'https://www.evasale.co.za');
  assert.equal(getAuthOrigin('http://attacker.example'), 'https://www.evasale.co.za');
});

test('approved Vercel production origin is preserved for auth redirects', () => {
  assert.equal(getAuthOrigin('https://breeez-lyart.vercel.app'), 'https://breeez-lyart.vercel.app');
  assert.equal(getAuthCallbackUrl('/account', 'https://breeez-lyart.vercel.app'), 'https://breeez-lyart.vercel.app/auth/callback?next=%2Faccount');
  assert.equal(getAuthResetUrl('https://breeez-lyart.vercel.app'), 'https://breeez-lyart.vercel.app/auth/reset-password');
});

test('arbitrary configured HTTPS origins fall back to the approved production origin', () => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = 'https://attacker.example';
  try {
    assert.equal(getAuthOrigin(), 'https://www.evasale.co.za');
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previous;
  }
});

test('callback next path rejects open redirects', () => {
  assert.equal(getSafeNextPath('//attacker.example'), '/account');
  assert.equal(getSafeNextPath('https://attacker.example/phish'), '/account');
  assert.equal(getSafeNextPath('/checkout?from=signup'), '/checkout?from=signup');
});

test('password reset URL uses the approved origin and reset path', () => {
  assert.equal(getAuthResetUrl('https://attacker.example'), 'https://www.evasale.co.za/auth/reset-password');
});

test('Supabase allows callback and reset paths on every approved auth origin', () => {
  const config = readFileSync(new URL('../supabase/config.toml', import.meta.url), 'utf8');
  for (const path of ['/auth/callback', '/auth/reset-password']) {
    for (const origin of ['http://localhost:3000', 'https://www.evasale.co.za', 'https://breeez-lyart.vercel.app']) {
      assert.match(config, new RegExp(`${origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${path.replace('/', '\\/')}`));
    }
  }
});

test('login next paths preserve checkout and reject external or malformed values', () => {
  assert.equal(getLoginNextPath({ next: '/checkout' }), '/checkout');
  assert.equal(getLoginNextPath({ next: 'https://attacker.example' }), '/account');
  assert.equal(getLoginNextPath({ next: ['checkout'] }), '/account');
});

test('signup states distinguish errors, confirmation email, and auto-confirmed sessions', () => {
  assert.equal(getSignupState({ error: { message: 'rate limited' }, user: null, session: null }), 'error');
  assert.equal(getSignupState({ error: null, user: { id: 'u1' }, session: null }), 'check-email');
  assert.equal(getSignupState({ error: null, user: { id: 'u1' }, session: { access_token: 'redacted' } }), 'authenticated');
  assert.equal(getSignupState({ error: null, user: null, session: null }), 'error');
});

test('registered login email is sanitized as a UI-only prefill', () => {
  assert.equal(getSafeEmailPrefill(' customer@example.com '), 'customer@example.com');
  assert.equal(getSafeEmailPrefill('not-an-email'), '');
  assert.equal(getSafeEmailPrefill('https://attacker.example/?email=x'), '');
});

test('signup and modal source contracts normalize email, preserve safe next, and fail closed', () => {
  const registerSource = readFileSync(new URL('../components/auth/RegisterForm.tsx', import.meta.url), 'utf8');
  const loginSource = readFileSync(new URL('../components/auth/LoginForm.tsx', import.meta.url), 'utf8');
  const modalSource = readFileSync(new URL('../components/ui/Modal.tsx', import.meta.url), 'utf8');
  assert.match(registerSource, /const normalizedEmail = email\.trim\(\)\.toLowerCase\(\)/);
  assert.match(registerSource, /email: normalizedEmail/);
  assert.match(registerSource, /getAuthCallbackUrl\(getSafeNextPath\(next\)/);
  assert.match(registerSource, /auth\.signOut\(\{ scope: 'local' \}\)/);
  assert.match(registerSource, /auth\.getSession\(\)/);
  assert.match(registerSource, /data-modal-initial-focus/);
  assert.match(loginSource, /const normalizedEmail = email\.trim\(\)\.toLowerCase\(\)/);
  assert.match(loginSource, /signInWithPassword\(\{ email: normalizedEmail, password \}/);
  assert.match(loginSource, /signInWithOtp\(\{[\s\S]*email: normalizedEmail/);
  assert.doesNotMatch(loginSource, /trackAuthFunnelEvent|auth-funnel/);
  assert.match(modalSource, /e\.key === 'Escape'/);
  assert.match(modalSource, /e\.key !== 'Tab'/);
  assert.match(modalSource, /e\.shiftKey/);
  assert.match(modalSource, /onClick=\{onClose\}/);
  assert.match(modalSource, /React\.useId\(\)/);
  assert.match(modalSource, /dialogRef\.current/);
  assert.doesNotMatch(modalSource, /document\.querySelector/);
  assert.doesNotMatch(registerSource, /new URLSearchParams\([^)]*password/i);
});

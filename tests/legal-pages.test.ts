import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

import { RETURN_WINDOW_DAYS } from '../lib/returns/policy';

const read = (path: string) => readFile(resolve(path), 'utf8');

const PAGES = {
  terms: 'app/legal/terms/page.tsx',
  privacy: 'app/legal/privacy/page.tsx',
  shipping: 'app/legal/shipping/page.tsx',
  returns: 'app/legal/returns/page.tsx',
  about: 'app/about/page.tsx',
  brand: 'lib/brand.ts',
  legal: 'lib/legal.ts',
};

async function allPages() {
  const entries = await Promise.all(
    Object.entries(PAGES).map(async ([key, path]) => [key, await read(path)] as const),
  );
  return Object.fromEntries(entries) as Record<keyof typeof PAGES, string>;
}

test('no policy page leaks another business identity', async () => {
  const pages = await allPages();
  for (const [name, source] of Object.entries(pages)) {
    assert.doesNotMatch(source, /yellow\s*sub/i, `${name} must not reference Yellow Sub Trading`);
    assert.doesNotMatch(source, /\bYST\b/, `${name} must not reference YST`);
    assert.doesNotMatch(source, /mogul street|4410281259|2005\/092602/i, `${name} must not reference another entity`);
    assert.doesNotMatch(source, /@gmail\.com/i, `${name} must not publish a personal email address`);
  }
});

test('no founding-year or heritage claims anywhere', async () => {
  const pages = await allPages();
  for (const [name, source] of Object.entries(pages)) {
    assert.doesNotMatch(source, /founded:?\s*(19|20)\d\d/i, `${name} must not claim a founding year`);
    assert.doesNotMatch(source, /since (19|20)\d\d/i, `${name} must not claim a "since" year`);
    assert.doesNotMatch(source, /\d+\+ Years of/i, `${name} must not claim years of trading`);
    assert.doesNotMatch(source, /Trusted since/i, `${name} must not claim "trusted since"`);
  }
  assert.doesNotMatch(pages.brand, /founded/i);
});

test('every policy page carries the correct Evasale contact details', async () => {
  const pages = await allPages();

  // The shared constants hold the actual values.
  assert.match(pages.brand, /support@evasale\.co\.za/);
  assert.match(pages.brand, /Bridge Office Park, 3rd/);
  assert.match(pages.brand, /Fehrsen St, Brooklyn, Pretoria, 0181/);
  assert.match(pages.brand, /\+27 74 777 8886/);

  // Every policy page renders them from that shared source.
  for (const name of ['terms', 'privacy', 'shipping', 'returns'] as const) {
    assert.match(pages[name], /brand\.contact\.email/, `${name} must show the support email`);
    assert.match(pages[name], /brand\.contact\.address/, `${name} must show the address`);
  }
});

test('the terms cover the laws that actually apply in South Africa', async () => {
  const pages = await allPages();
  // JSX wraps long lines, so phrase matching has to tolerate whitespace.
  const phrase = (value: string) => new RegExp(value.replace(/\s+/g, '\\s+'));
  assert.match(pages.terms, phrase('Consumer Protection Act 68 of 2008'));
  assert.match(pages.terms, phrase('Protection of Personal Information Act 4 of 2013'));
  assert.match(pages.terms, phrase('Republic of South Africa'));
  // A blanket liability waiver must not override the CPA.
  assert.match(pages.terms, phrase('Nothing in these Terms excludes or limits our liability'));
});

test('the privacy policy is POPIA-based, not GDPR-based', async () => {
  const pages = await allPages();
  assert.match(pages.privacy, /POPIA/);
  assert.match(pages.privacy, /Information\s+Officer/);
  assert.match(pages.privacy, /Information\s+Regulator/);
  // GDPR framing is wrong for a South African store and must not creep in.
  assert.doesNotMatch(pages.privacy, /European resident|GDPR|General Data Protection Regulation/i);
});

test('shipping names only the courier we actually use', async () => {
  const pages = await allPages();
  // The carrier lives in the shared shipping facts.
  assert.match(pages.legal, /carrier: 'The Courier Guy'/);
  assert.match(pages.shipping, /shippingFacts\.carrier/);
  assert.match(pages.terms, /shippingFacts\.carrier/);
  assert.doesNotMatch(pages.shipping, /pargo|dawn wing/i, 'shipping policy must not list retired couriers');
  assert.doesNotMatch(pages.terms, /pargo|dawn wing/i, 'terms must not list retired couriers');
});

test('the returns window matches the enforced policy', async () => {
  const pages = await allPages();
  // The window is a single constant used by the page and the enforcement code.
  assert.match(pages.legal, /returnWindowDays: RETURN_WINDOW_DAYS/);
  assert.match(pages.returns, /legal\.returnWindowDays/);
  assert.match(pages.terms, /legal\.returnWindowDays/);
  // The CPA's implied-quality and unsuitable-goods rights survive the window.
  assert.match(pages.returns, /six months/i);
  assert.match(pages.returns, /30-day/i);
  assert.ok(RETURN_WINDOW_DAYS > 0);
});

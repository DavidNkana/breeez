import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { brand } from '../lib/brand';
import { EvasaleComingSoonBanner } from '../components/layout/EvasaleComingSoonBanner';

const root = resolve(import.meta.dirname, '..');

test('launch banner renders in native mode while install promotion stays web-only', () => {
  const layout = readFileSync(resolve(root, 'app/layout.tsx'), 'utf8');
  const banner = readFileSync(resolve(root, 'components/layout/EvasaleComingSoonBanner.tsx'), 'utf8');
  const promotion = readFileSync(resolve(root, 'components/marketing/EvasaleAppPromotion.tsx'), 'utf8');
  const markup = renderToStaticMarkup(createElement(EvasaleComingSoonBanner));

  assert.equal((layout.match(/<EvasaleComingSoonBanner \/>/g) ?? []).length, 1);
  assert.equal((banner.match(/Evasale is coming soon/g) ?? []).length, 1);
  assert.match(banner, /role="status"/);
  assert.match(markup, /role="status"/);
  assert.match(markup, /Evasale is coming soon/);
  assert.doesNotMatch(banner, /isNative|useEffect|useState/);
  assert.match(promotion, /const native = isNative\(\);/);
  assert.match(promotion, /setEligible\(!native\);/);
  assert.match(promotion, /if \(native\) return;/);
});

test('Evasale contact constants use the approved customer links', () => {
  assert.equal(brand.contact.email, 'info@evasale.co.za');
  assert.equal(brand.contact.phone, '+27 74 777 8886');
  assert.equal(brand.contact.phoneLink, 'tel:+27747778886');
  assert.equal(brand.contact.whatsappLink, 'https://wa.me/27747778886');
  assert.equal(brand.contact.address.full, 'Bridge Office Park, 3rd, Fehrsen St, Brooklyn, Pretoria, 0181');
  assert.equal(brand.social.facebook, null);
  assert.equal(brand.social.twitter, null);
});

test('customer-facing legal and email surfaces contain no old contact details', () => {
  const files = [
    'app/legal/privacy/page.tsx',
    'app/legal/shipping/page.tsx',
    'app/legal/terms/page.tsx',
    'app/legal/returns/page.tsx',
    'lib/email/resend.ts',
  ];
  for (const file of files) {
    const source = readFileSync(resolve(root, file), 'utf8');
    assert.doesNotMatch(source, /trendsdaytoday|support@breeez|returns@breeez|27794571253/i, file);
  }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EVASALE_APP_URL,
  EVASALE_APP_BASE_URL,
  EVASALE_PROMOTION_KEY,
  EVASALE_PROMOTION_VERSION,
  EVASALE_SUPPRESSION_MS,
  getEvasalePlatform,
  isPromotionSuppressed,
  readPromotionRecord,
  writePromotionSuppression,
  clearPromotionSuppression,
} from '../lib/evasale-promotion';
import { isNativeEnvironment } from '../lib/platform';

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

test('promotion suppression is versioned and lasts 30 days', () => {
  const store = storage();
  const now = 1_000_000;
  writePromotionSuppression(store, 'dismissed', now);
  const record = readPromotionRecord(store, now + 1);
  assert.equal(record?.version, EVASALE_PROMOTION_VERSION);
  assert.equal(record?.action, 'dismissed');
  assert.equal(record?.suppressedUntil, now + EVASALE_SUPPRESSION_MS);
  assert.equal(isPromotionSuppressed(record, now + EVASALE_SUPPRESSION_MS), false);
  assert.equal(store.getItem(EVASALE_PROMOTION_KEY) !== null, true);
});

test('invalid or old promotion records do not suppress the prompt', () => {
  const store = storage();
  store.setItem(EVASALE_PROMOTION_KEY, JSON.stringify({ version: 99, suppressedUntil: Date.now() + 1000, action: 'dismissed' }));
  assert.equal(readPromotionRecord(store), null);
});

test('local QA can clear the versioned prompt without changing production suppression rules', () => {
  const store = storage();
  writePromotionSuppression(store, 'dismissed', 1_000_000);
  clearPromotionSuppression(store);
  assert.equal(store.getItem(EVASALE_PROMOTION_KEY), null);
});

test('native markers suppress web-only UI even if the bridge signal is unavailable', () => {
  assert.equal(isNativeEnvironment(true), true);
  assert.equal(isNativeEnvironment(false, 'foo capacitor bar'), true);
  assert.equal(isNativeEnvironment(false, '', 'true'), true);
  assert.equal(isNativeEnvironment(false, 'web'), false);
});

test('platform copy branches are deterministic and Play CTA is real', () => {
  assert.equal(getEvasalePlatform('Mozilla/5.0 (Linux; Android 14)'), 'android');
  assert.equal(getEvasalePlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)'), 'ios');
  assert.equal(getEvasalePlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X)'), 'desktop');
  assert.equal(EVASALE_APP_BASE_URL, 'https://play.google.com/store/apps/details?id=com.breeez.app');
  assert.equal(
    EVASALE_APP_URL,
    'https://play.google.com/store/apps/details?id=com.breeez.app&referrer=utm_source%3Devasale_web%26utm_medium%3Dapp_prompt%26utm_campaign%3Dapp_install',
  );
  const attribution = new URL(EVASALE_APP_URL);
  assert.equal(
    attribution.searchParams.get('referrer'),
    'utm_source=evasale_web&utm_medium=app_prompt&utm_campaign=app_install',
  );
});

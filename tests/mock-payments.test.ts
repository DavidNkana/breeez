import assert from 'node:assert/strict';
import test from 'node:test';
import { isMockPaymentsEnabled } from '../lib/payments/mock-mode';
import { isMockMode } from '../lib/payments';

test('mock payments require exact true and non-production environment', () => {
  const env: NodeJS.ProcessEnv = { ...process.env, MOCK_PAYMENTS: 'true', NODE_ENV: 'test' };
  assert.equal(isMockPaymentsEnabled(env), true);
  assert.equal(isMockPaymentsEnabled({ ...env, MOCK_PAYMENTS: 'TRUE' }), false);
  assert.equal(isMockPaymentsEnabled({ ...env, NODE_ENV: 'production' }), false);
});

test('UI mock status uses the server contract and fails closed', () => {
  assert.equal(isMockMode({ enabled: true }), true);
  assert.equal(isMockMode({ enabled: false }), false);
  assert.equal(isMockMode({ enabled: Boolean(undefined) }), false);
});

test('server mock mode ignores client-exposed flag mismatches and production configuration', () => {
  assert.equal(isMockPaymentsEnabled({
    MOCK_PAYMENTS: 'false',
    NEXT_PUBLIC_MOCK_PAYMENTS: 'true',
    NODE_ENV: 'development',
  }), false);
  assert.equal(isMockPaymentsEnabled({ MOCK_PAYMENTS: 'true', NODE_ENV: 'production' }), false);
  assert.equal(isMockPaymentsEnabled({ NODE_ENV: 'production' }), false);
});

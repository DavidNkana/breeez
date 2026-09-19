import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldIncludePdpVariant } from '../lib/catalog/queries';

test('PDP variant inclusion follows the public product boundary, not variant activity', () => {
  assert.equal(shouldIncludePdpVariant(true, true), true);
  assert.equal(shouldIncludePdpVariant(true, false), true);
  assert.equal(shouldIncludePdpVariant(false, true), false);
  assert.equal(shouldIncludePdpVariant(false, false), false);
});

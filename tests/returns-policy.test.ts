import assert from 'node:assert/strict';
import test from 'node:test';
import { isWithinReturnWindow, RETURN_WINDOW_DAYS } from '../lib/returns/policy';

const DAY_MS = 24 * 60 * 60 * 1000;

test('return policy uses a seven-day window', () => {
  assert.equal(RETURN_WINDOW_DAYS, 7);
});

test('return cutoff includes exactly seven days and excludes later requests', () => {
  const deliveredAt = new Date('2026-09-01T12:00:00.000Z');
  const cutoff = new Date(deliveredAt.getTime() + RETURN_WINDOW_DAYS * DAY_MS);

  assert.equal(isWithinReturnWindow(deliveredAt, new Date(cutoff.getTime() - 1)), true);
  assert.equal(isWithinReturnWindow(deliveredAt, cutoff), true);
  assert.equal(isWithinReturnWindow(deliveredAt, new Date(cutoff.getTime() + 1)), false);
});

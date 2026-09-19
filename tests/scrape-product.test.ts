import assert from 'node:assert/strict';
import test from 'node:test';
import { assertPublicRedirectTarget, assertPublicUrl, bestSrcsetCandidate, imageFormat, isPrivateIp } from '../app/api/admin/scrape-product/route';

test('rejects truncated image signatures', () => {
  assert.equal(imageFormat('image/png', Uint8Array.from([0x89, 0x50, 0x4e, 0x47])), null);
  assert.equal(imageFormat('image/jpeg', Uint8Array.from([0xff, 0xd8])), null);
  assert.equal(imageFormat('image/webp', Uint8Array.from([0x52, 0x49, 0x46, 0x46])), null);
});

test('accepts complete image signatures only for their declared format', () => {
  assert.deepEqual(imageFormat('image/png', Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), { type: 'image/png', extension: 'png' });
  assert.deepEqual(imageFormat('image/jpeg', Uint8Array.from([0xff, 0xd8, 0xff])), { type: 'image/jpeg', extension: 'jpg' });
  assert.deepEqual(imageFormat('image/webp', Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])), { type: 'image/webp', extension: 'webp' });
});

test('rejects private and redirect targets', async () => {
  assert.equal(isPrivateIp('127.0.0.1'), true);
  assert.equal(isPrivateIp('::ffff:192.168.1.10'), true);
  await assert.rejects(assertPublicUrl('http://127.0.0.1/admin'), /Private or internal/);
  await assert.rejects(assertPublicUrl('http://[::1]/admin'), /Private or internal/);
  await assert.rejects(assertPublicRedirectTarget('http://127.0.0.1/internal', new URL('https://public.example/')), /Private or internal/);
});

test('selects the highest-density srcset candidate', () => {
  assert.equal(bestSrcsetCandidate('/small.jpg 400w, /large.jpg 1200w, /medium.jpg 800w'), '/large.jpg');
  assert.equal(bestSrcsetCandidate('/one.webp 1x, /two.webp 2x'), '/two.webp');
});

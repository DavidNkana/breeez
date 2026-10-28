import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';

import { prepareImageForStorage } from '../app/api/admin/scrape-product/route';
import {
  BACKFILL_SIZE_THRESHOLD_BYTES,
  MAX_IMAGE_EDGE,
  needsOptimization,
  optimizeImageBytes,
  readImageInfo,
  resolveImageFormat,
} from '../lib/images/optimize';

/** A noisy, full-resolution retailer original — the kind that used to be stored as-is. */
async function retailerOriginal(width: number, height: number) {
  const pixels = Buffer.alloc(width * height * 3);
  for (let i = 0; i < pixels.length; i += 1) pixels[i] = (i * 37 + (i % 251) * 13) % 256;
  return sharp(pixels, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 95 })
    .toBuffer();
}

test('the import path stores a bounded, re-encoded image instead of the original', async () => {
  const original = await retailerOriginal(3000, 2000);
  assert.ok(original.byteLength > 300 * 1024, 'fixture must be a multi-hundred-KB original');

  const info = await readImageInfo(original);
  assert.equal(info.width, 3000);
  assert.equal(info.height, 2000);
  assert.equal(needsOptimization(info), true);

  const prepared = await prepareImageForStorage(original, 'image/jpeg');

  assert.equal(prepared.warning, null);
  assert.equal(prepared.contentType, 'image/jpeg');
  assert.ok(prepared.bytes.byteLength < original.byteLength, 'stored bytes must be smaller than the original');

  const stored = await readImageInfo(prepared.bytes);
  assert.ok(Math.max(stored.width, stored.height) <= MAX_IMAGE_EDGE, `stored long edge ${Math.max(stored.width, stored.height)} must be <= ${MAX_IMAGE_EDGE}`);
  assert.equal(stored.width, MAX_IMAGE_EDGE);
  assert.equal(stored.height, Math.round((2000 / 3000) * MAX_IMAGE_EDGE));
});

test('optimisation preserves the format family so the object path and extension stay valid', async () => {
  const png = await sharp({
    create: { width: 2200, height: 1200, channels: 4, background: { r: 199, g: 46, b: 40, alpha: 0.4 } },
  }).png().toBuffer();

  const optimized = await optimizeImageBytes(png, resolveImageFormat('image/png'));
  assert.equal(optimized.contentType, 'image/png');
  assert.equal(optimized.extension, 'png');
  assert.ok(Math.max(optimized.width, optimized.height) <= MAX_IMAGE_EDGE);

  const jpeg = await optimizeImageBytes(png, resolveImageFormat('image/jpeg'));
  assert.equal(jpeg.contentType, 'image/jpeg');
  assert.equal(jpeg.extension, 'jpg');
  assert.ok(Math.max(jpeg.width, jpeg.height) <= MAX_IMAGE_EDGE);
});

test('a broken image never breaks the import — the original bytes are kept with a warning', async () => {
  const garbage = Buffer.from('this is definitely not an image', 'utf8');
  const prepared = await prepareImageForStorage(garbage, 'image/jpeg');

  assert.equal(prepared.bytes.byteLength, garbage.byteLength);
  assert.deepEqual(prepared.bytes, garbage);
  assert.equal(prepared.contentType, 'image/jpeg');
  assert.ok(prepared.warning, 'a warning must be raised when optimisation fails');
});

test('the backfill budget matches the documented thresholds', () => {
  assert.equal(MAX_IMAGE_EDGE, 1600);
  assert.equal(BACKFILL_SIZE_THRESHOLD_BYTES, 300 * 1024);

  assert.equal(needsOptimization({ width: 1600, height: 1600, format: 'jpeg', size: 1000 }), false);
  assert.equal(needsOptimization({ width: 1601, height: 900, format: 'jpeg', size: 1000 }), true);
  assert.equal(needsOptimization({ width: 800, height: 600, format: 'jpeg', size: 300 * 1024 + 1 }), true);
  assert.equal(needsOptimization({ width: 0, height: 0, format: 'jpeg', size: 10 * 1024 * 1024 }), false);
});

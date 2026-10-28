import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAX_UPLOAD_EDGE,
  UPLOAD_JPEG_QUALITY,
  UPLOAD_SKIP_BYTES,
  optimizeImageForUpload,
} from '../lib/images/client-optimize';

function fakeFile(name: string, type: string, size: number): File {
  // Node 18+ exposes File; fall back to a Blob-like object if needed.
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

test('caps the long edge and uses a bounded JPEG quality', () => {
  assert.equal(MAX_UPLOAD_EDGE, 1600);
  assert.ok(UPLOAD_JPEG_QUALITY > 0.5 && UPLOAD_JPEG_QUALITY <= 0.9);
  assert.equal(UPLOAD_SKIP_BYTES, 300 * 1024);
});

test('returns the original file untouched outside a browser', async () => {
  const file = fakeFile('dress.jpg', 'image/jpeg', 5 * 1024 * 1024);
  const result = await optimizeImageForUpload(file);

  // No DOM in the test runner, so the optimiser must be a no-op rather than
  // throw — an admin running the app server-side must never crash on this.
  assert.equal(result.file, file);
  assert.equal(result.optimized, false);
  assert.equal(result.originalBytes, file.size);
});

test('never rasterises an SVG', async () => {
  const svg = fakeFile('logo.svg', 'image/svg+xml', 1024 * 1024);
  const result = await optimizeImageForUpload(svg);

  assert.equal(result.file, svg);
  assert.equal(result.optimized, false);
});

test('ignores files that are not images', async () => {
  const doc = fakeFile('notes.pdf', 'application/pdf', 1024 * 1024);
  const result = await optimizeImageForUpload(doc);

  assert.equal(result.file, doc);
  assert.equal(result.optimized, false);
});

import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { assertPublicRedirectTarget, assertPublicUrl, bestSrcsetCandidate, createPinnedLookup, imageFormat, isPrivateIp, normaliseLookupAddresses } from '../app/api/admin/scrape-product/route';

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

test('normalises public DNS lookup results without accepting undefined addresses', () => {
  assert.deepEqual(normaliseLookupAddresses([{ address: '93.184.216.34', family: 4 }]), ['93.184.216.34']);
  assert.deepEqual(normaliseLookupAddresses([{ family: 4 }, undefined, { address: 'not-an-ip', family: 4 }]), []);
});

test('pinned lookup matches Node callback contracts for scalar and all results', async () => {
  const lookup = createPinnedLookup('93.184.216.34', 4);
  const scalar = await new Promise<{ address: string; family?: number }>((resolve, reject) => lookup('public.example', { all: false }, (error, address, family) => error ? reject(error) : resolve({ address: address as string, family })));
  const all = await new Promise<unknown>((resolve, reject) => lookup('public.example', { all: true }, (error, address) => error ? reject(error) : resolve(address)));
  assert.deepEqual(scalar, { address: '93.184.216.34', family: 4 });
  assert.deepEqual(all, [{ address: '93.184.216.34', family: 4 }]);
});

test('uses the pinned lookup for a successful local HTTP request', async () => {
  const server = http.createServer((_request, response) => response.end('ok'));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const result = await new Promise<{ statusCode?: number; body: string }>((resolve, reject) => {
      const request = http.request({ hostname: 'public.example', port: address.port, path: '/', lookup: createPinnedLookup('127.0.0.1', 4) }, (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => resolve({ statusCode: response.statusCode, body: Buffer.concat(chunks).toString() }));
      });
      request.once('error', reject);
      request.end();
    });
    assert.equal(result.statusCode, 200);
    assert.equal(result.body, 'ok');
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('selects the highest-density srcset candidate', () => {
  assert.equal(bestSrcsetCandidate('/small.jpg 400w, /large.jpg 1200w, /medium.jpg 800w'), '/large.jpg');
  assert.equal(bestSrcsetCandidate('/one.webp 1x, /two.webp 2x'), '/two.webp');
});

import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';

import { listObjects, processObject, type AdminClient } from '../scripts/optimize-product-images';

type StoredFile = { bytes: Buffer; contentType: string };

/**
 * Minimal stand-in for the Supabase storage API: a flat map of path -> bytes
 * plus folder entries in the listing.
 */
function fakeStorage(files: Record<string, StoredFile>) {
  const uploads: Array<{ path: string; size: number; contentType: string }> = [];

  const client = {
    storage: {
      from: () => ({
        list: async (folder: string) => {
          const prefix = folder ? `${folder}/` : '';
          const entries: Array<{ name: string; id: string | null; metadata: unknown }> = [];
          const folders = new Set<string>();
          for (const path of Object.keys(files)) {
            if (!path.startsWith(prefix)) continue;
            const rest = path.slice(prefix.length);
            const slash = rest.indexOf('/');
            if (slash === -1) {
              entries.push({
                name: rest,
                id: `id-${path}`,
                metadata: { size: files[path].bytes.byteLength, mimetype: files[path].contentType },
              });
            } else {
              // The real API only lists the immediate children of a folder.
              const folderName = rest.slice(0, slash);
              if (!folders.has(folderName)) {
                folders.add(folderName);
                entries.push({ name: folderName, id: null, metadata: null });
              }
            }
          }
          return { data: entries, error: null };
        },
        download: async (path: string) => {
          const file = files[path];
          if (!file) return { data: null, error: { message: 'not found' } };
          return { data: new Blob([new Uint8Array(file.bytes)]), error: null };
        },
        upload: async (path: string, body: Buffer, options: { contentType: string }) => {
          uploads.push({ path, size: body.byteLength, contentType: options.contentType });
          files[path] = { bytes: body, contentType: options.contentType };
          return { data: { path }, error: null };
        },
      }),
    },
  };

  return { client: client as unknown as AdminClient, uploads, files };
}

async function bigJpeg(width: number, height: number) {
  const pixels = Buffer.alloc(width * height * 3);
  for (let i = 0; i < pixels.length; i += 1) pixels[i] = (i * 17 + (i % 97) * 7) % 256;
  return sharp(pixels, { raw: { width, height, channels: 3 } }).jpeg({ quality: 95 }).toBuffer();
}

test('the backfill walks folders and only rewrites oversized objects', async () => {
  const oversized = await bigJpeg(3000, 2000);
  const small = await sharp({
    create: { width: 400, height: 300, channels: 3, background: { r: 10, g: 20, b: 30 } },
  }).jpeg({ quality: 80 }).toBuffer();

  const { client, uploads, files } = fakeStorage({
    'imports/big.jpg': { bytes: oversized, contentType: 'image/jpeg' },
    'imports/small.jpg': { bytes: small, contentType: 'image/jpeg' },
    'temp-123.jpg': { bytes: small, contentType: 'image/jpeg' },
  });

  const objects = await listObjects(client, '');
  assert.deepEqual(objects.map((object) => object.path).sort(), [
    'imports/big.jpg',
    'imports/small.jpg',
    'temp-123.jpg',
  ]);

  const results = [];
  for (const object of objects) {
    results.push(await processObject(client, object, false));
  }

  // Only the oversized object was rewritten, and it kept its path.
  assert.equal(uploads.length, 1);
  assert.equal(uploads[0].path, 'imports/big.jpg');
  assert.equal(uploads[0].contentType, 'image/jpeg');
  assert.ok(uploads[0].size < oversized.byteLength);
  assert.ok(files['imports/big.jpg'].bytes.byteLength < oversized.byteLength);

  const rewritten = results.find((result) => result.path === 'imports/big.jpg');
  assert.equal(rewritten?.status, 'rewritten');
  assert.ok((rewritten?.afterEdge ?? 0) <= 1600);
  assert.ok((rewritten?.beforeBytes ?? 0) > (rewritten?.afterBytes ?? 0));

  for (const path of ['imports/small.jpg', 'temp-123.jpg']) {
    assert.equal(results.find((result) => result.path === path)?.status, 'skipped');
  }
});

test('the backfill is idempotent — a second run rewrites nothing', async () => {
  const oversized = await bigJpeg(3000, 2000);
  const { client, uploads } = fakeStorage({
    'imports/big.jpg': { bytes: oversized, contentType: 'image/jpeg' },
  });

  const objects = await listObjects(client, '');
  for (const object of objects) await processObject(client, object, false);
  assert.equal(uploads.length, 1);

  const secondRun = await listObjects(client, '');
  for (const object of secondRun) {
    const result = await processObject(client, object, false);
    assert.equal(result.status, 'skipped');
  }
  assert.equal(uploads.length, 1, 'the second run must not write again');
});

test('a dry run reports the saving but writes nothing', async () => {
  const oversized = await bigJpeg(3000, 2000);
  const { client, uploads, files } = fakeStorage({
    'imports/big.jpg': { bytes: oversized, contentType: 'image/jpeg' },
  });

  const objects = await listObjects(client, '');
  const result = await processObject(client, objects[0], true);

  assert.equal(result.status, 'rewritten');
  assert.ok(result.afterBytes < result.beforeBytes);
  assert.equal(uploads.length, 0);
  assert.equal(files['imports/big.jpg'].bytes.byteLength, oversized.byteLength);
});

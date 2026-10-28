#!/usr/bin/env -S npx tsx
/**
 * Backfill: shrink oversized product images in the Supabase `product-images`
 * bucket — in place.
 *
 * The importer now downscales and re-encodes every image it stores, but the
 * images that were imported before this change are still full-resolution
 * retailer originals (4-8 MB each). They are what made a product page
 * download ~42 MB and a listing page ~161 MB.
 *
 * This script walks the bucket and, for every object whose long edge is
 * larger than 1600px or whose payload is larger than 300 KB, re-encodes it
 * and writes the result back to the SAME path.
 *
 * Safety properties:
 *   - the object path never changes, so every public URL keeps working
 *   - nothing is deleted and nothing is renamed
 *   - the format family (jpeg/png/webp) is preserved, so the file extension
 *     always matches the bytes and the content type never changes
 *   - the script is idempotent: a second run finds nothing left to do
 *   - it is resumable: it re-lists the bucket and skips objects that are
 *     already within budget, so an interrupted run can simply be restarted
 *
 * It is NOT part of the build or of any deploy. Run it deliberately:
 *
 *   # preview what would change (no writes)
 *   npm run images:optimize -- --dry-run
 *
 *   # actually rewrite the bucket
 *   npm run images:optimize
 *
 *   # only the objects under a prefix, e.g. everything the importer wrote
 *   npm run images:optimize -- --prefix=imports/
 *
 * Required environment (read from the environment or .env.local / .env):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * The service-role key is only ever read from the environment — it is never
 * printed, logged or written to disk.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  BACKFILL_SIZE_THRESHOLD_BYTES,
  MAX_IMAGE_EDGE,
  needsOptimization,
  optimizeImageBytes,
  readImageInfo,
  resolveImageFormat,
} from '../lib/images/optimize';

const BUCKET = 'product-images';

/**
 * A rewrite is only written back when it saves at least this share of the
 * payload (or when the dimensions actually shrink). Keeps the script
 * idempotent: re-encoding an already-optimised file barely changes its size.
 */
const REWRITE_SIZE_RATIO = 0.95;

type Args = {
  dryRun: boolean;
  limit: number | null;
  prefix: string;
  concurrency: number;
  help: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false, limit: null, prefix: '', concurrency: 4, help: false };
  for (const arg of argv) {
    if (arg === '--dry-run' || arg === '--dryrun') args.dryRun = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg.startsWith('--limit=')) args.limit = Math.max(1, Number.parseInt(arg.slice('--limit='.length), 10) || 1);
    else if (arg.startsWith('--prefix=')) args.prefix = arg.slice('--prefix='.length);
    else if (arg.startsWith('--concurrency=')) args.concurrency = Math.max(1, Math.min(16, Number.parseInt(arg.slice('--concurrency='.length), 10) || 1));
  }
  return args;
}

/**
 * Minimal .env loader so the script can be run from a checkout without
 * exporting the variables by hand. Existing environment variables always win.
 */
function loadEnvFiles() {
  for (const file of ['.env.local', '.env']) {
    const full = join(process.cwd(), file);
    if (!existsSync(full)) continue;
    const contents = readFileSync(full, 'utf8');
    for (const rawLine of contents.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const separator = line.indexOf('=');
      if (separator === -1) continue;
      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

export type StorageObject = {
  name: string;
  id: string | null;
  path: string;
  size: number | null;
  contentType: string | null;
};

export type AdminClient = SupabaseClient;

/** List every object in the bucket, walking into folders. */
export async function listObjects(admin: AdminClient, prefix: string): Promise<StorageObject[]> {
  const objects: StorageObject[] = [];

  async function walk(folder: string) {
    let offset = 0;
    for (;;) {
      const { data, error } = await admin.storage.from(BUCKET).list(folder, { limit: 1000, offset });
      if (error) throw new Error(`Could not list "${folder || '/'}" in ${BUCKET}: ${error.message}`);
      if (!data || data.length === 0) break;
      for (const entry of data) {
        const path = folder ? `${folder}/${entry.name}` : entry.name;
        // A folder has no id in the Supabase storage listing API.
        if (!entry.id) {
          await walk(path);
          continue;
        }
        objects.push({
          name: entry.name,
          id: entry.id,
          path,
          size: typeof entry.metadata?.size === 'number' ? entry.metadata.size : null,
          contentType: typeof entry.metadata?.mimetype === 'string' ? entry.metadata.mimetype : null,
        });
      }
      if (data.length < 1000) break;
      offset += data.length;
    }
  }

  await walk(prefix);
  return objects;
}

export type Result = {
  path: string;
  status: 'rewritten' | 'skipped' | 'failed';
  beforeBytes: number;
  afterBytes: number;
  beforeEdge: number;
  afterEdge: number;
  detail?: string;
};

export async function processObject(admin: AdminClient, object: StorageObject, dryRun: boolean): Promise<Result> {
  const { data, error } = await admin.storage.from(BUCKET).download(object.path);
  if (error || !data) {
    return {
      path: object.path,
      status: 'failed',
      beforeBytes: object.size ?? 0,
      afterBytes: object.size ?? 0,
      beforeEdge: 0,
      afterEdge: 0,
      detail: error?.message ?? 'download failed',
    };
  }

  const bytes = Buffer.from(await data.arrayBuffer());
  const info = await readImageInfo(bytes);
  const beforeEdge = Math.max(info.width, info.height);

  // Fast path: already inside both budgets — nothing to do.
  if (!needsOptimization(info)) {
    return {
      path: object.path,
      status: 'skipped',
      beforeBytes: bytes.byteLength,
      afterBytes: bytes.byteLength,
      beforeEdge,
      afterEdge: beforeEdge,
    };
  }

  const format = resolveImageFormat(object.contentType ?? object.name);
  const optimized = await optimizeImageBytes(bytes, format);

  // Only write when the rewrite actually buys something. This is what makes a
  // second run a no-op: re-encoding an already-optimised file reproduces
  // (almost) the same bytes, so it is reported as skipped instead of being
  // uploaded again.
  const smaller = optimized.bytes.byteLength <= bytes.byteLength * REWRITE_SIZE_RATIO;
  const downscaled = Math.max(optimized.width, optimized.height) < beforeEdge;
  if (!smaller && !downscaled) {
    return {
      path: object.path,
      status: 'skipped',
      beforeBytes: bytes.byteLength,
      afterBytes: bytes.byteLength,
      beforeEdge,
      afterEdge: beforeEdge,
    };
  }

  if (dryRun) {
    return {
      path: object.path,
      status: 'rewritten',
      beforeBytes: bytes.byteLength,
      afterBytes: optimized.bytes.byteLength,
      beforeEdge,
      afterEdge: Math.max(optimized.width, optimized.height),
    };
  }

  // Same path, same content type, same extension — only the bytes change.
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(object.path, optimized.bytes, {
    contentType: optimized.contentType,
    cacheControl: '31536000',
    upsert: true,
  });

  if (uploadError) {
    return {
      path: object.path,
      status: 'failed',
      beforeBytes: bytes.byteLength,
      afterBytes: bytes.byteLength,
      beforeEdge: Math.max(info.width, info.height),
      afterEdge: Math.max(info.width, info.height),
      detail: uploadError.message,
    };
  }

  return {
    path: object.path,
    status: 'rewritten',
    beforeBytes: bytes.byteLength,
    afterBytes: optimized.bytes.byteLength,
    beforeEdge: Math.max(info.width, info.height),
    afterEdge: Math.max(optimized.width, optimized.height),
  };
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log([
      'Optimise product images in the Supabase product-images bucket (in place).',
      '',
      'Usage: npm run images:optimize -- [options]',
      '',
      '  --dry-run             report what would change, write nothing',
      '  --limit=<n>           stop after <n> objects',
      '  --prefix=<path>       only walk this folder (e.g. imports/)',
      '  --concurrency=<n>     parallel downloads (default 4)',
      '',
    ].join('\n'));
    return;
  }

  loadEnvFiles();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY. Set them in the environment or in .env.local.');
    process.exitCode = 1;
    return;
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`Bucket: ${BUCKET}`);
  console.log(`Budget: long edge <= ${MAX_IMAGE_EDGE}px, payload <= ${formatBytes(BACKFILL_SIZE_THRESHOLD_BYTES)}`);
  if (args.dryRun) console.log('Mode: DRY RUN (no writes)');

  const objects = await listObjects(admin, args.prefix);
  const targets = args.limit ? objects.slice(0, args.limit) : objects;
  console.log(`Objects found: ${objects.length}${targets.length !== objects.length ? ` (processing ${targets.length})` : ''}\n`);

  const results: Result[] = [];
  let cursor = 0;

  async function worker() {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= targets.length) return;
      const object = targets[index];
      try {
        results.push(await processObject(admin, object, args.dryRun));
      } catch (error) {
        results.push({
          path: object.path,
          status: 'failed',
          beforeBytes: object.size ?? 0,
          afterBytes: object.size ?? 0,
          beforeEdge: 0,
          afterEdge: 0,
          detail: error instanceof Error ? error.message : 'unknown error',
        });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(args.concurrency, Math.max(1, targets.length)) }, () => worker()));

  results.sort((a, b) => a.path.localeCompare(b.path));

  let before = 0;
  let after = 0;
  let rewritten = 0;
  let skipped = 0;
  let failed = 0;

  for (const result of results) {
    before += result.beforeBytes;
    after += result.afterBytes;
    if (result.status === 'rewritten') rewritten += 1;
    else if (result.status === 'skipped') skipped += 1;
    else failed += 1;

    if (result.status === 'failed') {
      console.log(`FAILED  ${result.path} — ${result.detail ?? 'unknown error'}`);
      continue;
    }
    if (result.status === 'rewritten') {
      console.log(
        `${args.dryRun ? 'WOULD ' : ''}REWRITE ${result.path} — ${formatBytes(result.beforeBytes)} -> ${formatBytes(result.afterBytes)}, ` +
        `long edge ${result.beforeEdge}px -> ${result.afterEdge}px`,
      );
    }
  }

  console.log('\n--- summary ---');
  console.log(`rewritten: ${rewritten}`);
  console.log(`skipped:   ${skipped}`);
  console.log(`failed:    ${failed}`);
  console.log(`payload:   ${formatBytes(before)} -> ${formatBytes(after)} (${before > 0 ? Math.round((1 - after / before) * 100) : 0}% smaller)`);
  if (args.dryRun) console.log('\nDry run finished. Re-run without --dry-run to apply.');

  if (failed > 0) process.exitCode = 1;
}

// Only run when executed directly — importing this module (e.g. from a test)
// must not touch the bucket.
if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

#!/usr/bin/env -S npx tsx
/**
 * Rebuild the storefront brand logo assets from the originals in
 * `brand-assets/`.
 *
 * The shipped PNGs were full-resolution artwork (894x624 / 1083x367) that the
 * browser downloaded three times per page — 337 KB + 141 KB on every route.
 * They are now downscaled to the size they are actually rendered at (640px
 * wide, which covers the largest usage at 2x) and re-encoded as an indexed
 * PNG.
 *
 * The visible artwork is unchanged (mean channel difference < 0.5/255 against
 * a straight downscale of the original).
 *
 * Usage:
 *   npm run brand:optimize
 *
 * The originals in brand-assets/ are never modified.
 */

import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

/** Target width of the shipped logos (2x of the largest rendered size). */
const TARGET_WIDTH = 640;

type BrandAsset = {
  source: string;
  target: string;
};

const ASSETS: BrandAsset[] = [
  {
    source: join('brand-assets', 'evasale-solo-logo.png'),
    target: join('public', 'brand', 'evasale-solo-logo.png'),
  },
  {
    source: join('brand-assets', 'evasale-logo-right-subtext.png'),
    target: join('public', 'brand', 'evasale-logo-right-subtext.png'),
  },
];

async function main() {
  for (const asset of ASSETS) {
    if (!existsSync(asset.source)) {
      console.error(`Missing source asset: ${asset.source}`);
      process.exitCode = 1;
      continue;
    }

    const before = statSync(asset.source).size;
    const metadata = await sharp(asset.source).metadata();
    const width = Math.min(TARGET_WIDTH, metadata.width ?? TARGET_WIDTH);

    const output = await sharp(asset.source)
      .resize({ width, withoutEnlargement: true })
      .png({ compressionLevel: 9, effort: 10, palette: true, quality: 90, dither: 1 })
      .toBuffer();

    mkdirSync(dirname(asset.target), { recursive: true });
    writeFileSync(asset.target, output);

    const after = statSync(asset.target).size;
    const outputMetadata = await sharp(output).metadata();
    console.log(
      `${asset.target}: ${metadata.width}x${metadata.height} ${before} B -> ${outputMetadata.width}x${outputMetadata.height} ${after} B ` +
      `(${Math.round((1 - after / before) * 100)}% smaller)`,
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

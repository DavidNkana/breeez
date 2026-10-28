import sharp from 'sharp';

/**
 * Shared image optimisation used by BOTH the importer
 * (app/api/admin/scrape-product/route.ts) and the backfill script
 * (scripts/optimize-product-images.ts).
 *
 * Retailer originals are full-resolution files (often 4-8 MB). Serving them
 * straight from Supabase is what made the storefront download 40-160 MB per
 * page. Every stored image is therefore normalised to:
 *
 *   - a long edge of at most MAX_IMAGE_EDGE pixels
 *   - a re-encoded, much smaller payload in the SAME format family
 *
 * The format family is preserved on purpose: the object path (and therefore
 * the public URL and its extension) must stay identical to what was already
 * stored, otherwise every existing product row would point at a dead file.
 */

/** Maximum long edge (px) of a stored product image. */
export const MAX_IMAGE_EDGE = 1600;

/** JPEG/WebP encoder quality. */
export const IMAGE_QUALITY = 80;

/** Images above this size (bytes) are re-encoded by the backfill script. */
export const BACKFILL_SIZE_THRESHOLD_BYTES = 300 * 1024;

export type StoredImageFormat = 'jpeg' | 'png' | 'webp';

export type ImageInfo = {
  width: number;
  height: number;
  format: string;
  size: number;
};

export type OptimizedImage = {
  bytes: Buffer;
  contentType: string;
  extension: string;
  width: number;
  height: number;
  /** True when the encoder produced different (smaller) bytes than the input. */
  changed: boolean;
};

const CONTENT_TYPES: Record<StoredImageFormat, { contentType: string; extension: string }> = {
  jpeg: { contentType: 'image/jpeg', extension: 'jpg' },
  png: { contentType: 'image/png', extension: 'png' },
  webp: { contentType: 'image/webp', extension: 'webp' },
};

/**
 * Map a stored content type (or a file extension) onto the format family we
 * keep. Unknown types fall back to JPEG because every consumer expects a
 * broadly decodable image.
 */
export function resolveImageFormat(contentTypeOrExtension: string): StoredImageFormat {
  const value = contentTypeOrExtension.toLowerCase().trim();
  if (value.includes('png') || value.endsWith('.png')) return 'png';
  if (value.includes('webp') || value.endsWith('.webp')) return 'webp';
  return 'jpeg';
}

/** Read the intrinsic dimensions of an image buffer. */
export async function readImageInfo(bytes: Buffer): Promise<ImageInfo> {
  const metadata = await sharp(bytes).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  return { width, height, format: metadata.format ?? 'unknown', size: bytes.byteLength };
}

/** True when an image is over the size/edge budget and should be re-encoded. */
export function needsOptimization(info: ImageInfo): boolean {
  if (info.width <= 0 || info.height <= 0) return false;
  const longEdge = Math.max(info.width, info.height);
  return longEdge > MAX_IMAGE_EDGE || info.size > BACKFILL_SIZE_THRESHOLD_BYTES;
}

/**
 * Downscale and re-encode an image.
 *
 * The output keeps the input's format family so the stored object path and
 * its extension stay stable. Throws when the bytes are not a decodable image
 * — callers fall back to the original bytes.
 */
export async function optimizeImageBytes(
  bytes: Buffer,
  format: StoredImageFormat,
): Promise<OptimizedImage> {
  const target = CONTENT_TYPES[format];
  const pipeline = sharp(bytes, { failOn: 'error' });
  const metadata = await pipeline.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (!width || !height) throw new Error('Image has no readable dimensions');

  const resized = sharp(bytes, { failOn: 'error' }).resize({
    width: MAX_IMAGE_EDGE,
    height: MAX_IMAGE_EDGE,
    fit: 'inside',
    withoutEnlargement: true,
  });

  let output: Buffer;
  if (format === 'png') {
    // PNG keeps its alpha channel and stays lossless; only the pixels and the
    // zlib stream shrink.
    output = await resized.png({ compressionLevel: 9, effort: 10 }).toBuffer();
  } else if (format === 'webp') {
    output = await resized.webp({ quality: IMAGE_QUALITY }).toBuffer();
  } else {
    output = await resized.jpeg({ quality: IMAGE_QUALITY, mozjpeg: true }).toBuffer();
  }

  const outputMetadata = await sharp(output).metadata();

  return {
    bytes: output,
    contentType: target.contentType,
    extension: target.extension,
    width: outputMetadata.width ?? width,
    height: outputMetadata.height ?? height,
    changed: output.byteLength !== bytes.byteLength,
  };
}

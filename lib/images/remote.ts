/**
 * Image delivery rules for the storefront.
 *
 * Product imagery lives in the Supabase `product-images` bucket and is served
 * through `next/image`, which resizes, re-encodes (WebP/AVIF) and lazily
 * loads it. `next/image` refuses to optimise remote hosts that are not listed
 * in `images.remotePatterns`, so every component asks this module whether a
 * source is safe to optimise before handing it over.
 *
 * A source that is NOT provably ours (for example a retailer original kept
 * because rehosting failed) must be rendered with `unoptimized` so next/image
 * never throws at runtime and the raw URL is used as-is.
 */

/**
 * Hosts the Next image optimiser is allowed to fetch from. Keep this list in
 * sync with `images.remotePatterns` in next.config.mjs.
 */
export const OPTIMIZABLE_HOST_PATTERNS = [
  '**.supabase.co',
  'images.unsplash.com',
] as const;

/**
 * Sizes attributes for the storefront image slots.
 *
 * These mirror the CSS grid the images live in, so the browser can pick the
 * smallest candidate that still covers the rendered box.
 */

/** Product card / grid tile. */
export const PRODUCT_CARD_SIZES = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw';

/** PDP hero image (half the page on desktop, full width on mobile). */
export const PDP_HERO_SIZES = '(max-width: 768px) 100vw, 50vw';

/** Gallery thumbnail strip. */
export const THUMBNAIL_SIZES = '80px';

/** Full-view lightbox. */
export const LIGHTBOX_SIZES = '90vw';

/** Small square thumbnail (quick view, cart, fly-to-cart). */
export const SMALL_THUMBNAIL_SIZES = '96px';

/** Category tile. */
export const CATEGORY_SIZES = '(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw';

/** Fixed-width recently-viewed / wishlist strip tile. */
export const STRIP_SIZES = '128px';

/**
 * Convert a hostname pattern (`*` = any run of characters, `**` = any run of
 * characters including dots) into an anchored regular expression.
 */
export function hostPatternToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const source = escaped.replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*');
  return new RegExp(`^${source}$`);
}

export function hostnameMatchesPattern(hostname: string, pattern: string): boolean {
  return hostPatternToRegExp(pattern).test(hostname.toLowerCase());
}

/**
 * True when next/image may optimise this source.
 *
 * - local files under /public are always fine
 * - remote hosts must match OPTIMIZABLE_HOST_PATTERNS
 * - data:/blob: sources are never optimisable
 */
export function canOptimizeImageSrc(src: string | null | undefined): boolean {
  if (!src) return false;
  const value = src.trim();
  if (!value) return false;
  if (value.startsWith('/')) return !value.startsWith('//');
  if (value.startsWith('data:') || value.startsWith('blob:')) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    return OPTIMIZABLE_HOST_PATTERNS.some((pattern) => hostnameMatchesPattern(url.hostname, pattern));
  } catch {
    return false;
  }
}

/**
 * True when the source is a Supabase-hosted product image (the bucket the
 * scraper and the admin uploader write to).
 */
export function isSupabaseImageSrc(src: string | null | undefined): boolean {
  if (!src) return false;
  const value = src.trim();
  if (!value || value.startsWith('/') || value.startsWith('data:')) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && hostnameMatchesPattern(url.hostname, '**.supabase.co');
  } catch {
    return false;
  }
}

/**
 * `unoptimized` value for next/image: only fall back to the raw source when
 * the image is provably not one we can optimise.
 */
export function unoptimizedFor(src: string | null | undefined): boolean {
  return !canOptimizeImageSrc(src);
}

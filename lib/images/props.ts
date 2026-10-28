import {
  CATEGORY_SIZES,
  LIGHTBOX_SIZES,
  PDP_HERO_SIZES,
  PRODUCT_CARD_SIZES,
  SMALL_THUMBNAIL_SIZES,
  STRIP_SIZES,
  THUMBNAIL_SIZES,
  unoptimizedFor,
} from './remote';

/**
 * Single source of truth for how storefront imagery is delivered.
 *
 * Every product image on the site goes through `storefrontImageProps`, so the
 * rules below cannot drift between components:
 *
 *   - every image declares an accurate `sizes` attribute, so the browser only
 *     downloads the candidate it actually needs
 *   - exactly ONE image per page is eager (the PDP hero, which is the LCP
 *     element). Everything else is lazy.
 *   - sources that next/image may not optimise (a retailer original kept
 *     because rehosting failed) fall back to `unoptimized` instead of
 *     throwing at runtime
 */

export type ImageSlot =
  /** PDP hero — the LCP element of a product page. */
  | 'hero'
  /** Product card / listing tile. */
  | 'card'
  /** Gallery thumbnail strip. */
  | 'thumbnail'
  /** Full-view lightbox. */
  | 'lightbox'
  /** Quick-view modal. */
  | 'quickview'
  /** Cart line item. */
  | 'cart'
  /** Recently viewed / wishlist strip. */
  | 'strip'
  /** Category tile. */
  | 'category'
  /** Full-bleed marketing banner. */
  | 'banner';

type SlotConfig = {
  sizes: string;
  priority: boolean;
  fetchPriority?: 'high';
  loading?: 'lazy';
};

const SLOTS: Record<ImageSlot, SlotConfig> = {
  hero: { sizes: PDP_HERO_SIZES, priority: true, fetchPriority: 'high' },
  card: { sizes: PRODUCT_CARD_SIZES, priority: false, loading: 'lazy' },
  thumbnail: { sizes: THUMBNAIL_SIZES, priority: false, loading: 'lazy' },
  lightbox: { sizes: LIGHTBOX_SIZES, priority: false, loading: 'lazy' },
  quickview: { sizes: PDP_HERO_SIZES, priority: false, loading: 'lazy' },
  cart: { sizes: SMALL_THUMBNAIL_SIZES, priority: false, loading: 'lazy' },
  strip: { sizes: STRIP_SIZES, priority: false, loading: 'lazy' },
  category: { sizes: CATEGORY_SIZES, priority: false, loading: 'lazy' },
  banner: { sizes: '100vw', priority: false, loading: 'lazy' },
};

export type StorefrontImageProps = {
  src: string;
  sizes: string;
  priority: boolean;
  loading?: 'lazy';
  fetchPriority?: 'high';
  unoptimized: boolean;
};

/**
 * Delivery props for a storefront image.
 *
 * `alt` is deliberately NOT part of this helper: it stays an explicit JSX
 * attribute on every <Image> so the a11y linter can verify it.
 */
export function storefrontImageProps(src: string, slot: ImageSlot): StorefrontImageProps {
  const config = SLOTS[slot];
  return {
    src,
    sizes: config.sizes,
    priority: config.priority,
    ...(config.fetchPriority ? { fetchPriority: config.fetchPriority } : {}),
    ...(config.loading ? { loading: config.loading } : {}),
    unoptimized: unoptimizedFor(src),
  };
}

/** The slot that is allowed to be eager. Everything else must stay lazy. */
export const EAGER_IMAGE_SLOTS: ImageSlot[] = ['hero'];

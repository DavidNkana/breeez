import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

import {
  EAGER_IMAGE_SLOTS,
  storefrontImageProps,
  type ImageSlot,
} from '../lib/images/props';
import {
  CATEGORY_SIZES,
  LIGHTBOX_SIZES,
  PDP_HERO_SIZES,
  PRODUCT_CARD_SIZES,
  SMALL_THUMBNAIL_SIZES,
  STRIP_SIZES,
  THUMBNAIL_SIZES,
  canOptimizeImageSrc,
  isSupabaseImageSrc,
  unoptimizedFor,
} from '../lib/images/remote';

const SUPABASE_IMAGE =
  'https://abcdefghijklmnop.supabase.co/storage/v1/object/public/product-images/imports/8f0c-import.jpg';

const LAZY_SLOTS: ImageSlot[] = [
  'card',
  'thumbnail',
  'lightbox',
  'quickview',
  'cart',
  'strip',
  'category',
  'banner',
];

test('only the PDP hero is eager — every other storefront image is lazy', () => {
  assert.deepEqual(EAGER_IMAGE_SLOTS, ['hero']);

  const hero = storefrontImageProps(SUPABASE_IMAGE, 'hero');
  assert.equal(hero.priority, true);
  assert.equal(hero.fetchPriority, 'high');
  assert.equal(hero.sizes, PDP_HERO_SIZES);

  for (const slot of LAZY_SLOTS) {
    const props = storefrontImageProps(SUPABASE_IMAGE, slot);
    assert.equal(props.priority, false, `${slot} must not be eager`);
    assert.equal(props.loading, 'lazy', `${slot} must lazy load`);
    assert.equal(props.fetchPriority, undefined, `${slot} must not fetch eagerly`);
  }
});

test('every storefront image declares an accurate sizes attribute', () => {
  assert.equal(storefrontImageProps(SUPABASE_IMAGE, 'card').sizes, '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw');
  assert.equal(storefrontImageProps(SUPABASE_IMAGE, 'hero').sizes, '(max-width: 768px) 100vw, 50vw');
  assert.equal(storefrontImageProps(SUPABASE_IMAGE, 'thumbnail').sizes, '80px');
  assert.equal(storefrontImageProps(SUPABASE_IMAGE, 'lightbox').sizes, '90vw');
  assert.equal(storefrontImageProps(SUPABASE_IMAGE, 'cart').sizes, '96px');
  assert.equal(storefrontImageProps(SUPABASE_IMAGE, 'strip').sizes, '128px');
  assert.equal(storefrontImageProps(SUPABASE_IMAGE, 'category').sizes, CATEGORY_SIZES);

  // The documented sizes constants must not drift from the brief.
  assert.equal(PRODUCT_CARD_SIZES, '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw');
  assert.equal(PDP_HERO_SIZES, '(max-width: 768px) 100vw, 50vw');
  assert.equal(THUMBNAIL_SIZES, '80px');
  assert.equal(LIGHTBOX_SIZES, '90vw');
  assert.equal(SMALL_THUMBNAIL_SIZES, '96px');
  assert.equal(STRIP_SIZES, '128px');
});

test('only Supabase-hosted product images are optimised, foreign hosts fall back', () => {
  assert.equal(canOptimizeImageSrc(SUPABASE_IMAGE), true);
  assert.equal(isSupabaseImageSrc(SUPABASE_IMAGE), true);
  assert.equal(unoptimizedFor(SUPABASE_IMAGE), false);

  assert.equal(canOptimizeImageSrc('/placeholder.svg'), true);
  assert.equal(canOptimizeImageSrc('https://images.unsplash.com/photo-1?w=600'), true);

  // A retailer original kept because rehosting failed is not ours to proxy.
  const foreign = 'https://cdn.fashionworld.co.za/images/full/1234/product.jpg';
  assert.equal(canOptimizeImageSrc(foreign), false);
  assert.equal(isSupabaseImageSrc(foreign), false);
  assert.equal(unoptimizedFor(foreign), true);
  assert.equal(storefrontImageProps(foreign, 'card').unoptimized, true);

  assert.equal(unoptimizedFor('data:image/png;base64,AAAA'), true);
  assert.equal(unoptimizedFor(''), true);
});

const STOREFRONT_IMAGE_COMPONENTS = [
  'components/shop/ProductGallery.tsx',
  'components/shop/ProductCard.tsx',
  'components/shop/ProductQuickView.tsx',
  'components/shop/CartFly.tsx',
  'components/shop/CartItems.tsx',
  'components/shop/RecentlyViewed.tsx',
  'components/shop/CategoryGrid.tsx',
  'app/account/wishlist/page.tsx',
];

test('storefront product imagery goes through next/image, never a raw <img>', async () => {
  for (const file of STOREFRONT_IMAGE_COMPONENTS) {
    const source = await readFile(resolve(file), 'utf8');
    assert.ok(
      !/<img[\s/>]/.test(source),
      `${file} must not render a raw <img> — use next/image`,
    );
    assert.ok(
      source.includes("from 'next/image'"),
      `${file} must import next/image`,
    );
    assert.ok(
      source.includes('storefrontImageProps('),
      `${file} must use the shared storefrontImageProps helper`,
    );
    assert.ok(
      !/\bpriority\b/.test(source),
      `${file} must not set priority directly — only the hero slot may be eager`,
    );
  }
});

test('the brand logo asset is within the payload budget', async () => {
  const bytes = await readFile(resolve('public/brand/evasale-solo-logo.png'));
  assert.ok(bytes.byteLength < 60 * 1024, `brand logo is ${bytes.byteLength} bytes — expected well under 60 KB`);

  const subtext = await readFile(resolve('public/brand/evasale-logo-right-subtext.png'));
  assert.ok(subtext.byteLength < 30 * 1024, `brand subtext logo is ${subtext.byteLength} bytes — expected well under 30 KB`);
});

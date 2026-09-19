import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { assertPublicRedirectTarget, assertPublicUrl, bestSrcsetCandidate, createPinnedLookup, imageFormat, isPrivateIp, normaliseLookupAddresses, parseProduct } from '../app/api/admin/scrape-product/route';
import { resolveImportedCategory } from '../lib/catalog/importer';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

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

test('extracts ordered unique product images and caps them at ten', async () => {
  const html = await readFile(resolve('tests/fixtures/scrape-product-mixed.html'), 'utf8');
  const product = parseProduct(html, 'https://shop.example/products/lily-satin-dress');
  assert.deepEqual(product.images, [
    'https://shop.example/products/lily-front.jpg',
    'https://shop.example/products/lily-back.jpg',
    'https://shop.example/products/lily-gallery-1.jpg',
    'https://shop.example/products/lily-gallery-2.jpg',
    'https://shop.example/products/lily-gallery-3.jpg',
    'https://shop.example/products/lily-gallery-4.jpg',
    'https://shop.example/products/lily-gallery-5.jpg',
    'https://shop.example/products/lily-gallery-6.jpg',
    'https://shop.example/products/lily-gallery-7.jpg',
    'https://shop.example/products/lily-gallery-8.jpg',
  ]);
  assert.equal(product.images.length, 10);
  assert.equal(new Set(product.images).size, product.images.length);
  assert.equal(product.images.some((url) => /logo|banner|recommend|icon/i.test(url)), false);
});

test('uses social image metadata only when no product image is available', () => {
  const product = parseProduct('<meta property="og:title" content="Basic Tee"><meta property="og:image" content="/tee.jpg"><img src="/assets/logo.svg" alt="logo">', 'https://shop.example/tee');
  assert.deepEqual(product.images, ['https://shop.example/tee.jpg']);
});

test('filters unrelated JSON-LD images while retaining a valid product image', () => {
  const product = parseProduct(`
    <script type="application/ld+json">
      {"@type":"Product","name":"Basic Tee","image":["/assets/logo.svg","/assets/site-banner.jpg","/products/basic-tee.jpg"]}
    </script>
  `, 'https://shop.example/tee');
  assert.deepEqual(product.images, ['https://shop.example/products/basic-tee.jpg']);
});

test('filters unrelated social images and keeps a valid OG fallback when no product image exists', () => {
  const product = parseProduct(`
    <meta property="og:image" content="/assets/site-banner.jpg">
    <meta name="twitter:image" content="/assets/twitter-banner.jpg">
    <meta property="og:image:url" content="/assets/basic-tee.jpg">
  `, 'https://shop.example/tee');
  assert.deepEqual(product.images, ['https://shop.example/assets/basic-tee.jpg']);
});

test('does not use social fallback when a valid product image exists', () => {
  const product = parseProduct(`
    <script type="application/ld+json">{"@type":"Product","name":"Basic Tee","image":"/products/basic-tee.jpg"}</script>
    <meta property="og:image" content="/assets/other-product.jpg">
  `, 'https://shop.example/tee');
  assert.deepEqual(product.images, ['https://shop.example/products/basic-tee.jpg']);
});

test('extracts product images from data attributes, srcset, and picture sources', () => {
  const product = parseProduct(`
    <section class="product-gallery">
      <img data-product-image="/products/attribute.jpg" src="/products/thumbnail.jpg">
      <img data-srcset="/products/small.jpg 400w, /products/srcset.jpg 1200w">
      <picture><source srcset="/products/picture-small.jpg 400w, /products/picture.jpg 1200w"><img src="/products/picture-thumb.jpg"></picture>
    </section>
  `, 'https://shop.example/tee');
  assert.deepEqual(product.images, [
    'https://shop.example/products/attribute.jpg',
    'https://shop.example/products/srcset.jpg',
    'https://shop.example/products/picture.jpg',
  ]);
});

test('filters each image candidate before choosing data-src, srcset, and picture fallbacks', async () => {
  const html = await readFile(resolve('tests/fixtures/scrape-product-candidate-filtering.html'), 'utf8');
  const product = parseProduct(html, 'https://shop.example/tee');
  assert.deepEqual(product.images, [
    'https://shop.example/products/data-src-fallback.jpg',
    'https://shop.example/products/srcset-fallback.jpg',
    'https://shop.example/products/picture-fallback.jpg',
    'https://shop.example/products/child.jpg',
    'https://shop.example/products/full-size.jpg',
  ]);
  assert.equal(product.images.includes('https://shop.example/assets/recommendation.jpg'), false);
});

test('keeps a valid generic hero image as the fallback', () => {
  const product = parseProduct('<img class="hero" src="/dress.jpg" alt="Summer dress">', 'https://shop.example/tee');
  assert.deepEqual(product.images, ['https://shop.example/dress.jpg']);
});

test('filters plural unrelated assets from classes and URLs', () => {
  const product = parseProduct(`
    <header><img class="logos" src="/assets/logos.svg"></header>
    <nav><img src="/assets/icons.png"></nav>
    <main><img src="/products/dress.jpg" alt="Dress"></main>
    <aside class="recommendations related-products cross-sells"><img src="/assets/recommendations.jpg"></aside>
    <footer><img src="/assets/banners.jpg"><img src="/assets/footers.png"></footer>
  `, 'https://shop.example/tee');
  assert.deepEqual(product.images, ['https://shop.example/products/dress.jpg']);
});

test('uses the image attribute instead of a non-image parent link', () => {
  const product = parseProduct('<section class="product-gallery"><a href="/products/dress"><img src="/images/dress.jpg" alt="Dress"></a></section>', 'https://shop.example/tee');
  assert.deepEqual(product.images, ['https://shop.example/images/dress.jpg']);
});

test('preserves image order and caps the gallery at ten images', () => {
  const html = Array.from({ length: 12 }, (_, index) => `<img class="hero" src="/images/dress-${index + 1}.jpg">`).join('');
  const product = parseProduct(html, 'https://shop.example/tee');
  assert.deepEqual(product.images, Array.from({ length: 10 }, (_, index) => `https://shop.example/images/dress-${index + 1}.jpg`));
});

test('extracts size and colour dimensions, dedupes combinations, and floors unavailable stock', () => {
  const product = parseProduct(`
    <script type="application/ld+json">
      {"@type":"ProductGroup","name":"Runner","category":"Footwear","hasVariant":[
        {"@type":"Product","name":"Runner M Black","sku":"RUN-M-B","size":"M","color":"Black","offers":{"price":299,"priceCurrency":"ZAR","availability":"https://schema.org/OutOfStock"}},
        {"@type":"Product","name":"Runner M Black duplicate","sku":"RUN-M-B","size":"M","color":"Black","offers":{"price":299,"priceCurrency":"ZAR","availability":"https://schema.org/InStock","inventoryLevel":25}},
        {"@type":"Product","name":"Runner L White","sku":"RUN-L-W","additionalProperty":[{"name":"Size","value":"L"},{"name":"Colour","value":"White"}],"offers":{"price":299,"priceCurrency":"ZAR","inventoryLevel":0}}
      ]}
    </script>
  `, 'https://shop.example/footwear/runner');
  assert.equal(product.category, 'Footwear');
  assert.equal(product.variants.length, 2);
  assert.deepEqual(product.variants[0].options, { Size: 'M', Color: 'Black' });
  assert.deepEqual(product.variants[1].options, { Size: 'L', Color: 'White' });
  assert.deepEqual(product.variants.map((variant) => variant.stock), [10, 10]);
});

test('preserves a credible positive source quantity and maps footwear to Shoes', () => {
  const product = parseProduct(`<script type="application/ld+json">{"@type":"Product","name":"Trainer","category":"Trainers","offers":{"price":100,"priceCurrency":"ZAR","inventoryLevel":42,"sku":"T-1"}}</script>`, 'https://shop.example/shoes/trainer');
  assert.equal(product.variants[0].stock, 42);
  assert.equal(resolveImportedCategory(product.category, [{ id: 'shoes-id', name: 'Shoes', slug: 'shoes' }])?.id, 'shoes-id');
});

test('matches compound category hints to the most specific category', () => {
  const categories = [
    { id: 'women-id', name: 'Women', slug: 'women' },
    { id: 'shoes-id', name: 'Shoes', slug: 'shoes' },
  ];
  assert.equal(resolveImportedCategory('Women’s Shoes', categories)?.id, 'shoes-id');
  assert.equal(resolveImportedCategory('Women', categories)?.id, 'women-id');
  assert.equal(resolveImportedCategory('Fashion World Footwear/Trainers', categories)?.id, 'shoes-id');
});

test('prefers product aliases over competing retailer and department categories', () => {
  const categories = [
    { id: 'fashion-id', name: 'Fashion', slug: 'fashion' },
    { id: 'shoes-id', name: 'Shoes', slug: 'shoes' },
  ];
  assert.equal(resolveImportedCategory('Fashion World Footwear', categories)?.id, 'shoes-id');
  assert.equal(resolveImportedCategory('Fashion World Trainers', categories)?.id, 'shoes-id');
});

test('imports bare Product.offers entries as priced variants without recommendation offers', () => {
  const product = parseProduct(`
    <script type="application/ld+json">
      {
        "@type":"Product",
        "name":"Everyday Runner",
        "offers":[
          {"@type":"Offer","price":299,"priceCurrency":"ZAR","availability":"https://schema.org/InStock"},
          {"@type":"Offer","price":349,"priceCurrency":"ZAR","availability":"https://schema.org/InStock"}
        ],
        "isRelatedTo":{"@type":"Product","name":"Recommended Runner","offers":{"price":99,"priceCurrency":"ZAR","sku":"RECOMMENDED"}}
      }
    </script>
  `, 'https://shop.example/shoes/everyday-runner');
  assert.deepEqual(product.variants.map((variant) => variant.price), [299, 349]);
  assert.deepEqual(product.variants.map((variant) => variant.sku), ['IMPORT-1', 'IMPORT-2']);
  assert.deepEqual(product.variants.map((variant) => variant.options), [{ Variant: '1' }, { Variant: '2' }]);
  assert.equal(product.variants.some((variant) => variant.sku === 'RECOMMENDED'), false);
});

test('extracts selector-only size and colour combinations', async () => {
  const html = await readFile(resolve('tests/fixtures/scrape-product-selector-only.html'), 'utf8');
  const product = parseProduct(html, 'https://shop.example/shoes/everyday-runner');
  assert.deepEqual(product.variants.map((variant) => variant.options), [
    { Size: 'S', Color: 'Black' },
    { Size: 'S', Color: 'White' },
    { Size: 'M', Color: 'Black' },
    { Size: 'M', Color: 'White' },
  ]);
  assert.equal(product.variants.every((variant) => variant.stock >= 10), true);
});

test('keeps embedded recommendations out of the primary product variants', async () => {
  const html = await readFile(resolve('tests/fixtures/scrape-product-embedded-recommendation.html'), 'utf8');
  const product = parseProduct(html, 'https://shop.example/shoes/primary-runner');
  assert.deepEqual(product.variants.map((variant) => variant.sku), ['PRIMARY-BLACK-S', 'PRIMARY-WHITE-M']);
  assert.equal(product.variants.some((variant) => variant.sku === 'RECOMMENDED-RED-L'), false);
});

test('does not force an unknown category to Women', () => {
  assert.equal(resolveImportedCategory('Mystery Department', [{ id: 'w', name: 'Women', slug: 'women' }]), undefined);
});

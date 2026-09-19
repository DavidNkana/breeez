import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { randomUUID } from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
import { Readable } from 'node:stream';
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { requireAdmin } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export type ScrapedProduct = {
  name: string;
  description: string;
  price: number;
  comparePrice: number | null;
  images: string[];
  variants: Array<{
    name: string;
    sku: string;
    options: Record<string, string>;
    price: number;
    stock: number;
  }>;
  warnings?: string[];
  brand?: string;
  sku?: string;
};

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const MAX_PAGE_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGES = 10;

function mappedIpv4(address: string) {
  const lower = address.toLowerCase();
  const dotted = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) return dotted[1];
  const hexadecimal = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (!hexadecimal) return null;
  const first = Number.parseInt(hexadecimal[1], 16);
  const second = Number.parseInt(hexadecimal[2], 16);
  return `${first >> 8}.${first & 255}.${second >> 8}.${second & 255}`;
}

export function isPrivateIp(address: string) {
  if (isIP(address) === 4) {
    const parts = address.split('.').map(Number);
    return parts[0] === 0 || parts[0] === 10 || parts[0] === 127 ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 192 && parts[1] === 0) ||
      (parts[0] === 192 && parts[1] === 2) ||
      (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) ||
      (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19)) ||
      (parts[0] === 198 && parts[1] === 51 && parts[2] === 100) ||
      (parts[0] === 203 && parts[1] === 0 && parts[2] === 113) ||
      parts[0] >= 224;
  }
  const lower = address.toLowerCase();
  // IPv4-mapped IPv6 addresses must be checked as IPv4, not as public IPv6.
  const mapped = mappedIpv4(lower);
  if (mapped) return isPrivateIp(mapped);
  return lower === '::1' || lower === '::' || lower.startsWith('fc') ||
    lower.startsWith('fd') || lower.startsWith('fe8') || lower.startsWith('fe9') ||
    lower.startsWith('fea') || lower.startsWith('feb') || lower.startsWith('ff') ||
    lower.startsWith('2001:db8:');
}

async function assertPublicUrl(value: string) {
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error('Only public http:// or https:// URLs are allowed');
  }
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname === 'metadata.google.internal') {
    throw new Error('Private or internal URLs are not allowed');
  }
  const addresses = isIP(hostname) ? [hostname] : (await lookup(hostname, { all: true })).map((entry) => entry.address);
  if (!addresses.length || addresses.some(isPrivateIp)) throw new Error('Private or internal URLs are not allowed');
  return parsed;
}

export { assertPublicUrl };

export function assertPublicRedirectTarget(location: string, base: URL) {
  return assertPublicUrl(new URL(location, base).toString());
}

type PublicResponse = { response: Response; url: string };

/**
 * Make the socket use the exact public address we validated. Native fetch does
 * not expose a DNS pinning hook, so this uses Node's request API and a lookup
 * callback that only returns the validated address. Redirects remain manual
 * and every target is validated and pinned independently.
 */
async function fetchPublicUrl(value: URL, init: { headers: Record<string, string>; timeoutMs: number }): Promise<PublicResponse> {
  const hostname = value.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(hostname) ? [hostname] : (await lookup(hostname, { all: true })).map((entry) => entry.address);
  if (!addresses.length || addresses.some(isPrivateIp)) throw new Error('Private or internal URLs are not allowed');
  const address = addresses[0];
  const transport = value.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const request = transport.request(value, {
      headers: init.headers,
      lookup: (_hostname, _options, callback) => callback(null, address, isIP(address)),
      servername: isIP(hostname) ? undefined : hostname,
      timeout: init.timeoutMs,
    }, (incoming) => {
      const body = Readable.toWeb(incoming) as ReadableStream<Uint8Array>;
      resolve({ response: new Response(body, { status: incoming.statusCode ?? 502, headers: incoming.headers as Record<string, string> }), url: value.toString() });
    });
    request.once('error', reject);
    request.once('timeout', () => request.destroy(new Error('Request timed out')));
    request.end();
  });
}

async function fetchPublicPage(value: string) {
  let url = await assertPublicUrl(value);
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const { response } = await fetchPublicUrl(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
      timeoutMs: 10_000
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return { response, url: url.toString() };
    const location = response.headers.get('location');
    if (!location) throw new Error('The product page returned an invalid redirect');
    if (redirects === 3) throw new Error('Too many redirects');
    await response.body?.cancel();
    url = await assertPublicRedirectTarget(location, url);
  }
  throw new Error('Too many redirects');
}

async function readLimitedBody(response: Response, maxBytes: number, timeoutMs = 10_000) {
  if (Number(response.headers.get('content-length')) > maxBytes) throw new Error('The response is too large');
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  const read = () => Promise.race([
    reader.read(),
    new Promise<never>((_, reject) => { timer = setTimeout(() => { timedOut = true; reject(new Error('Response body timed out')); }, timeoutMs); })
  ]);
  try {
    while (true) {
      const { done, value } = await read();
      if (timer) clearTimeout(timer);
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel('Response is too large');
        throw new Error('The response is too large');
      }
      chunks.push(value);
    }
  } finally {
    if (timer) clearTimeout(timer);
    if (total > maxBytes || timedOut) await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  const body = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => { body.set(chunk, offset); offset += chunk.byteLength; });
  return body;
}

function text(value: unknown) {
  return typeof value === 'string' ? value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
}

function price(value: unknown) {
  const raw = String(value ?? '').replace(/[^\d.,-]/g, '');
  const normalized = raw.includes('.') && raw.includes(',') ? raw.replace(/,/g, '') : raw.replace(',', '.');
  const parsed = typeof value === 'number' ? value : parseFloat(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function absoluteImages(values: unknown[], pageUrl: string) {
  const urls = values.flatMap((value) => {
    if (typeof value === 'string') return [value];
    if (value && typeof value === 'object' && 'url' in value) return [String(value.url)];
    return [];
  });
  return Array.from(new Set(urls.flatMap((value) => {
    try {
      const resolved = new URL(value.trim(), pageUrl);
      return ['http:', 'https:'].includes(resolved.protocol) ? [resolved.toString()] : [];
    } catch { return []; }
  })));
}

export function bestSrcsetCandidate(value: string) {
  const candidates = value.split(',').map((candidate) => {
    const [url, descriptor] = candidate.trim().split(/\s+/);
    const amount = descriptor ? Number.parseFloat(descriptor) : 0;
    return { url, amount: Number.isFinite(amount) ? amount : 0 };
  }).filter((candidate) => candidate.url);
  return candidates.sort((a, b) => b.amount - a.amount)[0]?.url;
}

function imageCandidates($: cheerio.CheerioAPI) {
  const values: string[] = [];
  const add = (value: string | undefined, srcset = false) => {
    if (!value) return;
    if (srcset) {
      const best = bestSrcsetCandidate(value);
      if (best) values.push(best);
      return;
    }
    values.push(value.trim());
  };
  const selectors = [
    'img', 'picture source',
    '[data-image]', '[data-image-url]', '[data-zoom-image]', '[data-full]',
    '[data-original]', '[data-product-image]', '[data-gallery-image]'
  ].join(',');
  $(selectors).each((_, element) => {
    const node = $(element);
    ['src', 'data-src', 'data-lazy-src', 'data-image', 'data-image-url', 'data-zoom-image', 'data-full', 'data-original', 'data-product-image', 'data-gallery-image'].forEach((attribute) => add(node.attr(attribute)));
    ['srcset', 'data-srcset'].forEach((attribute) => add(node.attr(attribute), true));
    if (node.is('a')) add(node.attr('href'));
  });
  // Some galleries keep the full-size image on an anchor around the thumbnail.
  $('.product-gallery a, .product-images a, [class*="gallery"] a').each((_, element) => add($(element).attr('href')));
  return values;
}

function productSchemas($: cheerio.CheerioAPI) {
  const products: Record<string, unknown>[] = [];
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const value = JSON.parse($(element).contents().text());
      const values = Array.isArray(value) ? value : [value];
      values.forEach((item) => {
        if (item?.['@graph']) values.push(...item['@graph']);
        if (item && (item['@type'] === 'Product' || item['@type']?.includes?.('Product'))) products.push(item);
      });
    } catch { /* Ignore malformed JSON-LD and use the next fallback. */ }
  });
  return products;
}

function stockFromAvailability(value: unknown, index = 0) {
  const availability = String(value ?? '').toLowerCase();
  if (availability.includes('outofstock') || availability.includes('soldout') || availability.includes('discontinued')) return 0;
  if (availability.includes('limited') || availability.includes('lowstock')) return 3;
  return index === 0 ? 10 : 20;
}

function parseProduct(html: string, pageUrl: string): ScrapedProduct {
  const $ = cheerio.load(html);
  const schema = productSchemas($)[0] ?? {};
  const offers = Array.isArray(schema.offers) ? schema.offers : schema.offers ? [schema.offers] : [];
  const firstOffer = offers[0] ?? {};
  const currency = String(firstOffer.priceCurrency ?? '').toUpperCase();
  const schemaPrice = currency === 'ZAR' ? price(firstOffer.price) : null;
  const ogPrice = $('meta[property="product:price:amount"]').attr('content');
  const ogCurrency = String($('meta[property="product:price:currency"]').attr('content') ?? 'ZAR').toUpperCase();
  const basePrice = schemaPrice ?? (ogCurrency === 'ZAR' ? price(ogPrice) : null) ?? price($('.price, .product-price, [itemprop="price"]').first().text());
  const name = text(schema.name) || text($('meta[property="og:title"]').attr('content')) || text($('h1').first().text());
  const description = text(schema.description) || text($('meta[property="og:description"]').attr('content')) || text($('.description, .product-description, [itemprop="description"]').first().text());
  const schemaImages = Array.isArray(schema.image) ? schema.image : schema.image ? [schema.image] : [];
  const imageValues = [...schemaImages];
  $('meta[property="og:image"], meta[property="og:image:url"], meta[name="twitter:image"]').each((_, element) => {
    imageValues.push($(element).attr('content') ?? '');
  });
  imageValues.push(...imageCandidates($));
  const images = absoluteImages(imageValues, pageUrl).slice(0, MAX_IMAGES);
  const variants = offers.filter((offer) => offer !== firstOffer || offers.length > 1).map((offer, index) => ({
    name: text(offer.name) || text(offer.sku) || 'Variant',
    sku: text(offer.sku) || text(schema.sku),
    options: Object.fromEntries((offer.additionalProperty ?? []).filter((property: any) => property?.name && property?.value).map((property: any) => [property.name, property.value])),
    price: price(offer.price) ?? basePrice ?? 0,
    stock: stockFromAvailability(offer.availability, index)
  })).filter((variant) => variant.price > 0);
  const brand = schema.brand && typeof schema.brand === 'object' ? (schema.brand as { name?: unknown }) : undefined;
  const brandName = text(brand?.name);
  return {
    name,
    description,
    price: basePrice ?? 0,
    comparePrice: null,
    images,
    variants: variants.length > 0 ? variants : [{ name: 'Default', sku: text(schema.sku) || `IMPORT-${Date.now().toString(36).toUpperCase()}`, options: {}, price: basePrice ?? 0, stock: stockFromAvailability(firstOffer.availability, 0) }],
    ...(brandName ? { brand: brandName } : {}),
    ...(text(schema.sku) ? { sku: text(schema.sku) } : {})
  };
}

export function imageFormat(contentType: string, bytes: Uint8Array) {
  const type = contentType.toLowerCase().split(';')[0].trim();
  if (type === 'image/jpeg' && bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { type: 'image/jpeg', extension: 'jpg' };
  if (type === 'image/png' && bytes.length >= 8 && bytes.slice(0, 8).every((byte, index) => byte === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index])) return { type: 'image/png', extension: 'png' };
  if (type === 'image/webp' && bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return { type: 'image/webp', extension: 'webp' };
  return null;
}

async function rehostImages(images: string[], pageUrl: string) {
  if (images.length === 0) return { images: [], warnings: [] };
  const admin = createAdminClient();
  const stored: string[] = [];
  const warnings: string[] = [];
  for (const [index, imageUrl] of images.entries()) {
    try {
      let safeUrl = await assertPublicUrl(imageUrl);
      let response: Response | null = null;
      let finalUrl = safeUrl.toString();
      for (let redirects = 0; redirects <= 3; redirects += 1) {
        const fetched = await fetchPublicUrl(safeUrl, {
          headers: { 'User-Agent': USER_AGENT, Referer: pageUrl, Accept: 'image/avif,image/webp,image/*' },
          timeoutMs: 10_000
        });
        response = fetched.response;
        finalUrl = fetched.url;
        if (![301, 302, 303, 307, 308].includes(response.status)) break;
        const location = response.headers.get('location');
        if (!location || redirects === 3) throw new Error('too many redirects');
        await response.body?.cancel();
        safeUrl = await assertPublicRedirectTarget(location, safeUrl);
      }
      if (!response) throw new Error('empty response');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const type = response.headers.get('content-type') ?? '';
      const bytes = await readLimitedBody(response, MAX_IMAGE_BYTES);
      const format = imageFormat(type, bytes);
      if (!format) throw new Error('unsupported or invalid image');
      const path = `imports/${randomUUID()}-${index}.${format.extension}`;
      const { data, error } = await admin.storage.from('product-images').upload(path, Buffer.from(bytes), { contentType: format.type, cacheControl: '31536000', upsert: false });
      if (error || !data) {
        // The migration only installs policies; it does not create the bucket.
        stored.push(finalUrl);
        warnings.push(`Image ${index + 1} kept at its original URL (image storage is unavailable)`);
      } else {
        stored.push(admin.storage.from('product-images').getPublicUrl(data.path).data.publicUrl);
      }
    } catch {
      warnings.push(`Image ${index + 1} could not be imported`);
    }
  }
  return { images: stored, warnings };
}

export async function POST(request: Request) {
  await requireAdmin();

  let body: { url?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 }); }
  if (typeof body.url !== 'string' || !body.url.trim()) return NextResponse.json({ ok: false, error: 'A product URL is required' }, { status: 400 });
  try {
    const url = await assertPublicUrl(body.url.trim());
    const fetched = await fetchPublicPage(url.toString());
    const response = fetched.response;
    if (!response.ok) throw new Error(`Could not fetch the page (HTTP ${response.status})`);
    const finalPageUrl = fetched.url;
    const product = parseProduct(new TextDecoder().decode(await readLimitedBody(response, MAX_PAGE_BYTES)), finalPageUrl);
    if (!product.name) return NextResponse.json({ ok: false, error: 'Could not extract a product name from this page — try a different URL or fill manually' }, { status: 400 });
    const hosted = await rehostImages(product.images, finalPageUrl);
    return NextResponse.json({ ok: true, data: { ...product, images: hosted.images, warnings: hosted.warnings } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not parse this product URL';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

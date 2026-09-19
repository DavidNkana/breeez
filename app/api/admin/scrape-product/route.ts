import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import type { LookupFunction } from 'node:net';
import { randomUUID } from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
import { Readable } from 'node:stream';
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import { requireAdmin } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { IMPORT_STOCK_FLOOR, importedStock } from '@/lib/catalog/importer';

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
  category?: string;
  categoryName?: string;
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

/**
 * dns.lookup({ all: true }) returns AddressInfo objects, but keeping this
 * boundary defensive avoids ever passing an absent address to net.isIP or a
 * pinned socket lookup callback. This also makes the code tolerant of the
 * single-result shape returned by some Node DNS implementations/mocks.
 */
export function normaliseLookupAddresses(result: unknown) {
  const entries = Array.isArray(result) ? result : [result];
  return entries.flatMap((entry) => {
    const address = typeof entry === 'string'
      ? entry
      : entry && typeof entry === 'object' && 'address' in entry && typeof entry.address === 'string'
        ? entry.address
        : null;
    return address && isIP(address) ? [address] : [];
  });
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
  const addresses = isIP(hostname) ? [hostname] : normaliseLookupAddresses(await lookup(hostname, { all: true, verbatim: true }));
  if (!addresses.length || addresses.some(isPrivateIp)) throw new Error('Private or internal URLs are not allowed');
  return parsed;
}

export { assertPublicUrl };

export function assertPublicRedirectTarget(location: string, base: URL) {
  return assertPublicUrl(new URL(location, base).toString());
}

type PublicResponse = { response: Response; url: string };

export function createPinnedLookup(address: string, family: number): LookupFunction {
  return (_hostname, options, callback) => {
    if (options.all) callback(null, [{ address, family }]);
    else callback(null, address, family);
  };
}

/**
 * Make the socket use the exact public address we validated. Native fetch does
 * not expose a DNS pinning hook, so this uses Node's request API and a lookup
 * callback that only returns the validated address. Redirects remain manual
 * and every target is validated and pinned independently.
 */
async function fetchPublicUrl(value: URL, init: { headers: Record<string, string>; timeoutMs: number }): Promise<PublicResponse> {
  const hostname = value.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(hostname) ? [hostname] : normaliseLookupAddresses(await lookup(hostname, { all: true, verbatim: true }));
  if (!addresses.length || addresses.some(isPrivateIp)) throw new Error('Private or internal URLs are not allowed');
  const address = addresses[0];
  const family = isIP(address);
  if (!family) throw new Error('Private or internal URLs are not allowed');
  const transport = value.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const request = transport.request(value, {
      headers: init.headers,
      lookup: createPinnedLookup(address, family),
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

/** Prices in schema.org and HTML metadata are rand, while *_cents fields are cents. */
function price(value: unknown, unit: 'rand' | 'cents' = 'rand') {
  if (value == null || value === '') return null;
  if (unit === 'cents' && typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value / 100 : null;
  }
  const source = String(value).trim();
  const raw = source.replace(/[^\d.,-]/g, '').replace(/\s/g, '');
  if (!raw) return null;
  let normalized = raw;
  if (raw.includes('.') && raw.includes(',')) {
    normalized = raw.lastIndexOf(',') > raw.lastIndexOf('.')
      ? raw.replace(/\./g, '').replace(',', '.')
      : raw.replace(/,/g, '');
  } else if (raw.includes(',')) {
    const parts = raw.split(',');
    normalized = parts.length === 2 && parts[1].length === 2
      ? `${parts[0].replace(/\./g, '')}.${parts[1]}`
      : raw.replace(/,/g, '');
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return unit === 'cents' ? parsed / 100 : parsed;
}

function sourcePrice(value: Record<string, any>, key: string) {
  const centsKey = `${key}_cents`;
  const camelCentsKey = `${key}Cents`;
  return price(value[centsKey], 'cents') ?? price(value[camelCentsKey], 'cents') ?? price(value[key]);
}

type PriceSnapshot = { current: number | null; compare: number | null };

function priceSnapshot(value: Record<string, any>): PriceSnapshot {
  const specification = value.priceSpecification && typeof value.priceSpecification === 'object' ? value.priceSpecification : {};
  const current = ['salePrice', 'sale_price', 'sellingPrice', 'selling_price', 'currentPrice', 'current_price', 'price', 'lowPrice', 'minPrice']
    .map((key) => sourcePrice(value, key)).find((candidate): candidate is number => candidate != null)
    ?? sourcePrice(specification, 'price');
  const compare = ['comparePrice', 'compare_price', 'regularPrice', 'regular_price', 'originalPrice', 'original_price', 'listPrice', 'list_price', 'wasPrice', 'was_price', 'highPrice', 'maxPrice']
    .map((key) => sourcePrice(value, key)).find((candidate): candidate is number => candidate != null) ?? null;
  return { current, compare };
}

function positivePrice(value: number | null | undefined) {
  return value != null && Number.isFinite(value) && value > 0 ? value : null;
}

export function scrapedProductPriceError(product: Pick<ScrapedProduct, 'price'>) {
  return positivePrice(product.price)
    ? null
    : 'Could not detect a valid positive ZAR price on this product page — fill the price manually';
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

function relevantImageUrls(values: unknown[], pageUrl: string) {
  return absoluteImages(values, pageUrl).filter((value) => !imageIsUnrelated('', value));
}

export function bestSrcsetCandidate(value: string) {
  const candidates = value.split(',').map((candidate) => {
    const [url, descriptor] = candidate.trim().split(/\s+/);
    const amount = descriptor ? Number.parseFloat(descriptor) : 0;
    return { url, amount: Number.isFinite(amount) ? amount : 0 };
  }).filter((candidate) => candidate.url);
  return candidates.sort((a, b) => b.amount - a.amount)[0]?.url;
}

const unrelatedImageToken = /(?:^|[-_\s/])(?:logo(?:s)?|banner(?:s)?|recommend(?:ation|ations)?|related|cross[-_ ]?sell(?:s|ing)?|upsell(?:s)?|icon(?:s)?|avatar(?:s)?|sprite(?:s)?|tracking|pixel(?:s)?|spinner(?:s)?|placeholder(?:s)?|header(?:s)?|nav(?:s|bar|bars|igation|igations)?|footer(?:s)?)(?:[-_\s/.]|$)/i;
const productImageToken = /(?:product|gallery|pdp|productview|product-view|media-gallery|product-media|zoom|fotorama|main-image|detail-image|carousel|swiper)/i;
const imageAttributes = ['data-zoom-image', 'data-full', 'data-original', 'data-product-image', 'data-gallery-image', 'data-image', 'data-image-url', 'data-src', 'data-lazy-src', 'src'];
const imageElementSelectors = ['img', 'picture source', '[srcset]', '[data-srcset]', '[data-image]', '[data-image-url]', '[data-zoom-image]', '[data-full]', '[data-original]', '[data-product-image]', '[data-gallery-image]', '[data-src]', '[data-lazy-src]'];
const imageUrlPattern = /\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#]|$)/i;

type ImageCandidate = { value: string; score: number };

function imageContext($: cheerio.CheerioAPI, element: AnyNode) {
  const parts: string[] = [];
  let current: AnyNode | null = element;
  for (let depth = 0; current && current.type === 'tag' && depth < 5; depth += 1) {
    const node = $(current);
    parts.push(current.name, node.attr('id') ?? '', node.attr('class') ?? '', node.attr('alt') ?? '', node.attr('title') ?? '', node.attr('itemprop') ?? '');
    current = current.parent;
  }
  return parts.join(' ').toLowerCase();
}

function imageIsUnrelated(context: string, value: string) {
  return unrelatedImageToken.test(`${context} ${value}`);
}

function isImageUrl(value: string) {
  try {
    const resolved = new URL(value.trim(), 'https://image.invalid');
    return imageUrlPattern.test(resolved.pathname + resolved.search);
  } catch {
    return false;
  }
}

function srcsetCandidates(value: string) {
  return value.split(',').map((candidate) => {
    const [url, descriptor] = candidate.trim().split(/\s+/);
    const amount = descriptor ? Number.parseFloat(descriptor) : 0;
    return { url, amount: Number.isFinite(amount) ? amount : 0 };
  }).filter((candidate) => candidate.url);
}

function imageAttributeValues($: cheerio.CheerioAPI, element: AnyNode) {
  const node = $(element);
  const srcsets = [node.attr('data-srcset'), node.attr('srcset')].filter((value): value is string => Boolean(value?.trim()));
  if (node.is('img')) {
    node.closest('picture').find('source').each((_, source) => {
      const sourceNode = $(source);
      const sourceSrcset = sourceNode.attr('data-srcset') ?? sourceNode.attr('srcset');
      if (sourceSrcset?.trim()) srcsets.push(sourceSrcset);
    });
  }
  const values = [
    ...srcsets.flatMap((srcset) => srcsetCandidates(srcset).map((candidate) => candidate.url.trim())),
    ...imageAttributes.filter((attribute) => attribute !== 'src').map((attribute) => node.attr(attribute)),
    node.attr('src'),
  ].filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim());
  return { values, hasImageAttribute: values.length > 0, srcsets };
}

function bestRelevantImageValue(values: string[], context: string) {
  return values.find((value) => !imageIsUnrelated(context, value));
}

function bestRelevantSrcsetValue(srcsets: string[], context: string) {
  for (const srcset of srcsets) {
    const candidate = srcsetCandidates(srcset)
      .filter(({ url }) => !imageIsUnrelated(context, url))
      .sort((a, b) => b.amount - a.amount)[0];
    if (candidate) return candidate.url.trim();
  }
  return undefined;
}

function imageCandidates($: cheerio.CheerioAPI): ImageCandidate[] {
  const candidates: ImageCandidate[] = [];
  const selectors = imageElementSelectors.join(',');

  $(selectors).each((_, element) => {
    const node = $(element);
    const context = imageContext($, element);
    const { values, srcsets } = imageAttributeValues($, element);
    const parentLink = node.closest('a').attr('href');
    const score = (productImageToken.test(context) ? 10 : 0) + (node.attr('itemprop') === 'image' ? 5 : 0);
    const value = bestRelevantSrcsetValue(srcsets, context) ?? bestRelevantImageValue(values, context);
    if (value && score > 0) candidates.push({ value: value.trim(), score });
    if (parentLink && isImageUrl(parentLink) && !imageIsUnrelated(context, parentLink) && score > 0) {
      candidates.push({ value: parentLink.trim(), score });
    }
  });

  // A few older themes expose only the full-size URL on gallery anchors.
  $('.product-gallery a, .product-images a, [class*="gallery"] a, [id*="gallery"] a').each((_, element) => {
    const value = $(element).attr('href');
    const context = imageContext($, element);
    if (value && isImageUrl(value) && !imageIsUnrelated(context, value)) candidates.push({ value: value.trim(), score: 10 });
  });
  return candidates;
}

function genericImageCandidates($: cheerio.CheerioAPI) {
  const candidates: ImageCandidate[] = [];
  $(imageElementSelectors.join(',')).each((_, element) => {
    const context = imageContext($, element);
    const { values, srcsets } = imageAttributeValues($, element);
    const node = $(element);
    const parentLink = node.closest('a').attr('href');
    const value = bestRelevantSrcsetValue(srcsets, context) ?? bestRelevantImageValue(values, context);
    if (value) candidates.push({ value: value.trim(), score: productImageToken.test(context) ? 10 : 0 });
    if (parentLink && isImageUrl(parentLink) && !imageIsUnrelated(context, parentLink)) {
      candidates.push({ value: parentLink.trim(), score: productImageToken.test(context) ? 10 : 0 });
    }
  });
  return candidates;
}

function productSchemas($: cheerio.CheerioAPI) {
  const products: Record<string, unknown>[] = [];
  $('script[type="application/ld+json"], script[type="application/json"]').each((_, element) => {
    try {
      const value = JSON.parse($(element).contents().text());
      const values = Array.isArray(value) ? value : [value];
      values.forEach((item) => {
        if (item?.['@graph']) values.push(...item['@graph']);
        if (item && (item['@type'] === 'Product' || item['@type']?.includes?.('Product') || item['@type'] === 'ProductGroup')) products.push(item);
      });
    } catch { /* Ignore malformed JSON-LD and use the next fallback. */ }
  });
  return products;
}

function stockFromAvailability(value: unknown, index = 0) {
  const availability = String(value ?? '').toLowerCase();
  if (availability.includes('limited') || availability.includes('lowstock')) return IMPORT_STOCK_FLOOR;
  const quantity = typeof value === 'object' && value !== null
    ? (value as { inventoryLevel?: unknown; stock?: unknown; quantity?: unknown }).inventoryLevel ?? (value as { stock?: unknown }).stock ?? (value as { quantity?: unknown }).quantity
    : null;
  if (quantity != null) return importedStock(quantity);
  return importedStock(index === 0 ? 10 : 20);
}

function schemaValues(value: unknown): Record<string, string> {
  const options: Record<string, string> = {};
  const add = (key: unknown, val: unknown) => {
    const name = text(key).replace(/\s+/g, ' ').trim();
    const option = text(val).replace(/\s+/g, ' ').trim();
    if (name && option && name.length < 40 && option.length < 100) {
      const normalizedName = /^size$/i.test(name) ? 'Size' : /^(colou?r)$/i.test(name) ? 'Color' : name;
      options[normalizedName] = option;
    }
  };
  if (Array.isArray(value)) value.forEach((item) => Object.assign(options, schemaValues(item)));
  if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>;
    if (item.name && (item.value ?? item.propertyValue)) add(item.name, item.value ?? item.propertyValue);
    ['size', 'Size', 'color', 'Color', 'colour', 'Colour', 'variantSize', 'variantColor', 'colorName', 'colourName'].forEach((key) => {
      if (item[key] != null) add(key.replace(/^variant/i, ''), item[key]);
    });
  }
  return options;
}

type SelectorGroup = { name: string; values: string[] };

function selectorLabel($: cheerio.CheerioAPI, node: cheerio.Cheerio<AnyNode>) {
  const id = node.attr('id');
  const context = text(node.parent().text()).slice(0, 180);
  return text(
    (id ? $(`label[for="${id}"]`).first().text() : '') ||
    node.attr('data-option-name') || node.attr('data-option') || node.attr('aria-label') ||
    node.prev('label').text() || node.closest('fieldset').find('legend').first().text() ||
    node.find('label').first().text() || context.match(/(size|colou?r)\s*:/i)?.[1] || ''
  ).replace(/:$/, '').trim();
}

function selectorGroups($: cheerio.CheerioAPI): SelectorGroup[] {
  const groups: SelectorGroup[] = [];
  const addGroup = (label: string, values: string[]) => {
    const name = label.replace(/colour/i, 'Color').trim();
    const cleaned = Array.from(new Set(values.map((value) => text(value)).filter(Boolean)));
    if (/size|colou?r/i.test(name) && cleaned.length > 0 && !groups.some((group) => group.name === name && group.values.join('|') === cleaned.join('|'))) {
      groups.push({ name, values: cleaned });
    }
  };

  $('select').each((_, element) => {
    const node = $(element);
    addGroup(selectorLabel($, node), node.find('option').toArray().filter((option) => !$(option).prop('disabled')).map((option) => text($(option).text()) || $(option).attr('value') || ''));
  });
  $('[role="radiogroup"], .swatches, .swatch-group, [data-option-name], [data-option]').each((_, element) => {
    const node = $(element);
    const values = node.find('[data-value], [value], [aria-label]').toArray().map((option) => $(option).attr('data-value') || $(option).attr('value') || $(option).attr('aria-label') || text($(option).text()));
    addGroup(selectorLabel($, node), values);
  });
  return groups;
}

function selectorCombinations($: cheerio.CheerioAPI) {
  return selectorGroups($).reduce<Record<string, string>[]>((combinations, group) =>
    combinations.flatMap((combination) => group.values.map((value) => ({ ...combination, [group.name]: value }))), [{}]);
}

function variantObjects($: cheerio.CheerioAPI, schema: Record<string, any>) {
  const values: Record<string, any>[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== 'object') return;
    const item = value as Record<string, any>;
    if (item.sku || item.offers || item.itemOffered || item.variation || item.options || item.additionalProperty) values.push(item);
    if (item.hasVariant) visit(item.hasVariant);
    if (item.variants) visit(item.variants);
    if (item.offers && !Array.isArray(item.offers) && typeof item.offers === 'object') visit(item.offers);
  };
  visit(schema.hasVariant);
  // JSON-LD permits Product.offers to be an array of bare Offer objects.
  // Those objects commonly have only price/currency/availability, so they
  // need to be treated as variants even without SKU or option fields.
  const visitOffers = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(visitOffers);
    if (!value || typeof value !== 'object') return;
    const item = value as Record<string, any>;
    if (item.price != null || item.priceSpecification || item.availability || item.itemOffered) values.push(item);
  };
  visitOffers(schema.offers);

  const excludedContext = (path: string[]) => /recommend|related|cross[-_ ]?sell|upsell|widget|carousel|also[-_ ]?bought/i.test(path.join(' '));
  const productRoot = (value: unknown, path: string[] = []): unknown[] => {
    if (!value || typeof value !== 'object' || excludedContext(path)) return [];
    if (Array.isArray(value)) return value.flatMap((item, index) => productRoot(item, [...path, String(index)]));
    const item = value as Record<string, any>;
    const type = Array.isArray(item['@type']) ? item['@type'].join(' ') : String(item['@type'] ?? '');
    if (/product(group)?/i.test(type)) return [item];
    const primaryKeys = ['product', 'productData', 'productDetail', 'productDetails', 'primaryProduct'];
    const roots = primaryKeys.flatMap((key) => productRoot(item[key], [...path, key]));
    if (roots.length) return roots;
    if ((item.variants || item.productVariants || item.hasVariant) && (item.name || item.sku || item.id)) return [item];
    return [];
  };
  $('script').each((_, element) => {
    const type = String($(element).attr('type') ?? '').toLowerCase();
    if (!type.includes('json') && !$(element).attr('id')?.match(/product|variant|next/i)) return;
    const visitEmbedded = (value: unknown, path: string[] = []) => {
      if (excludedContext(path)) return;
      if (Array.isArray(value)) return value.forEach((item) => visitEmbedded(item, path));
      if (!value || typeof value !== 'object') return;
      const item = value as Record<string, any>;
      const hasOptionData = item.options || item.variation || item.additionalProperty || item.size || item.color || item.colour || item.variantSize || item.variantColor;
      if (item.sku && hasOptionData) values.push(item);
      ['variants', 'productVariants', 'hasVariant', 'offers'].forEach((key) => visitEmbedded(item[key], [...path, key]));
    };
    try {
      const parsed = JSON.parse($(element).contents().text());
      productRoot(parsed).forEach((root) => visitEmbedded(root));
    } catch { /* non-JSON scripts */ }
  });
  return values;
}

function categoryHint($: cheerio.CheerioAPI, schema: Record<string, any>, pageUrl: string) {
  const values: string[] = [];
  const add = (value: unknown) => { const result = text(value); if (result && result.length < 100) values.push(result); };
  add(schema.category);
  const breadcrumb = schema.breadcrumb?.itemListElement;
  if (Array.isArray(breadcrumb)) breadcrumb.forEach((item: any) => add(item.name ?? item.item?.name));
  $('meta[property="product:category"], meta[name="category"], meta[property="og:category"], [itemprop="category"]').each((_, element) => add($(element).attr('content') ?? $(element).text()));
  $('[class*="breadcrumb"], [id*="breadcrumb"], nav[aria-label*="breadcrumb" i]').first().find('a, span, li').each((_, element) => add($(element).text()));
  try { new URL(pageUrl).pathname.split('/').filter(Boolean).slice(0, -1).forEach((part) => add(decodeURIComponent(part).replace(/[-_]+/g, ' '))); } catch { /* URL already validated */ }
  return values.find((value) => /shoe|footwear|trainer|dress|top|women|men|kid|bag|home|kitchen|curtain|bath|apparel|clothing/i.test(value)) ?? values[0];
}

function variantOptionValues(item: Record<string, any>, selectorOptions: Record<string, string> = {}) {
  const options = { ...selectorOptions, ...schemaValues(item), ...schemaValues(item.additionalProperty), ...schemaValues(item.variation), ...schemaValues(item.options), ...schemaValues(item.itemOffered) };
  const name = text(item.name);
  if (name) {
    for (const dimension of ['Size', 'Color']) {
      const match = name.match(new RegExp(`(?:${dimension}|${dimension === 'Color' ? 'Colour' : ''})\\s*[:/-]\\s*([A-Za-z0-9+ -]+)`, 'i'));
      if (match && !options[dimension]) options[dimension] = match[1].trim();
    }
  }
  return options;
}

export function parseProduct(html: string, pageUrl: string): ScrapedProduct {
  const $ = cheerio.load(html);
  const schema = productSchemas($)[0] ?? {};
  const offers = variantObjects($, schema);
  const selectors = selectorCombinations($);
  const firstOffer = offers[0] ?? {};
  const firstOfferData = firstOffer.itemOffered && typeof firstOffer.itemOffered === 'object' ? firstOffer.itemOffered : firstOffer;
  const schemaOffers = [schema.offers].flatMap((value) => Array.isArray(value) ? value : [value])
    .filter((value): value is Record<string, any> => Boolean(value && typeof value === 'object'));
  const nestedOfferRecords = [...schemaOffers, ...offers].flatMap((record) => {
    const nested = record.offers;
    return nested && typeof nested === 'object' ? (Array.isArray(nested) ? nested : [nested]) : [];
  });
  // Keep product-level prices separate from variant offers. A Product price (or
  // an AggregateOffer on Product.offers) describes the product's advertised
  // base price and must not be replaced by the cheapest variant offer.
  const priceRecords = [...nestedOfferRecords, ...schemaOffers, ...offers, schema, firstOfferData]
    .filter((value): value is Record<string, any> => Boolean(value && typeof value === 'object'));
  const isZar = (value: Record<string, any>) => {
    const currency = String(value.priceCurrency ?? value.priceSpecification?.priceCurrency ?? '').toUpperCase();
    return !currency || currency === 'ZAR' || currency === 'ZAR ';
  };
  const snapshots = priceRecords.filter(isZar).map(priceSnapshot);
  const currentPrices = snapshots.map((snapshot) => snapshot.current).filter((candidate): candidate is number => candidate != null);
  const comparePrices = snapshots.map((snapshot) => snapshot.compare).filter((candidate): candidate is number => candidate != null);
  const schemaPrice = currentPrices.length > 0 ? Math.min(...currentPrices) : null;
  const schemaCompare = comparePrices.length > 0 ? Math.max(...comparePrices) : null;
  const productRecords = [
    schema,
    ...schemaOffers.filter((record) => !Array.isArray(schema.offers) && record === schema.offers),
  ].filter(isZar);
  const productSnapshots = productRecords.map(priceSnapshot);
  const productPrice = productSnapshots
    .map((snapshot) => snapshot.current)
    .find((candidate): candidate is number => candidate != null) ?? null;
  const productCompare = productSnapshots
    .map((snapshot) => snapshot.compare)
    .find((candidate): candidate is number => candidate != null) ?? null;
  const metaValue = (...selectors: string[]) => selectors.map((selector) => $(selector).first().attr('content')).map((value) => price(value)).find((candidate): candidate is number => candidate != null);
  const ogPrice = metaValue('meta[property="product:price:sale_price"]', 'meta[property="product:price:amount"]', 'meta[property="og:price:amount"]');
  const ogRegularPrice = metaValue('meta[property="product:price:original"]', 'meta[property="product:price:regular_price"]', 'meta[property="product:original_price"]');
  const ogCurrency = String($('meta[property="product:price:currency"], meta[property="og:price:currency"]').first().attr('content') ?? 'ZAR').toUpperCase();
  const visibleSale = price($('.sale-price, .price--sale, .special-price, [class*="sale-price"], [class*="selling-price"]').first().text());
  const visibleRegular = price($('.was-price, .old-price, .regular-price, .original-price, [class*="was-price"], [class*="old-price"]').first().text());
  const visiblePrice = price($('.price, .product-price, [itemprop="price"]').first().text());
  const basePrice = positivePrice(productPrice) ?? (ogCurrency === 'ZAR' ? positivePrice(ogPrice) : null) ?? positivePrice(visibleSale) ?? positivePrice(visiblePrice) ?? positivePrice(schemaPrice);
  const comparePrice = [productCompare, schemaCompare, ogRegularPrice, visibleRegular].map((candidate) => positivePrice(candidate))
    .find((candidate): candidate is number => candidate != null && basePrice != null && candidate > basePrice) ?? null;
  const name = text(schema.name) || text($('meta[property="og:title"]').attr('content')) || text($('h1').first().text());
  const description = text(schema.description) || text($('meta[property="og:description"]').attr('content')) || text($('.description, .product-description, [itemprop="description"]').first().text());
  const schemaImages = Array.isArray(schema.image) ? schema.image : schema.image ? [schema.image] : [];
  const scopedImages = imageCandidates($);
  const productImages = [...relevantImageUrls(schemaImages, pageUrl), ...scopedImages.map((candidate) => candidate.value)];
  const genericImages = productImages.length === 0 ? genericImageCandidates($).map((candidate) => candidate.value) : [];
  const imageValues = productImages.length > 0 ? productImages : genericImages;
  if (imageValues.length === 0) {
    $('meta[property="og:image"], meta[property="og:image:url"], meta[name="twitter:image"]').each((_, element) => {
      const value = $(element).attr('content');
      if (value && !imageIsUnrelated('', value)) imageValues.push(value);
    });
  }
  const images = absoluteImages(imageValues, pageUrl).slice(0, MAX_IMAGES);
  const seen = new Set<string>();
  const sourceVariants: Record<string, any>[] = offers.length > 0 ? offers : selectors.map((options, index) => ({ options, sku: `IMPORT-${index + 1}` }));
  const variants = sourceVariants.map((offer, index) => {
    const data = {
      ...offer,
      ...(offer.itemOffered && typeof offer.itemOffered === 'object' ? offer.itemOffered : {}),
      ...(offer.offers && typeof offer.offers === 'object' && !Array.isArray(offer.offers) ? offer.offers : {})
    };
    // A selector group describes the available combinations, not one option
    // to copy onto every embedded variant. Only align it by index when the
    // page exposes the same number of variants; selector-only pages use the
    // synthetic sources above instead.
    const selectorOptions = selectors.length === offers.length ? selectors[index] : {};
    const options = variantOptionValues(data, selectorOptions);
    const sku = text(data.sku) || text(offer.sku) || (offers.length === 1 ? text(schema.sku) : '') || `IMPORT-${index + 1}`;
    const combination = Object.entries(options).sort().map(([k, v]) => `${k}:${v}`).join('|');
    const key = (combination || sku).toLowerCase();
    if (seen.has(key)) return null;
    seen.add(key);
    const rawStock = data.inventoryLevel ?? data.inventoryQuantity ?? data.stock ?? data.quantity;
    const generatedName = `${name || 'Product'} Variant ${index + 1}`;
    const resolvedOptions = Object.keys(options).length > 0 ? options : { Variant: String(index + 1) };
    return {
      name: text(data.name) || text(data.sku) || generatedName,
      sku,
      options: resolvedOptions,
      price: priceSnapshot(data).current ?? priceSnapshot(offer).current ?? basePrice ?? 0,
      stock: rawStock != null ? importedStock(rawStock) : stockFromAvailability(data.availability ?? offer.availability, index)
    };
  }).filter((variant): variant is NonNullable<typeof variant> => Boolean(variant && variant.price > 0));
  const brand = schema.brand && typeof schema.brand === 'object' ? (schema.brand as { name?: unknown }) : undefined;
  const brandName = text(brand?.name);
  const category = categoryHint($, schema, pageUrl);
  return {
    name,
    description,
    price: basePrice ?? 0,
    comparePrice,
    images,
    variants: variants.length > 0 ? variants : [{ name: 'Default', sku: text(schema.sku) || `IMPORT-${Date.now().toString(36).toUpperCase()}`, options: {}, price: basePrice ?? 0, stock: stockFromAvailability(firstOffer.availability, 0) }],
    ...(brandName ? { brand: brandName } : {}),
    ...(category ? { category, categoryName: category } : {}),
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
    const priceError = scrapedProductPriceError(product);
    if (priceError) return NextResponse.json({ ok: false, error: priceError }, { status: 400 });
    const hosted = await rehostImages(product.images, finalPageUrl);
    return NextResponse.json({ ok: true, data: { ...product, images: hosted.images, warnings: hosted.warnings } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not parse this product URL';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

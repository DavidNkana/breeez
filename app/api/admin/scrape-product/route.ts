import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { requireAdmin } from '@/lib/auth/session';

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
  brand?: string;
  sku?: string;
};

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

function isPrivateIp(address: string) {
  if (isIP(address) === 4) {
    const parts = address.split('.').map(Number);
    return parts[0] === 0 || parts[0] === 10 || parts[0] === 127 ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) ||
      (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19)) ||
      parts[0] >= 224;
  }
  const lower = address.toLowerCase();
  return lower === '::1' || lower === '::' || lower.startsWith('fc') ||
    lower.startsWith('fd') || lower.startsWith('fe8') || lower.startsWith('fe9') ||
    lower.startsWith('fea') || lower.startsWith('feb');
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

async function fetchPublicPage(value: string) {
  let url = await assertPublicUrl(value);
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const response = await fetch(url, {
      redirect: 'manual',
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(10_000)
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get('location');
    if (!location) throw new Error('The product page returned an invalid redirect');
    if (redirects === 3) throw new Error('Too many redirects');
    url = await assertPublicUrl(new URL(location, url).toString());
  }
  throw new Error('Too many redirects');
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
  return Array.from(new Set(urls.filter((value) => {
    try { return ['http:', 'https:'].includes(new URL(value, pageUrl).protocol) && /^https?:\/\//i.test(value); } catch { return false; }
  })));
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

function stockFromAvailability(value: unknown) {
  const availability = String(value ?? '').toLowerCase();
  return availability.includes('outofstock') || availability.includes('soldout') ? 0 : 10;
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
  const images = absoluteImages(schemaImages, pageUrl);
  const ogImage = $('meta[property="og:image"]').attr('content');
  if (ogImage && /^https?:\/\//i.test(ogImage) && !images.includes(ogImage)) images.push(ogImage);
  if (images.length === 0) {
    $('img').each((_, image) => {
      const value = $(image).attr('src') || $(image).attr('data-src');
      if (value && /^https?:\/\//i.test(value) && !images.includes(value)) images.push(value);
    });
  }
  const variants = offers.filter((offer) => offer !== firstOffer || offers.length > 1).map((offer) => ({
    name: text(offer.name) || text(offer.sku) || 'Variant',
    sku: text(offer.sku) || text(schema.sku),
    options: Object.fromEntries((offer.additionalProperty ?? []).filter((property: any) => property?.name && property?.value).map((property: any) => [property.name, property.value])),
    price: price(offer.price) ?? basePrice ?? 0,
    stock: stockFromAvailability(offer.availability)
  })).filter((variant) => variant.price > 0);
  const brand = schema.brand && typeof schema.brand === 'object' ? (schema.brand as { name?: unknown }) : undefined;
  const brandName = text(brand?.name);
  return {
    name,
    description,
    price: basePrice ?? 0,
    comparePrice: null,
    images,
    variants: variants.length > 0 ? variants : [{ name: 'Default', sku: text(schema.sku) || `IMPORT-${Date.now().toString(36).toUpperCase()}`, options: {}, price: basePrice ?? 0, stock: stockFromAvailability(firstOffer.availability) }],
    ...(brandName ? { brand: brandName } : {}),
    ...(text(schema.sku) ? { sku: text(schema.sku) } : {})
  };
}

export async function POST(request: Request) {
  await requireAdmin();

  let body: { url?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 }); }
  if (typeof body.url !== 'string' || !body.url.trim()) return NextResponse.json({ ok: false, error: 'A product URL is required' }, { status: 400 });
  try {
    const url = await assertPublicUrl(body.url.trim());
    const response = await fetchPublicPage(url.toString());
    if (!response.ok) throw new Error(`Could not fetch the page (HTTP ${response.status})`);
    const product = parseProduct(await response.text(), url.toString());
    if (!product.name) return NextResponse.json({ ok: false, error: 'Could not extract a product name from this page — try a different URL or fill manually' }, { status: 400 });
    return NextResponse.json({ ok: true, data: product });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not parse this product URL';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

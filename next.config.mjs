/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // For Capacitor native apps: we point server.url at the live Vercel
  // deployment, so we don't need static export. The native app just
  // loads our deployed site in a webview. All SSR features (auth,
  // checkout, server actions) work normally because the webview loads
  // the live site.
  images: {
    // Product imagery lives in the Supabase `product-images` bucket and is
    // served through /_next/image. The optimiser resizes and re-encodes it,
    // so a 6 MB retailer original becomes a ~40 KB WebP.
    //
    // `**` covers every Supabase project ref (and any subdomain depth).
    // Keep this list in sync with OPTIMIZABLE_HOST_PATTERNS in
    // lib/images/remote.ts — sources outside it must be rendered with
    // `unoptimized` so next/image never throws on an unknown host.
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
    ],
    // WebP only: single format keeps the optimiser cache to one entry per
    // (url, width, quality) and encodes fast enough for cold cache misses.
    // AVIF is a ~20% further win but doubles the encoder work per variant.
    formats: ['image/webp'],
    // The default ladder jumps 1200 -> 1920, which overshoots a full-bleed
    // banner or the PDP lightbox on a 1440px screen. 1440 keeps those honest.
    deviceSizes: [640, 750, 828, 1080, 1200, 1440, 1920, 2048, 3840],
    // How long a browser may reuse an optimised variant without revalidating.
    // NOTE: the optimiser caches by source URL, so after running the image
    // backfill (scripts/optimize-product-images.ts) the cached variants of
    // the rewritten files stay stale for up to this long.
    minimumCacheTTL: 3600,
    // SVG sources are served as-is by next/image (it detects the .svg
    // extension and skips the proxy), so dangerouslyAllowSVG stays off.
    dangerouslyAllowSVG: false,
  },
  poweredByHeader: false
};

export default nextConfig;

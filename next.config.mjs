/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // For Capacitor native apps: we point server.url at the live Vercel
  // deployment, so we don't need static export. The native app just
  // loads our deployed site in a webview. All SSR features (auth,
  // checkout, server actions) work normally because the webview loads
  // the live site.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' }
    ]
  },
  poweredByHeader: false
};

export default nextConfig;
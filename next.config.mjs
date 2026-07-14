/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' }
    ]
  },
  // Note: For Capacitor we use 'export' (static) output.
  // Once Supabase + auth callbacks need server-side runtime,
  // switch to standalone + SSR. Tracked in implementation plan.
};

export default nextConfig;
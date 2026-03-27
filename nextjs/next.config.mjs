/** @type {import('next').NextConfig} */

// In dev: proxy /api → localhost:4000
// In prod (Vercel): Automatically proxies to duckdns unless overridden

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://alpha-arena.duckdns.org";

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

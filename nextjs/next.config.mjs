/** @type {import('next').NextConfig} */

// In dev: proxy /api → localhost:4000
// In prod (Vercel): NEXT_PUBLIC_BACKEND_URL must be set to your VPS URL
//   e.g. NEXT_PUBLIC_BACKEND_URL=http://123.456.789.0:4000
//   or   NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

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

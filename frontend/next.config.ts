import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:3000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: `${BACKEND_URL}/:path*`,
      },
      {
        source: '/audio/:path*',
        destination: `${BACKEND_URL}/audio/:path*`,
      },
    ];
  },
};

export default nextConfig;

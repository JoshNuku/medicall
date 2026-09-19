import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: 'http://localhost:3000/:path*',
      },
      {
        source: '/audio/:path*',
        destination: 'http://localhost:3000/audio/:path*',
      },
    ];
  },
};

export default nextConfig;

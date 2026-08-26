import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    root: process.cwd(),
  },
  allowedDevOrigins: ['192.168.56.1', 'localhost:3000', '192.168.56.1:3000'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['http://localhost:3010', process.env.NEXT_PUBLIC_SITE_URL || ''],
    },
    httpTimeout: 60000, // 60 seconds
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.NEXT_PUBLIC_SITE_URL || "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,POST,PUT,DELETE,OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ];
  },
  images: {
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
    domains: [
      "localhost",
      process.env.NEXT_PUBLIC_IMAGE_DOMAIN || "", // لدعم النطاقات المخصصة للصور
      'res.cloudinary.com',
      // Add any other domains you're using for images
    ],
    unoptimized: true, // Add this to bypass image optimization in development
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/djpgpmk4u/image/upload/**',
      },
    ],
  },
};

module.exports = nextConfig;

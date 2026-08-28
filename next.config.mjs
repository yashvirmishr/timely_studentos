/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '50mb' },
  },
  transpilePackages: ['@law-firm-ai/db', '@law-firm-ai/ai', '@law-firm-ai/ui'],
  serverExternalPackages: ['@prisma/client', 'pdf-parse'],
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['mysql2']
  },
  // Force dynamic rendering - no static page generation
  output: 'standalone',
  // Disable static optimization completely
  ...(process.env.BUILD_STANDALONE === 'true' && {
    compress: false,
  }),
};

module.exports = nextConfig;
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['mysql2']
  },
  // Prevent static page generation during build
  output: 'standalone'
};

module.exports = nextConfig;
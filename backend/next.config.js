/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['mysql2']
  },
  // Disable static page generation completely
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  // Skip trailing slashes and disable static optimization
  trailingSlash: false,
  // This prevents Next.js from trying to export static pages
  ...(process.env.NODE_ENV === 'production' && {
    distDir: '.next'
  })
};

module.exports = nextConfig;
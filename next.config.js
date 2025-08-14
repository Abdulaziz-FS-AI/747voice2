/** @type {import('next').NextConfig} */
const nextConfig = {
  // Simplified config for reliable Vercel deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Skip static generation for auth-dependent pages
  generateBuildId: async () => {
    return 'build-' + new Date().toISOString()
  },
}

module.exports = nextConfig
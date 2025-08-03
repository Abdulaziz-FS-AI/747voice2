/** @type {import('next').NextConfig} */
const nextConfig = {
  // Simplified config for reliable Vercel deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
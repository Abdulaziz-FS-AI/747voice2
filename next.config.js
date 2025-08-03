/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@vapi-ai/server-sdk'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    esmExternals: 'loose'
  },
  webpack: (config, { isServer }) => {
    // Handle Node.js modules for client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    
    // Handle problematic packages
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push('@sentry/nextjs');
    }
    
    return config;
  },
}

module.exports = nextConfig
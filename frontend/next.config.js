/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Fix pino-pretty resolution error from @solana/wallet-adapter-wallets
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'pino-pretty': false,
      };
    }
    return config;
  },
}

module.exports = nextConfig

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ottimizzazioni per performance
  experimental: {
    optimizeCss: false, // Disabilitato per evitare errori con Critters
    optimizePackageImports: ['lucide-react', 'date-fns']
  },
  
  // Configurazione immagini
  images: {
    unoptimized: false,
    formats: ['image/webp', 'image/avif']
  },
  
  // Compiler ottimizzazioni
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
    reactRemoveProperties: process.env.NODE_ENV === 'production'
  },
  
  // Configurazione bundle senza caching
  webpack: (config, { dev, isServer }) => {
    // Disabilitato il caching dei chunks
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        // Rimosso cacheGroups per evitare problemi di caching
      }
    }
    return config
  },
  
  // Disabilitato il caching
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ]
  }
}

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Necessário para Docker - gera uma build standalone otimizada
  output: 'standalone',
  
  compiler: {
    // A opção `removeConsole` quando definida como `false` impede a remoção dos logs.
    removeConsole: false,
  },
  // Desabilitar cache durante build na Vercel
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },

  async rewrites() {
    const internalApiUrl = process.env.INTERNAL_API_URL || 'http://backend-node:4000';
    return [
      {
        source: '/download/:path*',
        destination: `${internalApiUrl}/download/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${internalApiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

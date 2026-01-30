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
    return [
      {
        source: '/download/:path*',
        destination: 'http://localhost:4001/download/:path*',
      },
      {
        source: '/api/:path*',
        destination: 'http://localhost:4001/api/:path*',
      },
    ];
  },
};

export default nextConfig;

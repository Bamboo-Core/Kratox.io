/** @type {import('next').NextConfig} */
const nextConfig = {
    compiler: {
        // A opção `removeConsole` quando definida como `false` impede a remoção dos logs.
        removeConsole: false,
    },
    // Desabilitar cache durante build na Vercel
    generateBuildId: async () => {
        return `build-${Date.now()}`
    },
};

export default nextConfig;

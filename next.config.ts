// This file is deprecated and can be deleted.
// The configuration has been moved to next.config.mjs to resolve a startup issue.
/** @type {import('next').NextConfig} */
const nextConfig = {
    compiler: {
      // A opção `removeConsole` quando definida como `false` impede a remoção dos logs.
      removeConsole: false,
    },
  };
  
  module.exports = nextConfig;
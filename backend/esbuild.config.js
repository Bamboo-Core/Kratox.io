const esbuild = require('esbuild');
const { readdirSync, statSync } = require('fs');
const { join } = require('path');

// Recursively get all .ts files from src directory
function getEntryPoints(dir, files = []) {
  const items = readdirSync(dir);
  for (const item of items) {
    const fullPath = join(dir, item);
    if (statSync(fullPath).isDirectory()) {
      getEntryPoints(fullPath, files);
    } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

const entryPoints = getEntryPoints('./src');

esbuild.build({
  entryPoints,
  outdir: 'dist',
  bundle: false,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  sourcemap: false,
  outExtension: { '.js': '.js' },
}).then(() => {
  console.log('Build successful!');
}).catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});

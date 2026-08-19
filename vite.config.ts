import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // GitHub Pages serveert vanaf main:/docs (zelfde patroon als vlaaienvanger)
    outDir: 'docs',
    chunkSizeWarningLimit: 2000,
  },
});

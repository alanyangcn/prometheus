import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { cloudflare } from '@cloudflare/vite-plugin';
import { obfuscateClient } from './build/obfuscation.ts';

export default defineConfig({
  plugins: [vue(), cloudflare(), obfuscateClient()],
  build: { minify: true, cssMinify: true, sourcemap: false },
  environments: { client: { build: {
    rollupOptions: {
      input: {
        photography: fileURLToPath(new URL('./index.html', import.meta.url)),
        management: fileURLToPath(new URL('./admin.html', import.meta.url)),
      },
    },
  } } },
});

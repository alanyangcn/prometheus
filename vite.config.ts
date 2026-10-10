import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { cloudflare } from '@cloudflare/vite-plugin';
import { obfuscateClient } from './build/obfuscation.ts';

export default defineConfig({
  plugins: [vue(), cloudflare(), obfuscateClient()],
  build: { minify: true, cssMinify: true, sourcemap: false },
});

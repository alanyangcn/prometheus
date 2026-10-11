import { build } from 'vite';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { collectAssets } from './embedded-assets.mjs';
import { protectAssets } from './protect-assets.mjs';
import JavaScriptObfuscator from 'javascript-obfuscator';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = fileURLToPath(new URL('../dist/single/', import.meta.url));
const entry = fileURLToPath(new URL('./__single-file-entry__.ts', import.meta.url));
const resolvedEntry = '\0' + entry;
const worker = fileURLToPath(new URL('../server/single-file.ts', import.meta.url));
const { manifest, key } = await protectAssets(await collectAssets(fileURLToPath(new URL('../dist/client/', import.meta.url))));

await build({
  configFile: false, root, publicDir: false,
  plugins: [{
    name: 'prometheus-embedded-assets',
    resolveId(id) { if (id === entry) return resolvedEntry; },
    load(id) {
      if (id === resolvedEntry) return `import { createSingleFileWorker } from ${JSON.stringify(worker)};\nexport default createSingleFileWorker(${JSON.stringify(manifest)}, ${JSON.stringify(key)});`;
    },
    // Run after Vite's final rendering/minification so it cannot expand compact output.
    generateBundle(_options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue;
        const result = JavaScriptObfuscator.obfuscate(chunk.code, {
          target: 'browser-no-eval', compact: true, identifierNamesGenerator: 'hexadecimal',
          renameGlobals: false, renameProperties: false, stringArray: true, stringArrayThreshold: 0.6,
          stringArrayEncoding: ['base64'], controlFlowFlattening: false, deadCodeInjection: false,
          debugProtection: false, selfDefending: false, sourceMap: false,
          reservedStrings: ['^cloudflare:sockets$'],
        });
        chunk.code = '/*! Prometheus — GPL-2.0. Includes algorithms derived from cmliu/edgetunnel; see LICENSE and THIRD_PARTY_NOTICES.md. */' + result.getObfuscatedCode();
      }
    },
  }],
  build: {
    outDir: output, emptyOutDir: true, minify: true, sourcemap: false, target: 'es2022',
    lib: { entry, formats: ['es'], fileName: () => 'workers.js' },
    rollupOptions: {
      external: ['cloudflare:sockets'],
      output: { codeSplitting: false },
    },
  },
});
const bytes = await readFile(new URL('../dist/single/workers.js', import.meta.url));
console.log(`Single-file Worker: dist/single/workers.js (${Object.keys(manifest).length} embedded assets, ${(bytes.length / 1024).toFixed(1)} KiB; gzip ${(gzipSync(bytes).length / 1024).toFixed(1)} KiB)`);

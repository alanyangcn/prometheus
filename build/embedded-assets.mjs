import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createAssetIgnore } from './asset-ignore.mjs';

const mime = {
  html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8', svg: 'image/svg+xml', json: 'application/json; charset=utf-8', txt: 'text/plain; charset=utf-8',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif', ico: 'image/x-icon',
  woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf', wasm: 'application/wasm',
};

export async function collectAssets(root) {
  let ignoreText = '';
  try { ignoreText = await readFile(join(root, '.assetsignore'), 'utf8'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const ignored = createAssetIgnore(ignoreText);
  function excluded(path, directory) {
    // Hard exclusions cannot be undone by an ignore-file negation.
    if (path === '_headers' || path === '_redirects' || path.split('/').some(part => part.startsWith('.') || /^(?:wrangler\.(?:jsonc?|toml)|package(?:-lock)?\.json|pnpm-(?:lock|workspace)\.yaml)$/.test(part)) || /\.(?:map|pem|key)$/.test(path)) return true;
    return ignored(path, directory);
  }
  const manifest = Object.create(null);
  async function walk(directory, prefix = '') {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    for (const entry of entries) {
      const relative = prefix + entry.name;
      if (excluded(relative, entry.isDirectory())) continue;
      if (entry.isSymbolicLink()) throw new Error(`Refusing asset symlink: ${relative}`);
      if (entry.isDirectory()) { await walk(join(directory, entry.name), relative + '/'); continue; }
      if (!entry.isFile()) continue;
      const bytes = await readFile(join(directory, entry.name));
      manifest['/' + relative] = {
        body: bytes.toString('base64'), type: mime[entry.name.split('.').at(-1)?.toLowerCase()] || 'application/octet-stream',
        size: bytes.length, etag: '"' + createHash('sha256').update(bytes).digest('hex') + '"',
      };
    }
  }
  await walk(root);
  for (const entry of ['/index.html', '/admin.html']) if (!manifest[entry]) throw new Error(`Missing frontend entry ${entry}; run pnpm run build first.`);
  return manifest;
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { collectAssets } from '../build/embedded-assets.mjs';

// Use Wrangler's own runtime so this does not require an additional dependency.
const require = createRequire(import.meta.url);
const wranglerRequire = createRequire(require.resolve('wrangler/package.json'));
const { Miniflare, convertV4MiniflareOptions } = await import(pathToFileURL(wranglerRequire.resolve('miniflare')).href);
const root = fileURLToPath(new URL('../', import.meta.url));

test('emits a single compact line while retaining attribution', async () => {
  const code = await readFile(root + 'dist/single/workers.js', 'utf8');
  assert.equal(/[\r\n\u2028\u2029]/.test(code.trimEnd()), false);
  assert.match(code, /GPL-2\.0/);
  assert.match(code, /cmliu\/edgetunnel/);
});

test('runs the generated workers.js with embedded frontend, KV and no ASSETS binding', async t => {
  assert.deepEqual(await readdir(root + 'dist/single'), ['workers.js']);
  const runtime = new Miniflare(convertV4MiniflareOptions({
    modules: true, scriptPath: root + 'dist/single/workers.js', compatibilityDate: '2026-10-10',
    bindings: { ADMIN: 'artifact-test-password', ADMIN_PATH: 'artifact-entry', UUID: '90cd4a77-141a-43c9-991b-08263cfe9c10' },
    kvNamespaces: ['KV'],
  }));
  t.after(() => runtime.dispose());
  const request = (path, init = {}) => runtime.dispatchFetch('https://example.com' + path, { redirect: 'manual', ...init, headers: { 'User-Agent': 'artifact-test', ...init.headers } });
  const home = await request('/'); assert.equal(home.status, 200);
  const publicHtml = await home.text();
  assert.equal(publicHtml.includes('management-base'), false);
  assert.equal(publicHtml.includes('artifact-entry'), false);
  assert.match(publicHtml, /photography-[^" ]+\.js/);
  const login = await request('/artifact-entry/spark'); assert.equal(login.status, 200);
  assert.match(await login.text(), /content="\/artifact-entry\/"/);
  const anonymous = await request('/artifact-entry/illumination/network');
  assert.equal(anonymous.status, 302); assert.equal(anonymous.headers.get('Location'), '/artifact-entry/spark');
  const auth = await request('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'artifact-test-password' }) });
  assert.equal(auth.status, 200); const cookie = auth.headers.get('Set-Cookie').split(';')[0];
  assert.equal((await request('/artifact-entry/illumination/network', { headers: { Cookie: cookie } })).status, 200);
  assert.equal((await request('/api/config', { headers: { Cookie: cookie } })).status, 200);
  assert.equal((await request('/assets/nonexistent.js')).status, 404);
  assert.equal((await request('/admin.html')).status, 404);
  const assets = await collectAssets(root + 'dist/client');
  for (const path of Object.keys(assets).filter(path => path.startsWith('/assets/') || path === '/favicon.svg')) {
    const response = await request(path);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get('Content-Type'), assets[path].type, path);
    const expected = await readFile(root + 'dist/client' + path);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), expected, path);
  }
});

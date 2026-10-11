import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collectAssets } from '../build/embedded-assets.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'prometheus-assets-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'assets'));
  await writeFile(join(root, 'index.html'), '<html>摄影</html>');
  await writeFile(join(root, 'admin.html'), '<html>管理</html>');
  return root;
}
test('packs built text and binary assets without secrets, source maps or build metadata', async t => {
  const root = await fixture(t);
  await writeFile(join(root, 'assets/app-123.js'), 'export const name = "摄影";');
  await writeFile(join(root, 'assets/pixel.png'), Buffer.from([0, 1, 255, 128]));
  await writeFile(join(root, '.dev.vars'), 'ADMIN=private-test-secret');
  await writeFile(join(root, 'wrangler.json'), '{"secret":"private-test-secret"}');
  await writeFile(join(root, 'assets/app-123.js.map'), 'private-test-secret');
  await mkdir(join(root, '.vite'));
  await writeFile(join(root, '.vite/manifest.json'), 'private-test-secret');
  await writeFile(join(root, '.assetsignore'), 'assets/ignored-*\n');
  await writeFile(join(root, 'assets/ignored-file.txt'), 'private-test-secret');
  const manifest = await collectAssets(root);
  assert.deepEqual(Object.keys(manifest), ['/admin.html', '/assets/app-123.js', '/assets/pixel.png', '/index.html']);
  assert.equal(Buffer.from(manifest['/assets/app-123.js'].body, 'base64').toString(), 'export const name = "摄影";');
  assert.deepEqual([...Buffer.from(manifest['/assets/pixel.png'].body, 'base64')], [0, 1, 255, 128]);
  assert.equal(manifest['/assets/pixel.png'].type, 'image/png');
  assert.equal(manifest['/assets/pixel.png'].size, 4);
  assert.match(manifest['/assets/app-123.js'].etag, /^"[a-f0-9]{64}"$/);
  assert.equal(JSON.stringify(manifest).includes('private-test-secret'), false);
  assert.deepEqual(await collectAssets(root), manifest);
});
test('fails when either frontend entry is missing', async t => {
  const root = await fixture(t); await rm(join(root, 'admin.html'));
  await assert.rejects(collectAssets(root), /admin\.html/);
});
test('rejects symlinks rather than packing files outside the build directory', async t => {
  const root = await fixture(t);
  await symlink(join(root, 'index.html'), join(root, 'assets/leak.html'));
  await assert.rejects(collectAssets(root), /symlink/i);
});

test('honors nested filename rules, rooted patterns and ordered negations', async t => {
  const root = await fixture(t);
  await mkdir(join(root, 'assets/nested'));
  for (const path of ['root-only.txt', 'assets/root-only.txt', 'assets/private.txt', 'assets/keep.txt', 'assets/nested/private.txt', 'assets/nested/literal{a,b}.bin', 'assets/nested/literala.bin']) await writeFile(join(root, path), 'fixture');
  await writeFile(join(root, '.assetsignore'), '*.txt\n!assets/keep.txt\n/root-only.txt\n!assets/root-only.txt\nliteral{a,b}.bin\n');
  const manifest = await collectAssets(root);
  assert.equal('/assets/private.txt' in manifest, false);
  assert.equal('/assets/nested/private.txt' in manifest, false);
  assert.equal('/root-only.txt' in manifest, false);
  assert.equal('/assets/keep.txt' in manifest, true);
  assert.equal('/assets/root-only.txt' in manifest, true);
  assert.equal('/assets/nested/literal{a,b}.bin' in manifest, false);
  assert.equal('/assets/nested/literala.bin' in manifest, true);
});
test('does not reinclude files beneath an ignored directory and never packs Wrangler metadata', async t => {
  const root = await fixture(t);
  await mkdir(join(root, 'assets/private'));
  await writeFile(join(root, 'assets/private/keep.txt'), 'secret');
  await writeFile(join(root, '_headers'), 'metadata'); await writeFile(join(root, '_redirects'), 'metadata');
  await writeFile(join(root, '.assetsignore'), 'private/\n!assets/private/keep.txt\n');
  const manifest = await collectAssets(root);
  assert.equal('/assets/private/keep.txt' in manifest, false);
  assert.equal('/_headers' in manifest, false); assert.equal('/_redirects' in manifest, false);
});

test('encrypts compressed assets with fresh keys and IVs and authenticates resource metadata', async () => {
  const { protectAssets } = await import('../build/protect-assets.mjs');
  const { webcrypto } = await import('node:crypto');
  const { gunzipSync } = await import('node:zlib');
  const source = { '/index.html': { body: Buffer.from('摄影首页').toString('base64'), type: 'text/html; charset=utf-8', size: 12, etag: '"v1"' }, '/admin.html': { body: Buffer.from('管理').toString('base64'), type: 'text/html; charset=utf-8', size: 6, etag: '"v2"' } };
  const first = await protectAssets(source), second = await protectAssets(source);
  assert.notEqual(first.key, second.key);
  assert.equal(Buffer.from(first.key, 'base64').length, 32);
  assert.notEqual(first.manifest['/index.html'].iv, first.manifest['/admin.html'].iv);
  assert.notEqual(first.manifest['/index.html'].body, source['/index.html'].body);
  assert.equal(source['/index.html'].iv, undefined);
  const item = first.manifest['/index.html'];
  assert.equal(Buffer.from(item.iv, 'base64').length, 12);
  assert.equal(item.compression, 'gzip');
  const key = await webcrypto.subtle.importKey('raw', Buffer.from(first.key, 'base64'), 'AES-GCM', false, ['decrypt']);
  const aad = Buffer.from(JSON.stringify(['/index.html', item.type, item.size, item.etag]));
  const plaintext = await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(item.iv, 'base64'), additionalData: aad }, key, Buffer.from(item.body, 'base64'));
  assert.equal(gunzipSync(Buffer.from(plaintext)).toString(), '摄影首页');
  await assert.rejects(webcrypto.subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(item.iv, 'base64'), additionalData: Buffer.from('wrong metadata') }, key, Buffer.from(item.body, 'base64')));
});

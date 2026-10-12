import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, expect, it, vi } from 'vitest';
import { createEmbeddedAssets, type EmbeddedManifest } from '../server/assets/embedded';
import { createSingleFileWorker } from '../server/single-file';

function asset(body: string, type: string) {
  const bytes = new TextEncoder().encode(body);
  return { body: btoa(String.fromCharCode(...bytes)), type, size: bytes.length, etag: '"fixture-v1"' };
}
const manifest: EmbeddedManifest = {
  '/index.html': asset('<html><head></head><body>摄影首页</body></html>', 'text/html; charset=utf-8'),
  '/admin.html': asset('<html><head></head><body>管理界面</body></html>', 'text/html; charset=utf-8'),
  '/assets/app-123.js': asset('export const label = "普罗米修斯";', 'text/javascript; charset=utf-8'),
  '/favicon.svg': asset('<svg></svg>', 'image/svg+xml'),
  '/assets/pixel.png': { body: 'AAH/gA==', type: 'image/png', size: 4, etag: '"binary-v1"' },
};

describe('embedded assets', () => {
  it('serves UTF-8 and binary resources with their actual MIME types', async () => {
    const binding = createEmbeddedAssets(manifest);
    const js = await binding.fetch(new Request('https://example.com/assets/app-123.js?v=1'));
    expect(js.status).toBe(200); expect(js.headers.get('Content-Type')).toBe('text/javascript; charset=utf-8');
    expect(js.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(await js.text()).toBe('export const label = "普罗米修斯";');
    const image = await binding.fetch(new Request('https://example.com/assets/pixel.png'));
    expect(image.headers.get('Content-Type')).toBe('image/png');
    expect([...new Uint8Array(await image.arrayBuffer())]).toEqual([0, 1, 255, 128]);
  });
  it('supports bodyless HEAD, conditional caching and non-cacheable HTML', async () => {
    const binding = createEmbeddedAssets(manifest);
    const head = await binding.fetch(new Request('https://example.com/assets/pixel.png', { method: 'HEAD' }));
    expect(await head.text()).toBe(''); expect(head.headers.get('Content-Length')).toBe('4');
    expect(head.headers.get('Cache-Control')).toContain('immutable');
    const cached = await binding.fetch(new Request('https://example.com/assets/pixel.png', { headers: { 'If-None-Match': 'W/"binary-v1"' } }));
    expect(cached.status).toBe(304); expect(await cached.text()).toBe('');
    const html = await binding.fetch(new Request('https://example.com/admin.html', { headers: { 'If-None-Match': '"fixture-v1"' } }));
    expect(html.status).toBe(200); expect(html.headers.get('Cache-Control')).toBe('no-store');
  });
  it('does not fall back to a page for missing assets or accept writes', async () => {
    const binding = createEmbeddedAssets(manifest);
    for (const path of ['/assets/missing.js', '/__proto__', '/constructor', '/.dev.vars']) {
      expect((await binding.fetch(new Request('https://example.com' + path))).status).toBe(404);
    }
    const response = await binding.fetch(new Request('https://example.com/index.html', { method: 'POST' }));
    expect(response.status).toBe(405); expect(response.headers.get('Allow')).toBe('GET, HEAD');
  });
});

describe('single-file Worker without ASSETS binding', () => {
  function fixture() {
    const data = new Map<string, string>();
    const env = { GO_ON: 'single-file-test-password', BASE_PATH: 'entry', UUID: '90cd4a77-141a-43c9-991b-08263cfe9c10', STORAGE: {
      get: async (key: string) => data.get(key) ?? null,
      put: async (key: string, value: string) => { data.set(key, value); },
    } };
    const worker = createSingleFileWorker(manifest);
    async function request(path: string, body?: unknown, cookie?: string) {
      const ctx = createExecutionContext();
      const response = await worker.fetch(new Request('https://example.com' + path, {
        method: body === undefined ? 'GET' : 'POST', headers: { 'User-Agent': 'test-browser', ...(cookie ? { Cookie: cookie } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        body: body === undefined ? undefined : JSON.stringify(body),
      }), env as any, ctx);
      await waitOnExecutionContext(ctx); return response;
    }
    return { request, env, worker };
  }
  it('keeps the public homepage independent of the management prefix', async () => {
    const f = fixture(); const home = await f.request('/');
    expect(home.status).toBe(200); expect(await home.text()).toContain('摄影首页');
    const login = await f.request('/entry/spark'); const html = await login.text();
    expect(login.status).toBe(200); expect(html).toContain('管理界面'); expect(html).toContain('content="/entry/"');
    expect((await f.request('/admin.html')).status).toBe(404);
    expect((await f.request('/wrong/spark')).status).toBe(404);
    expect((await f.request('/assets/missing.js')).status).toBe(404);
  });
  it('injects each environment prefix independently when raw admin HTML is cached', async () => {
    const f = fixture();
    expect(await (await f.request('/entry/spark')).text()).toContain('content="/entry/"');
    const ctx = createExecutionContext();
    const response = await f.worker.fetch(new Request('https://example.com/other/spark'), { ...f.env, BASE_PATH: 'other' } as any, ctx);
    const html = await response.text();
    expect(html).toContain('content="/other/"'); expect(html).not.toContain('content="/entry/"');
    await waitOnExecutionContext(ctx);
  });
  it('preserves deep-link authentication and authenticated configuration writes', async () => {
    const f = fixture();
    const anonymous = await f.request('/entry/illumination/network');
    expect(anonymous.status).toBe(302); expect(anonymous.headers.get('Location')).toBe('/entry/spark');
    expect((await f.request('/api/config')).status).toBe(401);
    const login = await f.request('/api/login', { password: f.env.GO_ON });
    expect(login.status).toBe(200); const cookie = login.headers.get('Set-Cookie')!.split(';')[0];
    expect((await f.request('/entry/illumination/network', undefined, cookie)).status).toBe(200);
    expect((await f.request('/api/config', { 协议类型: 'trojan' }, cookie)).status).toBe(200);
    const config = await (await f.request('/api/config', undefined, cookie)).json() as any;
    expect(config.协议类型).toBe('trojan');
  });
  it('serves photography with no environment settings but closes the management entry', async () => {
    const f = fixture(); const ctx = createExecutionContext();
    const home = await f.worker.fetch(new Request('https://example.com/'), {}, ctx);
    expect(home.status).toBe(200);
    const login = await f.worker.fetch(new Request('https://example.com/entry/spark'), {}, ctx);
    expect(login.status).toBe(404);
  });
});

describe('encrypted embedded assets', () => {
  async function fixture() {
    const raw = crypto.getRandomValues(new Uint8Array(32));
    const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const body = new TextEncoder().encode('加密资源');
    const compressed = await new Response(new Response(body).body!.pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
    const path = '/assets/encrypted.js';
    const type = 'text/javascript; charset=utf-8', size = 12, etag = '"encrypted-v1"';
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(JSON.stringify([path, type, size, etag])) }, key, compressed);
    const base64 = (value: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(value)));
    const manifest = { [path]: { body: base64(ciphertext), iv: base64(iv), compression: 'gzip' as const, type, size, etag } };
    return { path, manifest, key: base64(raw) };
  }
  it('reconstructs split keys and rejects missing or tampered shares', async () => {
    const f = await fixture();
    const raw = Uint8Array.from(atob(f.key), char => char.charCodeAt(0));
    const mask = crypto.getRandomValues(new Uint8Array(32));
    const base64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
    const parts: [string, string] = [base64(mask), base64(raw.map((byte, index) => byte ^ mask[index]))];
    const response = await createEmbeddedAssets(f.manifest, { parts }).fetch(new Request('https://example.com' + f.path));
    expect(await response.text()).toBe('加密资源');
    for (const key of [{ parts: [parts[0]] }, { parts: [parts[0], 'AA=='] }, { parts: [parts[0], base64(new Uint8Array(32))] }]) {
      const response = await createEmbeddedAssets(f.manifest, key as any).fetch(new Request('https://example.com' + f.path));
      expect(response.status).toBe(500); expect(response.headers.get('Cache-Control')).toBe('no-store');
    }
  });
  it('reuses completed decryption results with independent response bodies', async () => {
    const f = await fixture(); const binding = createEmbeddedAssets(f.manifest, f.key);
    const decrypt = vi.spyOn(crypto.subtle, 'decrypt');
    try {
      const first = await binding.fetch(new Request('https://example.com' + f.path));
      const second = await binding.fetch(new Request('https://example.com' + f.path + '?v=2'));
      expect(await first.text()).toBe('加密资源'); expect(await second.text()).toBe('加密资源');
      expect(decrypt).toHaveBeenCalledTimes(1);
    } finally { decrypt.mockRestore(); }
  });
  it('retries after decryption failure without caching an error', async () => {
    const f = await fixture(); const binding = createEmbeddedAssets(f.manifest, f.key);
    const decrypt = vi.spyOn(crypto.subtle, 'decrypt').mockRejectedValueOnce(new Error('temporary failure'));
    try {
      expect((await binding.fetch(new Request('https://example.com' + f.path))).status).toBe(500);
      expect(await (await binding.fetch(new Request('https://example.com' + f.path))).text()).toBe('加密资源');
      expect(await (await binding.fetch(new Request('https://example.com' + f.path))).text()).toBe('加密资源');
      expect(decrypt).toHaveBeenCalledTimes(2);
    } finally { decrypt.mockRestore(); }
  });
  it('serves concurrent cold requests and subsequently reuses completed bytes', async () => {
    const f = await fixture(); const binding = createEmbeddedAssets(f.manifest, f.key);
    const responses = await Promise.all(Array.from({ length: 4 }, () => binding.fetch(new Request('https://example.com' + f.path))));
    expect(await Promise.all(responses.map(response => response.text()))).toEqual(Array(4).fill('加密资源'));
    const decrypt = vi.spyOn(crypto.subtle, 'decrypt');
    try {
      expect(await (await binding.fetch(new Request('https://example.com' + f.path))).text()).toBe('加密资源');
      expect(decrypt).not.toHaveBeenCalled();
    } finally { decrypt.mockRestore(); }
  });
  it('decrypts and decompresses UTF-8 bytes while preserving response headers', async () => {
    const f = await fixture();
    const response = await createEmbeddedAssets(f.manifest, f.key).fetch(new Request('https://example.com' + f.path));
    expect(response.status).toBe(200); expect(response.headers.get('Content-Type')).toBe('text/javascript; charset=utf-8');
    expect(response.headers.get('Content-Length')).toBe('12'); expect(await response.text()).toBe('加密资源');
  });
  it('fails closed for missing keys, ciphertext tampering and relocated ciphertext', async () => {
    const f = await fixture();
    const tampered = { ...f.manifest, [f.path]: { ...f.manifest[f.path], body: 'AAAA' + f.manifest[f.path].body.slice(4) } };
    for (const binding of [createEmbeddedAssets(f.manifest), createEmbeddedAssets(tampered, f.key), createEmbeddedAssets(f.manifest, btoa(String.fromCharCode(...new Uint8Array(32)))), createEmbeddedAssets({ [f.path]: { ...f.manifest[f.path], iv: undefined } }, f.key), createEmbeddedAssets({ [f.path]: { ...f.manifest[f.path], type: 'text/html' } }, f.key)]) {
      const response = await binding.fetch(new Request('https://example.com' + f.path));
      expect(response.status).toBe(500); expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(await response.text()).not.toContain('加密资源');
    }
    const relocated = createEmbeddedAssets({ '/assets/other.js': f.manifest[f.path] }, f.key);
    expect((await relocated.fetch(new Request('https://example.com/assets/other.js'))).status).toBe(500);
  });
  it('can answer HEAD and conditional requests without importing a key or decrypting', async () => {
    const f = await fixture(); const binding = createEmbeddedAssets(f.manifest);
    const head = await binding.fetch(new Request('https://example.com' + f.path, { method: 'HEAD' }));
    expect(head.status).toBe(200); expect(await head.text()).toBe('');
    const cached = await binding.fetch(new Request('https://example.com' + f.path, { headers: { 'If-None-Match': '"encrypted-v1"' } }));
    expect(cached.status).toBe(304);
  });
});

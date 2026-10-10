import { describe, it, expect } from 'vitest';
import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import worker from '../server/index';

function fixture() {
  const data = new Map<string, string>();
  const env = {
    ADMIN: 'test-only-password', UUID: '90cd4a77-141a-43c9-991b-08263cfe9c10',
    KV: { get: async (key: string) => data.get(key) ?? null, put: async (key: string, value: string) => { data.set(key, value); } },
  };
  async function request(path: string, body?: unknown, cookie?: string, origin?: string) {
    const headers: Record<string, string> = { 'User-Agent': 'prometheus-test' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (cookie) headers.Cookie = cookie;
    if (origin) headers.Origin = origin;
    const ctx = createExecutionContext();
    const response = await worker.fetch(new Request(`https://example.com${path}`, {
      method: body === undefined ? 'GET' : 'POST', headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }), env as any, ctx);
    await waitOnExecutionContext(ctx);
    return response;
  }
  return { env, data, request };
}
async function login(f: ReturnType<typeof fixture>) {
  const response = await f.request('/api/login', { password: f.env.ADMIN });
  expect(response.status).toBe(200);
  expect(response.headers.get('Set-Cookie')).toContain('HttpOnly');
  return response.headers.get('Set-Cookie')!.split(';')[0];
}

describe('Authenticated local management', () => {
  it('reports initialization and session status without secrets', async () => {
    const f = fixture();
    expect(await (await f.request('/api/session')).json()).toEqual({ configured: true, authenticated: false, storage: true });
  });
  it('rejects incorrect passwords and unauthenticated management', async () => {
    const f = fixture();
    expect((await f.request('/api/login', { password: 'wrong' })).status).toBe(401);
    expect((await f.request('/api/config')).status).toBe(401);
  });
  it('initializes old KV schema and saves protocol settings', async () => {
    const f = fixture(); const cookie = await login(f);
    const config = await (await f.request('/api/config', undefined, cookie)).json() as Record<string, unknown>;
    expect(config.UUID).toBe(f.env.UUID);
    expect(config.协议类型).toBe('vless');
    expect((await f.request('/api/config', { ...config, 协议类型: 'trojan' }, cookie)).status).toBe(200);
    expect(JSON.parse(f.data.get('config.json')!).协议类型).toBe('trojan');
  });
  it('rejects corrupt config and cross-origin changes', async () => {
    const f = fixture(); const cookie = await login(f);
    expect((await f.request('/api/config', { 协议类型: 'invalid' }, cookie)).status).toBe(400);
    expect((await f.request('/api/config', { 协议类型: 'trojan' }, cookie, 'https://other.example')).status).toBe(403);
  });

  it('roundtrips address lists and supports legacy config URLs', async () => {
    const f = fixture(); const cookie = await login(f);
    expect((await f.request('/api/addresses', { text: 'example.com:443#test' }, cookie)).status).toBe(200);
    expect(await (await f.request('/api/addresses', undefined, cookie)).json()).toEqual({ text: 'example.com:443#test' });
    expect((await f.request('/admin/config.json', undefined, cookie)).status).toBe(200);
  });
});

describe('Subscriptions and routing compatibility', () => {
  it('generates authenticated mixed subscriptions with original UUID and address data', async () => {
    const f = fixture(); const cookie = await login(f);
    const config = await (await f.request('/api/config', undefined, cookie)).json() as any;
    config.优选订阅生成.本地IP库.随机IP = false;
    await f.request('/api/config', config, cookie);
    await f.request('/api/addresses', { text: 'example.net:443#test' }, cookie);
    const response = await f.request(`/sub?token=${config.优选订阅生成.TOKEN}`);
    expect(response.status).toBe(200);
    const content = atob(await response.text());
    expect(content).toContain(`vless://${f.env.UUID}@example.net:443`);
    expect(content).toContain('host=example.com');
    expect((await f.request('/sub?token=wrong')).status).not.toBe(200);
  });
  it('serves local admin deep links instead of remote HTML or JSON authorization errors', async () => {
    const f = fixture();
    const env = { ...f.env, ASSETS: { fetch: async () => new Response('<html>local-app</html>', { headers: { 'Content-Type': 'text/html' } }) } };
    const ctx = createExecutionContext();
    const response = await worker.fetch(new Request('https://example.com/admin/settings'), env as any, ctx);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('local-app');
  });
  it('validates proxy checks before making network connections', async () => {
    const f = fixture(); const cookie = await login(f);
    expect((await f.request('/api/proxy-check', { type: 'invalid', address: 'example.com' }, cookie)).status).toBe(400);
    expect((await f.request('/api/proxy-check', { type: 'socks5', address: 'example.com:0' }, cookie)).status).toBe(400);
    expect((await f.request('/api/proxy-check', { type: 'socks5', address: 'example.com:1080' })).status).toBe(401);
  });
});

it('serves development JavaScript without forcing localhost HTTPS', async () => {
  const f = fixture();
  const env = { ...f.env, ASSETS: { fetch: async () => new Response('export const local = true;', { headers: { 'Content-Type': 'text/javascript' } }) } };
  const ctx = createExecutionContext();
  const response = await worker.fetch(new Request('http://127.0.0.1:5173/src/main.ts'), env as any, ctx);
  expect(response.status).toBe(200);
  expect(response.headers.get('Content-Type')).toBe('text/javascript');
});



it('serves scripts at their original path before ADMIN has been configured', async () => {
  const paths: string[] = [];
  const env = { ASSETS: { fetch: async (request: Request) => {
    const path = new URL(request.url).pathname;
    paths.push(path);
    return new Response(path === '/setup' ? '<html>setup</html>' : 'export const app = true;', {
      headers: { 'Content-Type': path === '/setup' ? 'text/html' : 'text/javascript' },
    });
  } } };
  for (const path of ['/src/main.ts', '/@vite/client', '/assets/index.js']) {
    const response = await worker.fetch(new Request(`http://127.0.0.1:5173${path}`), env as any, createExecutionContext());
    expect(response.headers.get('Content-Type')).toBe('text/javascript');
  }
  expect(paths).toEqual(['/src/main.ts', '/@vite/client', '/assets/index.js']);
});

it('protects all tool APIs and rejects cross-origin tool writes', async () => {
  const f = fixture();
  expect((await f.request('/api/tools/converter-check', { baseURL: 'https://example.com' })).status).toBe(401);
  const cookie = await login(f);
  expect((await f.request('/api/tools/converter-check', { baseURL: 'https://example.com' }, cookie, 'https://other.example')).status).toBe(403);
  expect((await f.request('/api/tools/missing', {}, cookie)).status).toBe(404);
});

it('saves optional ECH SNI and an explicitly selected upstream proxy without changing identity', async () => {
  const f = fixture(); const cookie = await login(f);
  const saved = await f.request('/api/config', { ECHConfig: { SNI: null }, gRPCUserAgent: 'custom-client', 反代: { SOCKS5: { 启用: 'https', 账号: 'user:pass@proxy.example:443', 全局: true } } }, cookie);
  expect(saved.status).toBe(200);
  const data = JSON.parse(f.data.get('config.json')!);
  expect(data.ECHConfig.SNI).toBeNull(); expect(data.gRPCUserAgent).toBe('custom-client');
  expect(data.反代.SOCKS5.启用).toBe('https'); expect(data.UUID).toBe(f.env.UUID);
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { createRuntime } from '../server/runtime';

afterEach(() => vi.unstubAllGlobals());

describe('Prometheus client identity', () => {
  it('identifies aggregation requests with the project name and repository', () => {
    expect(createRuntime().汇聚订阅_UA).toBe('v2rayN/Prometheus (https://github.com/alanyangcn/prometheus)');
  });

  it('recognizes its own generator client and older structured client headers', () => {
    const runtime = createRuntime();
    expect(runtime.isGeneratorClient('v2rayN/Prometheus (https://github.com/alanyangcn/prometheus)')).toBe(true);
    expect(runtime.isGeneratorClient('v2rayN/compat-client Uid/0xabc Version/20261008222327')).toBe(true);
    expect(runtime.isGeneratorClient('Mozilla/5.0')).toBe(false);
    expect(runtime.isGeneratorClient('v2rayN/client')).toBe(false);
  });

  it('brands converter requests while preserving the version endpoint and subscription authorization', async () => {
    const runtime = createRuntime({ serveApp: async () => new Response('Not found', { status: 404 }) });
    const data = new Map<string, string>();
    const env = {
      GO_ON: 'test-only-password', UUID: '90cd4a77-141a-43c9-991b-08263cfe9c10',
      STORAGE: { get: async (key: string) => data.get(key) ?? null, put: async (key: string, value: string) => { data.set(key, value); } },
    };
    const config = await runtime.readConfig(env, 'example.com', env.UUID, 'test-client');
    config.优选订阅生成.本地IP库.随机IP = false;
    data.set('config.json', JSON.stringify(config));
    data.set('ADD.txt', 'node.example:443#node');
    const fetcher = vi.fn().mockResolvedValue(new Response('proxies: []\n'));
    vi.stubGlobal('fetch', fetcher);
    const ctx = createExecutionContext();
    const response = await runtime.worker.fetch(new Request(`https://example.com/sub?token=${config.优选订阅生成.TOKEN}&clash`), env as any, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(200);
    const init = fetcher.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get('User-Agent')).toContain('Subconverter for clash Prometheus (https://github.com/alanyangcn/prometheus)');
    const version = await runtime.worker.fetch(new Request(`https://example.com/version?uuid=${env.UUID}`), env as any, createExecutionContext());
    expect(await version.json()).toEqual({ Version: 20261008222327 });
    const rejected = await runtime.worker.fetch(new Request('https://example.com/sub?token=invalid&clash'), env as any, createExecutionContext());
    expect(rejected.status).not.toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('requires the explicit generator switch and placeholder identity for token-free generator requests', async () => {
    const runtime = createRuntime({ serveApp: async () => new Response('Not found', { status: 404 }) });
    const data = new Map<string, string>();
    const env = { GO_ON: 'test-password', UUID: '90cd4a77-141a-43c9-991b-08263cfe9c10', BEST_SUB: 'false', OFF_LOG: 'true', STORAGE: { get: async (key: string) => data.get(key) ?? null, put: async (key: string, value: string) => { data.set(key, value); } } };
    const config = await runtime.readConfig(env, 'example.com', env.UUID, 'test-client');
    config.优选订阅生成.本地IP库.随机IP = false;
    data.set('config.json', JSON.stringify(config)); data.set('ADD.txt', 'node.example:443#node');
    async function request(host: string, uuid: string) {
      const ctx = createExecutionContext();
      const response = await runtime.worker.fetch(new Request(`https://example.com/sub?host=${host}&uuid=${uuid}`, { headers: { 'User-Agent': 'v2rayN/Prometheus (https://github.com/alanyangcn/prometheus)' } }), env as any, ctx);
      await waitOnExecutionContext(ctx); return response;
    }
    const placeholder = '00000000-0000-4000-8000-000000000000';
    expect((await request('example.com', placeholder)).status).toBe(404);
    env.BEST_SUB = 'true';
    expect((await request('example.com', placeholder)).status).toBe(200);
    expect((await request('other.example', placeholder)).status).toBe(404);
    expect((await request('example.com', env.UUID)).status).toBe(404);
  });

  it('reports an incompatible external generator instead of publishing an error as a loopback node', async () => {
    const runtime = createRuntime({ serveApp: async () => new Response('Not found', { status: 404 }) });
    const data = new Map<string, string>();
    const env = { GO_ON: 'test-password', UUID: '90cd4a77-141a-43c9-991b-08263cfe9c10', OFF_LOG: 'true', STORAGE: { get: async (key: string) => data.get(key) ?? null, put: async (key: string, value: string) => { data.set(key, value); } } };
    const config = await runtime.readConfig(env, 'example.com', env.UUID, 'test-client');
    config.优选订阅生成.local = false; config.优选订阅生成.SUB = 'generator.example';
    data.set('config.json', JSON.stringify(config));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Not found', { status: 404 })));
    const ctx = createExecutionContext();
    const response = await runtime.worker.fetch(new Request(`https://example.com/sub?token=${config.优选订阅生成.TOKEN}&b64`), env as any, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.text()).toContain('生成器');
  });

  it('reads valid placeholder nodes from a compatible external generator', async () => {
    const runtime = createRuntime();
    const node = 'vless://00000000-0000-4000-8000-000000000000@203.0.113.10:443?host=example.com#Generator';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(btoa(node))));
    expect(await runtime.fetchSubscriptionSource('generator.example', 'fixture', true)).toEqual([['203.0.113.10:443#Generator'], '']);
  });

  it('rejects malformed or empty generator responses', async () => {
    const runtime = createRuntime();
    for (const body of ['invalid base64!', '', btoa('<html>not a node</html>')]) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body)));
      await expect(runtime.fetchSubscriptionSource('generator.example', 'fixture', true)).rejects.toThrow('生成器');
    }
  });
});

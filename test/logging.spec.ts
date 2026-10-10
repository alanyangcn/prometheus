import { it, expect } from 'vitest';
import { createRuntime } from '../server/runtime';
it('redacts subscription tokens before storing request logs', async () => {
  const data = new Map<string, string>();
  const env = { KV: { get: async (key: string) => data.get(key) || null, put: async (key: string, value: string) => { data.set(key, value); } } };
  const runtime = createRuntime();
  await runtime.recordLog(env, new Request('https://example.com/sub?token=private-value'), '127.0.0.1', 'Get_SUB', { TG: { 启用: false } });
  const logs = JSON.parse(data.get('log.json')!);
  expect(logs).toHaveLength(1);
  expect(logs[0].URL).not.toContain('private-value');
});

function logFixture(overrides: Record<string, string> = {}) {
  const data = new Map<string, string>();
  const env = { ...overrides, KV: { get: async (key: string) => data.get(key) ?? null, put: async (key: string, value: string) => { data.set(key, value); } } };
  const runtime = createRuntime();
  const request = new Request('https://example.com/api/config', { headers: { 'User-Agent': 'test-browser' } });
  return { data, env, runtime, request, logs: () => JSON.parse(data.get('log.json') || '[]') };
}
it('deduplicates management visits but retains every successful mutation', async () => {
  const f = logFixture();
  for (const type of ['Admin_Login', 'Admin_Login', 'Save_Config', 'Save_Config', 'Save_Custom_IPs', 'Save_Custom_IPs', 'Init_Config', 'Init_Config']) {
    await f.runtime.recordLog(f.env, f.request, '192.0.2.1', type, {});
  }
  expect(f.logs().map((log: any) => log.TYPE)).toEqual(['Admin_Login', 'Save_Config', 'Save_Config', 'Save_Custom_IPs', 'Save_Custom_IPs', 'Init_Config', 'Init_Config']);
});
it('records a new visit after the deduplication window expires', async () => {
  const f = logFixture();
  await f.runtime.recordLog(f.env, f.request, '192.0.2.1', 'Admin_Login', {});
  const logs = f.logs(); logs[0].TIME = Date.now() - 31 * 60 * 1000;
  f.data.set('log.json', JSON.stringify(logs));
  await f.runtime.recordLog(f.env, f.request, '192.0.2.1', 'Admin_Login', {});
  expect(f.logs()).toHaveLength(2);
});
it('respects OFF_LOG and notification-only events', async () => {
  for (const off of ['true', '1']) {
    const f = logFixture({ OFF_LOG: off });
    await f.runtime.recordLog(f.env, f.request, '192.0.2.1', 'Save_Config', {});
    expect(f.data.has('log.json')).toBe(false);
  }
  const f = logFixture();
  await f.runtime.recordLog(f.env, f.request, '192.0.2.1', 'Get_Best_SUB', {}, false);
  expect(f.data.has('log.json')).toBe(false);
});

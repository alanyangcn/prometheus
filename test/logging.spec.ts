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

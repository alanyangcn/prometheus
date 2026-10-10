import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../server/index';

async function request(path: string) {
  const ctx = createExecutionContext();
  const response = await worker.fetch(new Request(`https://example.com${path}`), env, ctx);
  await waitOnExecutionContext(ctx);
  return response;
}

describe('Worker API', () => {
  it('returns project health as JSON', async () => {
    const response = await request('/api/health');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(await response.json()).toEqual({ name: 'prometheus', status: 'ok' });
  });
  it('returns 404 for unknown API routes', async () => {
    const response = await request('/api/missing');
    expect(response.status).toBe(404);
  });
});

import { it, expect, describe } from 'vitest';
import { createRuntime } from '../server/runtime';

function socket(chunks: number[][]) {
  const writes: Uint8Array[] = []; let closed = false;
  const result = {
    readable: new ReadableStream<Uint8Array>({ start(c) { for (const chunk of chunks) c.enqueue(new Uint8Array(chunk)); c.close(); } }),
    writable: new WritableStream<Uint8Array>({ write(chunk) { writes.push(new Uint8Array(chunk)); } }),
    opened: Promise.resolve({}), closed: new Promise(() => {}),
    close() { closed = true; },
  };
  return { result, writes, wasClosed: () => closed };
}

describe('SOCKS5 handshake and TCP boundary', () => {
  it('handles fragmented method selection and preserves coalesced tunnel data', async () => {
    const mock = socket([[5], [0], [5, 0, 0, 1, 127, 0, 0, 1, 0, 80, 9, 8]]);
    const runtime = createRuntime();
    const tunnel = await runtime.socks5Connect('example.com', 443, new Uint8Array([7]), () => mock.result, { hostname: 'proxy.example', port: 1080 });
    expect([...mock.writes[0]]).toEqual([5, 1, 0]);
    expect([...mock.writes.at(-1)!]).toEqual([7]);
    const reader = tunnel.readable.getReader();
    expect([...((await reader.read()).value!)]).toEqual([9, 8]);
    await reader.cancel();
  });
  it('supports username/password negotiation and closes on rejection', async () => {
    const runtime = createRuntime();
    const mock = socket([[5, 2], [1, 1]]);
    await expect(runtime.socks5Connect('example.com', 443, new Uint8Array(), () => mock.result, { hostname: 'proxy.example', port: 1080, username: 'user', password: 'pass' })).rejects.toThrow();
    expect(mock.wasClosed()).toBe(true);
  });
  it('forwards HTTP CONNECT body bytes already received with its headers', async () => {
    const runtime = createRuntime();
    const mock = socket([[...new TextEncoder().encode('HTTP/1.1 200 Connection established\r\n\r\npayload')]]);
    const tunnel = await runtime.httpConnect('example.com', 443, new Uint8Array(), false, () => mock.result, { hostname: 'proxy.example', port: 8080 });
    const reader = tunnel.readable.getReader();
    expect(new TextDecoder().decode((await reader.read()).value)).toBe('payload');
    await reader.cancel();
  });
});

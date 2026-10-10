import { describe, it, expect } from 'vitest';
import { createRuntime } from '../server/runtime';
const UUID = '90cd4a77-141a-43c9-991b-08263cfe9c10';
function packet() {
  const id = UUID.replaceAll('-', '').match(/../g)!.map(x => parseInt(x, 16));
  return new Uint8Array([0, ...id, 0, 1, 1, 187, 1, 1, 2, 3, 4, 7, 8]);
}
describe('Transport compatibility and connection isolation', () => {
  it('authenticates early data and enforces the 8 KiB bound', () => {
    const runtime = createRuntime();
    const bytes = packet();
    expect(runtime.解码WS早期数据(btoa(String.fromCharCode(...bytes)), UUID)).toEqual(bytes);
    expect(runtime.解码WS早期数据('invalid!', UUID)).toBeNull();
    expect(() => runtime.解码WS早期数据('A'.repeat(12000), UUID)).toThrow('too large');
  });
  it('retains XHTTP padding checks without requiring padding when absent', () => {
    const runtime = createRuntime();
    const [header, key] = runtime.获取本机标识(UUID);
    expect(runtime.校验叉HTTPPadding(new Request('https://example.com'), header, key)).toBe(true);
    expect(runtime.校验叉HTTPPadding(new Request(`https://example.com?${key}=a`), header, key)).toBe(false);
  });
  it('reads an authenticated XHTTP header across stream fragments', async () => {
    const runtime = createRuntime(); const bytes = packet();
    const reader = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(bytes.slice(0, 8)); c.enqueue(bytes.slice(8)); c.close(); } }).getReader();
    const result = await runtime.读取叉HTTP首包(reader, UUID);
    expect(result).toMatchObject({ hostname: '1.2.3.4', port: 443, isUDP: false });
    reader.releaseLock();
  });
  it('invalidates and drains previous connection generations before replacement', async () => {
    const runtime = createRuntime(); let closed = false; let drained = false;
    const wrapper = { generation: 2, socket: { close() { closed = true; } }, downlinkController: { 停止并刷新: async () => { drained = true; } }, downlinkDrain: Promise.resolve() };
    const next = runtime.开始TCP连接世代(wrapper);
    await next.downlinkDrain;
    expect(next.generation).toBe(3); expect(wrapper.socket).toBeNull();
    expect(closed).toBe(true); expect(drained).toBe(true);
  });
  it('relays WebSocket VLESS bytes over an injected standard socket connector', async () => {
    const targets: { hostname: string; port: number }[] = [];
    const runtime = createRuntime({ socketConnect: ((target: { hostname: string; port: number }) => {
      targets.push(target);
      return {
        readable: new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new Uint8Array([11, 12])); c.close(); } }),
        writable: new WritableStream<Uint8Array>(), opened: Promise.resolve({}), closed: new Promise(() => {}), close() {},
      };
    }) as any });
    runtime.TCP并发拨号数 = 1;
    const url = new URL('https://example.com/tunnel');
    const response = await runtime.handleWebSocket(new Request(url, { headers: { Upgrade: 'websocket' } }), UUID, url);
    expect(response.status).toBe(101);
    const client = response.webSocket!; client.accept();
    const incoming = new Promise<Uint8Array>((resolve, reject) => {
      client.addEventListener('message', event => {
        const data = event.data;
        if (data instanceof Blob) void data.arrayBuffer().then(buffer => resolve(new Uint8Array(buffer)), reject);
        else resolve(new Uint8Array(data as ArrayBuffer));
      }, { once: true });
      client.addEventListener('error', () => reject(new Error('WebSocket error')), { once: true });
    });
    client.send(packet());
    expect([...await incoming]).toEqual([0, 0, 11, 12]);
    expect(targets[0]).toEqual({ hostname: '1.2.3.4', port: 443 });
    client.close();
  });
});

for (const transport of ['grpc', 'xhttp'] as const) {
  it(`relays VLESS payload through actual ${transport} streaming handler`, async () => {
    const targets: unknown[] = []; const writes: number[][] = [];
    const runtime = createRuntime({ socketConnect: ((target: unknown) => {
      targets.push(target);
      return {
        readable: new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new Uint8Array([11, 12])); c.close(); } }),
        writable: new WritableStream<Uint8Array>({ write(chunk) { writes.push([...chunk]); } }),
        opened: Promise.resolve({}), closed: new Promise(() => {}), close() {},
      };
    }) as any });
    runtime.TCP并发拨号数 = 1;
    let input!: ReadableStreamDefaultController<Uint8Array>;
    const body = new ReadableStream<Uint8Array>({ start(c) { input = c; } });
    const raw = packet();
    const frame = transport === 'grpc' ? new Uint8Array([0, 0, 0, 0, raw.length + 2, 10, raw.length, ...raw]) : raw;
    input.enqueue(frame.slice(0, 4)); input.enqueue(frame.slice(4));
    const request = new Request('https://example.com/tunnel', { method: 'POST', body });
    const response = transport === 'grpc' ? await runtime.handleGrpc(request, UUID, {}) : await runtime.handleXhttp(request, UUID, {});
    expect(response.status).toBe(200);
    const reader = response.body!.getReader();
    const payload: number[] = []; let pending: number[] = [];
    while (payload.length < 4) {
      const chunk = await reader.read(); expect(chunk.done).toBe(false);
      if (transport === 'xhttp') payload.push(...chunk.value!);
      else {
        pending.push(...chunk.value!);
        while (pending.length >= 5) {
          const length = pending[1] * 2 ** 24 + pending[2] * 2 ** 16 + pending[3] * 256 + pending[4];
          if (pending.length < 5 + length) break;
          payload.push(...pending.slice(7, 5 + length)); pending = pending.slice(5 + length);
        }
      }
    }
    expect(payload).toEqual([0, 0, 11, 12]);
    expect(targets[0]).toEqual({ hostname: '1.2.3.4', port: 443 });
    expect(writes.some(x => x.join(',') === '7,8')).toBe(true);
    input.close(); await reader.cancel();
  });
}

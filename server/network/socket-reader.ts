/** Stream reader for proxy handshakes. Keeps bytes after the handshake intact. */
export interface DuplexSocket {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
  opened?: Promise<unknown>;
  closed: Promise<unknown>;
  close(): unknown;
  startTls?: (...args: unknown[]) => unknown;
}
export class BufferedSocketReader {
  private readonly reader: ReadableStreamDefaultReader<Uint8Array>;
  private pending = new Uint8Array(0);
  constructor(private readonly socket: DuplexSocket) { this.reader = socket.readable.getReader(); }
  async readExactly(length: number): Promise<Uint8Array> {
    while (this.pending.byteLength < length) {
      const next = await this.reader.read();
      if (next.done) throw new Error('代理握手未完成，连接已关闭');
      const combined = new Uint8Array(this.pending.byteLength + next.value.byteLength);
      combined.set(this.pending); combined.set(next.value, this.pending.byteLength); this.pending = combined;
    }
    const result = this.pending.slice(0, length); this.pending = this.pending.slice(length); return result;
  }
  release(): DuplexSocket {
    return socketWithReader(this.socket, this.reader, this.pending);
  }
  async cancel(): Promise<void> {
    try { await this.reader.cancel(); } catch { /* Already closed. */ }
    try { this.reader.releaseLock(); } catch { /* Already released. */ }
    await this.socket.close();
  }
}
function socketWithReader(socket: DuplexSocket, reader: ReadableStreamDefaultReader<Uint8Array>, prefix: Uint8Array): DuplexSocket {
  let buffered: Uint8Array | null = prefix.byteLength ? prefix : null;
  const readable = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (buffered) { controller.enqueue(buffered); buffered = null; return; }
      try {
        const next = await reader.read();
        if (next.done) { controller.close(); reader.releaseLock(); }
        else controller.enqueue(next.value);
      } catch (error) { controller.error(error); }
    },
    async cancel(reason) {
      try { await reader.cancel(reason); } finally {
        try { reader.releaseLock(); } catch { /* Reader may already be released. */ }
        await socket.close();
      }
    },
  });
  return { readable, writable: socket.writable, opened: socket.opened, closed: socket.closed, close: () => socket.close() };
}
export function prependSocket(socket: DuplexSocket, prefix: Uint8Array): DuplexSocket {
  return socketWithReader(socket, socket.readable.getReader(), prefix);
}

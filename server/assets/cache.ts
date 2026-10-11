/** Completed public resource bytes only; never shares request-owned streams or promises. */
export class AssetCache {
  private readonly entries = new Map<string, Uint8Array<ArrayBuffer>>();
  private bytes = 0;
  constructor(private readonly maxBytes = 8 * 1024 * 1024, private readonly maxEntries = 64) {}
  get(path: string): Uint8Array<ArrayBuffer> | undefined {
    const value = this.entries.get(path);
    if (value) { this.entries.delete(path); this.entries.set(path, value); }
    return value;
  }
  set(path: string, value: Uint8Array<ArrayBuffer>): void {
    if (value.byteLength > this.maxBytes || this.maxEntries <= 0) return;
    const previous = this.entries.get(path);
    if (previous) { this.entries.delete(path); this.bytes -= previous.byteLength; }
    while (this.entries.size && (this.bytes + value.byteLength > this.maxBytes || this.entries.size >= this.maxEntries)) {
      const oldest = this.entries.keys().next().value!;
      this.bytes -= this.entries.get(oldest)!.byteLength;
      this.entries.delete(oldest);
    }
    this.entries.set(path, value); this.bytes += value.byteLength;
  }
}

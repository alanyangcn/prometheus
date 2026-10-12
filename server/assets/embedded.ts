import { AssetCache } from './cache';

export interface EmbeddedAsset { body: string; type: string; size: number; etag: string; iv?: string; compression?: 'gzip' }
export type EmbeddedKey = string | { parts: [string, string] };
export type EmbeddedManifest = Record<string, EmbeddedAsset>;

/** A local replacement for the ASSETS fetch method, containing only public build output. */
export function createEmbeddedAssets(manifest: EmbeddedManifest, encodedKey?: EmbeddedKey): Pick<Fetcher, 'fetch'> {
  let key: CryptoKey | undefined;
  const cache = new AssetCache();
  const decode = (value: string) => Uint8Array.from(atob(value), character => character.charCodeAt(0));
  return {
    async fetch(input, init) {
      const request = new Request(input, init);
      if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
      const path = new URL(request.url).pathname;
      if (!Object.hasOwn(manifest, path)) return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
      const asset = manifest[path];
      const html = asset.type.startsWith('text/html');
      const headers = new Headers({
        'Content-Type': asset.type,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': html ? 'no-store' : path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
      });
      if (!html) {
        headers.set('ETag', asset.etag);
        const tags = request.headers.get('If-None-Match')?.split(',').map(tag => tag.trim().replace(/^W\//, '')) || [];
        if (tags.includes('*') || tags.includes(asset.etag)) return new Response(null, { status: 304, headers });
      }
      headers.set('Content-Length', String(asset.size));
      if (request.method === 'HEAD') return new Response(null, { headers });
      const cached = cache.get(path);
      if (cached) return new Response(cached, { headers });
      try {
        let bytes: Uint8Array<ArrayBuffer> = decode(asset.body);
        if (encodedKey || asset.iv || asset.compression) {
          if (!encodedKey || !asset.iv || asset.compression !== 'gzip') throw new Error('Invalid encrypted resource');
          // Import lazily inside a request; Workers forbids async crypto during module startup.
          if (!key) {
            let rawKey: Uint8Array<ArrayBuffer>;
            if (typeof encodedKey === 'string') rawKey = decode(encodedKey);
            else {
              if (!Array.isArray(encodedKey.parts) || encodedKey.parts.length !== 2) throw new Error('Invalid key shares');
              const [mask, masked] = encodedKey.parts.map(decode);
              if (mask.length !== 32 || masked.length !== 32) throw new Error('Invalid key size');
              rawKey = mask.map((byte, index) => byte ^ masked[index]);
            }
            try { key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['decrypt']); }
            finally { rawKey.fill(0); }
          }
          const compressed = await crypto.subtle.decrypt({
            name: 'AES-GCM', iv: decode(asset.iv),
            additionalData: new TextEncoder().encode(JSON.stringify([path, asset.type, asset.size, asset.etag])),
          }, key, bytes);
          const stream = new Response(compressed).body!.pipeThrough(new DecompressionStream('gzip'));
          bytes = new Uint8Array(await new Response(stream).arrayBuffer());
          if (bytes.length !== asset.size) throw new Error('Invalid resource size');
        }
        cache.set(path, bytes);
        return new Response(bytes, { headers });
      } catch {
        // Never return ciphertext, unauthenticated bytes or stale cache headers on failure.
        return new Response('Resource unavailable', { status: 500, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
      }
    },
  };
}

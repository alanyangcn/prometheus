import { describe, expect, it } from 'vitest';
import { AssetCache } from '../server/assets/cache';

describe('bounded decoded asset cache', () => {
  it('evicts least recently used entries within byte and entry limits', () => {
    const cache = new AssetCache(6, 2);
    cache.set('a', new Uint8Array(2)); cache.set('b', new Uint8Array(2));
    expect(cache.get('a')).toHaveLength(2);
    cache.set('c', new Uint8Array(3));
    expect(cache.get('b')).toBeUndefined(); expect(cache.get('a')).toHaveLength(2);
    cache.set('d', new Uint8Array(5));
    expect(cache.get('a')).toBeUndefined(); expect(cache.get('c')).toBeUndefined();
    expect(cache.get('d')).toHaveLength(5);
  });
  it('bypasses oversized assets and accounts for replacements', () => {
    const cache = new AssetCache(4, 2);
    cache.set('a', new Uint8Array(2)); cache.set('huge', new Uint8Array(5));
    expect(cache.get('huge')).toBeUndefined(); expect(cache.get('a')).toHaveLength(2);
    cache.set('a', new Uint8Array(3)); cache.set('b', new Uint8Array(1));
    expect(cache.get('a')).toHaveLength(3); expect(cache.get('b')).toHaveLength(1);
  });
});

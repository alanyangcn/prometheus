import { describe, it, expect } from 'vitest';
import { createRuntime } from '../server/runtime';

const UUID = '90cd4a77-141a-43c9-991b-08263cfe9c10';
function vlessHeader(addressType: number, address: number[], command = 1) {
  const id = UUID.replaceAll('-', '').match(/../g)!.map(x => parseInt(x, 16));
  return new Uint8Array([0, ...id, 0, command, 1, 187, addressType, ...address, 7, 8]);
}

describe('Migrated protocol compatibility', () => {
  it('parses authenticated IPv4 VLESS TCP payloads', () => {
    const runtime = createRuntime();
    const result = runtime.parseVless(vlessHeader(1, [1, 2, 3, 4]), UUID);
    expect(result).toMatchObject({ hasError: false, hostname: '1.2.3.4', port: 443, isUDP: false });
    expect([...result.rawClientData!]).toEqual([7, 8]);
  });
  it('rejects wrong identities, truncated headers and unsupported commands', () => {
    const runtime = createRuntime();
    expect(runtime.parseVless(vlessHeader(1, [1, 2, 3, 4]), '00000000-0000-4000-8000-000000000000').hasError).toBe(true);
    expect(runtime.parseVless(new Uint8Array(8), UUID).hasError).toBe(true);
    expect(runtime.parseVless(vlessHeader(1, [1, 2, 3, 4], 3), UUID).hasError).toBe(true);
  });
  it('parses DNS UDP and domain addresses without assuming unrestricted UDP', () => {
    const runtime = createRuntime();
    const packet = vlessHeader(2, [3, 100, 110, 115], 2);
    packet[19] = 0; packet[20] = 53;
    expect(runtime.parseVless(packet, UUID)).toMatchObject({ hostname: 'dns', isUDP: true });
  });
  it('parses authenticated bracketed IPv6 proxy endpoints and default ports', () => {
    const runtime = createRuntime();
    expect(runtime.parseProxyAddress('user:pass@[2001:db8::1]:1080')).toEqual({ username: 'user', password: 'pass', hostname: '[2001:db8::1]', port: 1080 });
    expect(runtime.proxyDefaultPort('turn')).toBe(3478);
    expect(runtime.proxyDefaultPort('https')).toBe(443);
  });
  it('retains parameter encoding required by chain proxies', () => {
    const runtime = createRuntime();
    const value = JSON.stringify({ type: 'socks5', hostname: 'example.com', port: 1080 });
    expect(runtime.decodeSecret(runtime.encodeSecret(value, UUID), UUID)).toBe(value);
  });
  it('does not share mutable configuration between requests', () => {
    const one = createRuntime(); const two = createRuntime();
    one.config_JSON = { UUID: 'one' };
    one.SOCKS5白名单.push('private.example');
    expect(two.config_JSON).toBeUndefined();
    expect(two.SOCKS5白名单).not.toContain('private.example');
  });
  it('produces stable legacy identity hashes', async () => {
    const runtime = createRuntime();
    expect(await runtime.hashIdentity('test')).toMatch(/^[a-f0-9]{32}$/);
    expect(await runtime.hashIdentity('test')).toBe(await runtime.hashIdentity('test'));
  });
});

describe('Encryption and authentication compatibility', () => {
  it('parses Trojan TCP packets and rejects incorrect passwords', () => {
    const runtime = createRuntime();
    const password = UUID;
    const hash = new TextEncoder().encode(runtime.sha224(password));
    const header = new Uint8Array([...hash, 13, 10, 1, 1, 1, 2, 3, 4, 1, 187, 13, 10, 9]);
    expect(runtime.parseTrojan(header, password)).toMatchObject({ hasError: false, hostname: '1.2.3.4', port: 443 });
    expect(runtime.parseTrojan(header, 'wrong').hasError).toBe(true);
  });
  it('roundtrips Shadowsocks AEAD frames and rejects tampering', async () => {
    const runtime = createRuntime();
    const config = runtime.SS支持加密配置['aes-128-gcm'];
    const master = await runtime.SS派生主密钥(UUID, 16);
    const salt = new Uint8Array(16).fill(5);
    const key = await runtime.SS派生会话密钥(config, master, salt, ['encrypt', 'decrypt']);
    const plaintext = new TextEncoder().encode('prometheus');
    const ciphertext = await runtime.SSAEAD加密(key, new Uint8Array(12), plaintext);
    expect([...await runtime.SSAEAD解密(key, new Uint8Array(12), ciphertext)]).toEqual([...plaintext]);
    ciphertext[0] ^= 1;
    await expect(runtime.SSAEAD解密(key, new Uint8Array(12), ciphertext)).rejects.toThrow();
  });
});

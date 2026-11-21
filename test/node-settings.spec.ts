import { describe, expect, it } from 'vitest';
import { nodeSettings, prepareNodeSettings } from '../src/features/configuration/node';
import type { Configuration } from '../shared/config';

const fixture = (): Configuration => ({
  协议类型: 'vless', 传输协议: 'ws', Fingerprint: 'chrome', ECH: true,
  ECHConfig: { DNS: 'https://dns.example/query', SNI: 'cloudflare-ech.com' },
  SS: { TLS: true }, HOST: 'edge.example', UUID: 'identity',
  优选订阅生成: { SUBNAME: '我的订阅', TOKEN: 'keep-secret', local: false, SUB: 'generator.example' },
  反代: { PROXYIP: 'keep.example' }, 订阅转换配置: { UDP: true },
});

describe('combined node and ECH settings', () => {
  it('saves ECH DNS and domain together with node fields while preserving other sections', () => {
    const draft = fixture();
    draft.ECHConfig = { DNS: 'https://new.example/query', SNI: '' };
    const result = prepareNodeSettings(draft, 'ua');
    expect(result).toMatchObject({ 协议类型: 'vless', ECH: true, ECHConfig: { DNS: 'https://new.example/query', SNI: null }, 优选订阅生成: { SUBNAME: '我的订阅' } });
    expect(result).not.toHaveProperty('反代');
    expect(result).not.toHaveProperty('订阅转换配置');
    expect(result).not.toHaveProperty('HOST');
    expect(result).not.toHaveProperty('UUID');
    expect(result.优选订阅生成).toEqual({ SUBNAME: '我的订阅' });
    expect(draft.ECHConfig).toEqual({ DNS: 'https://new.example/query', SNI: '' });
  });
  it('tracks ECH-only edits and keeps the original snapshot independent for cancellation', () => {
    const draft = fixture();
    const original = nodeSettings(draft);
    (draft.ECHConfig as Configuration).DNS = 'https://new.example/query';
    expect(nodeSettings(draft)).not.toEqual(original);
    expect(original.ECHConfig).toEqual({ DNS: 'https://dns.example/query', SNI: 'cloudflare-ech.com' });
  });
  it('rejects enabled ECH without DNS or with an incompatible fingerprint', () => {
    expect(() => prepareNodeSettings({ ...fixture(), ECHConfig: { DNS: ' ' } }, 'ua')).toThrow('DNS');
    expect(() => prepareNodeSettings({ ...fixture(), Fingerprint: 'safari' }, 'ua')).toThrow('指纹');
  });
  it('disables ECH and fragmentation when Shadowsocks TLS is off before validating ECH', () => {
    const result = prepareNodeSettings({ ...fixture(), 协议类型: 'ss', SS: { TLS: false }, 传输协议: 'grpc', ECHConfig: { DNS: '' }, TLS分片: 'Happ', 启用0RTT: true }, 'ua');
    expect(result).toMatchObject({ ECH: false, TLS分片: null, 传输协议: 'ws', 启用0RTT: false });
  });
});

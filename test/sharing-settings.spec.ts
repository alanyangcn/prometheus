import { describe, expect, it } from 'vitest';
import { subscriptionMode, setSubscriptionMode, prepareSettings, echConflict, resolveEchConflict } from '../src/features/configuration/settings';
import { subscriptionLinks } from '../src/features/sharing/links';
import type { Configuration } from '../shared/config';
describe('reference configuration interactions', () => {
  it('changes generator/custom/random mode while retaining identity and custom settings', () => {
    const config: Configuration = { 优选订阅生成: { TOKEN: 'keep', SUBNAME: 'name', local: true, SUB: 'example.com', 本地IP库: { 随机IP: true, 随机数量: 32, 指定端口: 443 } } };
    setSubscriptionMode(config, 'generator'); expect(subscriptionMode(config)).toBe('generator');
    setSubscriptionMode(config, 'custom'); expect(subscriptionMode(config)).toBe('custom');
    expect(config.优选订阅生成).toMatchObject({ TOKEN: 'keep', SUBNAME: 'name', SUB: null, 本地IP库: { 随机数量: 32, 指定端口: 443 } });
  });
  it('normalizes UA, optional SNI, TLS and template prefixes before saving without modifying the draft', () => {
    const config: Configuration = { gRPCUserAgent: '  ', TLS分片: '', ECHConfig: { SNI: '' }, 反代: { 路径模板: { PROXYIP: '/proxyip={{IP:PORT}}', HTTP: { 标准: '/http={{IP:PORT}}' } } } };
    expect(prepareSettings(config, 'agent')).toMatchObject({ gRPCUserAgent: 'agent', TLS分片: null, ECHConfig: { SNI: null }, 反代: { 路径模板: { HTTP: { 标准: 'http={{IP:PORT}}' } } } });
    expect(config.gRPCUserAgent).toBe('  ');
  });
  it('locks Shadowsocks to websocket and disables incompatible early data and TLS options', () => {
    const config: Configuration = { 协议类型: 'ss', 传输协议: 'grpc', SS: { TLS: false }, 启用0RTT: true, TLS分片: 'Happ', ECH: true };
    expect(prepareSettings(config, 'ua')).toMatchObject({ 传输协议: 'ws', 启用0RTT: false, TLS分片: null, ECH: false });
    expect(prepareSettings({ 协议类型: 'vless', 传输协议: 'grpc', 启用0RTT: true }, 'ua').启用0RTT).toBe(false);
  });
  it('resolves ECH fingerprint conflict with supported browsers or disables ECH', () => {
    const config: Configuration = { ECH: true, Fingerprint: 'safari' };
    expect(echConflict(config)).toBe(true); resolveEchConflict(config, 'firefox');
    expect(config).toMatchObject({ ECH: true, Fingerprint: 'firefox' });
    config.Fingerprint = 'random'; resolveEchConflict(config, 'disable'); expect(config.ECH).toBe(false);
    expect(prepareSettings({ 协议类型: 'ss', SS: { TLS: false }, ECH: true }, 'ua').ECH).toBe(false);
  });
  it('rejects missing generator and upstream accounts instead of saving an unusable mode', () => {
    expect(() => prepareSettings({ 优选订阅生成: { local: false, SUB: '' } }, 'ua')).toThrow('生成器');
    expect(() => prepareSettings({ 反代: { SOCKS5: { 启用: 'sstp', 账号: '' } } }, 'ua')).toThrow('代理');
  });
});
describe('subscription sharing', () => {
  it('encodes token once, provides all converted formats, and encodes client URL as a single argument', () => {
    const links = subscriptionLinks('https://edge.example', 'a&b', '测试');
    expect(links.find(x => x.id === 'loon')?.url).toBe('https://edge.example/sub?token=a%26b&loon');
    const clash = links.find(x => x.id === 'clash')!;
    expect(new URL(clash.importUrl!).searchParams.get('url')).toBe(clash.url);
    expect(links.find(x => x.id === 'b64')!.importUrl).toBe('shadowrocket://add/sub://' + btoa(links.find(x => x.id === 'b64')!.url) + '#%E6%B5%8B%E8%AF%95');
    expect(links.find(x => x.id === 'sb')!.importUrl).toContain('#%E6%B5%8B%E8%AF%95');
    expect(links.map(x => x.id)).toEqual(['auto', 'b64', 'clash', 'sb', 'surge', 'loon', 'quanx']);
  });
});

describe('remaining management workflows', () => {
  it('extracts the generator hostname from URLs and retains unrelated subscription data', () => {
    expect(prepareSettings({ 优选订阅生成: { local: false, SUB: 'https://www.generator.example:8443/sub?token=x', TOKEN: 'keep' } }, 'ua').优选订阅生成).toMatchObject({ SUB: 'generator.example', TOKEN: 'keep' });
  });
  it('converts only actual GitHub blob/tree URLs and moves query ports into verified source URLs', async () => {
    const { prepareApiSource } = await import('../src/features/configuration/imports');
    expect(prepareApiSource('https://github.com/user/repo/blob/main/ips.txt?port=2053', '443', true)).toEqual({ source: 'https://raw.githubusercontent.com/user/repo/refs/heads/main/ips.txt', port: '2053', url: 'https://raw.githubusercontent.com/user/repo/refs/heads/main/ips.txt?port=2053&proxyip=true' });
    expect(prepareApiSource('https://github.com.evil.example/user/repo/blob/main/ips.txt', '99999', false).url).toBe('https://github.com.evil.example/user/repo/blob/main/ips.txt?port=65535');
    expect(() => prepareApiSource('file:///tmp/ips.txt', '443', false)).toThrow('HTTP');
  });
  it('clamps fallback ports and removes a disabled proxyip parameter', async () => {
    const { prepareApiSource, appendAddressLines } = await import('../src/features/configuration/imports');
    expect(prepareApiSource('https://api.example/ips?proxyip=true&region=HK', 'invalid', false).url).toBe('https://api.example/ips?region=HK&port=443');
    expect(appendAddressLines('old.example:443\n', ['new.example:443', ''])).toBe('old.example:443\nnew.example:443');
  });
  it('compares hostname with configured HOSTS including optional ports', async () => {
    const { hostsMismatch } = await import('../src/features/configuration/settings');
    expect(hostsMismatch({ HOSTS: ['edge.example:443'] }, 'edge.example')).toBe(false);
    expect(hostsMismatch({ HOSTS: ['other.example'] }, 'edge.example')).toBe(true);
    expect(hostsMismatch({ HOSTS: [] }, 'edge.example')).toBe(false);
  });
});

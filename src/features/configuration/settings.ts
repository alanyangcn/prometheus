import type { Configuration } from '../../../shared/config';
export type SubscriptionMode = 'random' | 'custom' | 'generator';
export type ProxyMode = 'off' | 'socks5' | 'http' | 'https' | 'turn' | 'sstp';
export function group(config: Configuration, key: string): Configuration {
  const value = config[key];
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  const created: Configuration = {}; config[key] = created; return created;
}
export function subscriptionMode(config: Configuration): SubscriptionMode {
  const sub = group(config, '优选订阅生成');
  return sub.local === false ? 'generator' : group(sub, '本地IP库').随机IP === false ? 'custom' : 'random';
}
export function setSubscriptionMode(config: Configuration, mode: SubscriptionMode) {
  const sub = group(config, '优选订阅生成'); sub.local = mode !== 'generator';
  group(sub, '本地IP库').随机IP = mode === 'random';
  if (mode !== 'generator') sub.SUB = null;
}
export function setProxyMode(config: Configuration, mode: ProxyMode) {
  const proxy = group(group(config, '反代'), 'SOCKS5'); proxy.启用 = mode === 'off' ? null : mode;
  if (mode === 'off') { proxy.账号 = ''; proxy.全局 = false; }
}
export function prepareSettings(config: Configuration, userAgent: string): Configuration {
  const result = JSON.parse(JSON.stringify(config)) as Configuration;
  if ('gRPCUserAgent' in result && !String(result.gRPCUserAgent || '').trim()) result.gRPCUserAgent = userAgent;
  applyProtocolInteractions(result);
  if (result.TLS分片 === '') result.TLS分片 = null;
  if (result.ECHConfig && group(result, 'ECHConfig').SNI === '') group(result, 'ECHConfig').SNI = null;
  if (result.优选订阅生成) {
    const sub = group(result, '优选订阅生成');
    if (sub.local === false && !String(sub.SUB || '').trim()) throw new Error('优选订阅生成器地址不能为空');
    if (sub.local === false) sub.SUB = generatorHostname(String(sub.SUB));
    const local = group(sub, '本地IP库');
    if (sub.local !== false && local.随机IP !== false && (!Number.isInteger(local.随机数量) || Number(local.随机数量) <= 0)) throw new Error('随机优选数量必须是正整数');
  }
  if (result.反代) {
    const reverse = group(result, '反代'); const proxy = group(reverse, 'SOCKS5');
    if (proxy.启用 && !String(proxy.账号 || '').trim()) throw new Error('代理地址不能为空');
    function stripTemplates(templates: Configuration) {
      for (const [key, value] of Object.entries(templates)) {
        if (typeof value === 'string') templates[key] = value.replace(/^\//, '');
        else if (value && typeof value === 'object' && !Array.isArray(value)) stripTemplates(value);
      }
    }
    if (reverse.路径模板) stripTemplates(group(reverse, '路径模板'));
  }
  return result;
}

export function echConflict(config: Configuration): boolean {
  return config.ECH === true && !['chrome', 'firefox'].includes(String(config.Fingerprint));
}
export function resolveEchConflict(config: Configuration, action: 'chrome' | 'firefox' | 'disable') {
  config.ECH = action !== 'disable';
  if (action !== 'disable') config.Fingerprint = action;
}

export function applyProtocolInteractions(config: Configuration) {
  if (config.协议类型 === 'ss') config.传输协议 = 'ws';
  if (config.协议类型 === 'ss' || config.传输协议 === 'grpc') config.启用0RTT = false;
  if (config.协议类型 === 'ss' && group(config, 'SS').TLS === false) { config.ECH = false; config.TLS分片 = null; }
}

export function generatorHostname(input: string): string {
  const value = input.trim();
  try { return new URL(value.includes('://') ? value : `https://${value}`).hostname.replace(/^www\./i, ''); }
  catch { throw new Error('请输入有效的订阅生成器域名或 URL'); }
}
export function hostsMismatch(config: Configuration, hostname: string): boolean {
  const hosts = config.HOSTS;
  return Array.isArray(hosts) && hosts.length > 0 && !hosts.some(host => String(host).split(':')[0].toLowerCase() === hostname.toLowerCase());
}

import type { Configuration } from '../../../shared/config';
import { parseChainInput } from './chain';
export interface DirectoryEntry { address: string; country: string; countryName: string; city: string; asn: string | number; organization: string; protocol: string }
export interface ProxyResult { success: boolean; ip?: string; loc?: string; responseTime?: number; error?: string; supports_ipv4?: boolean; supports_ipv6?: boolean }
export function proxyConfiguration(type: string, address: string, global: boolean): Configuration {
  if (!['socks5','http','https','turn','sstp'].includes(type)) throw new Error('代理类型无效');
  const input = parseChainInput(address, type);
  if (!input.address || /[\r\n]/.test(input.address)) throw new Error('代理地址无效');
  return { 反代: { SOCKS5: { 启用: input.scheme, 全局: global, 账号: input.address } } };
}
export function proxyIPConfiguration(addresses: string[]): Configuration {
  if (!addresses.length || addresses.some(value => !/^[\da-fA-F:.]+$/.test(value))) throw new Error('请选择有效 PROXYIP');
  return { 反代: { PROXYIP: [...new Set(addresses)].join(','), SOCKS5: { 启用: null, 全局: false, 账号: '' } } };
}

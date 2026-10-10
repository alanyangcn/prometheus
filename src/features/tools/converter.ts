import type { Configuration } from '../../../shared/config';
export function converterBaseURL(value: string): string {
  const url = new URL(value);
  if (!['https:','http:'].includes(url.protocol) || url.username || url.password) throw new Error('转换服务地址无效');
  url.search = ''; url.hash = '';
  url.pathname = url.pathname.replace(/\/(sub|version)\/?$/i, '').replace(/\/$/, '');
  return url.href.replace(/\/$/, '');
}
export interface VerifiedConverter { key: string; baseURL: string; config: string }
export function converterKey(baseURL: string, config: string): string { return JSON.stringify([baseURL,config]); }
export async function saveVerifiedConverter(verified: VerifiedConverter, current: () => string, read: () => Promise<Configuration>, write: (patch: Configuration) => Promise<unknown>): Promise<void> {
  const snapshot = { ...verified };
  if (snapshot.key !== current()) throw new Error('转换设置已变化，请重新验证');
  const config = await read();
  if (snapshot.key !== current()) throw new Error('转换设置已变化，请重新验证');
  const existing = config.订阅转换配置;
  const fields = existing && typeof existing === 'object' && !Array.isArray(existing) ? existing : {};
  await write({ 订阅转换配置: { ...fields, SUBAPI: converterBaseURL(snapshot.baseURL), ...(snapshot.config ? {SUBCONFIG:snapshot.config} : {}) } });
}

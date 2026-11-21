// Tool semantics derived from cmliu/edgetunnel admin; GPL-2.0.
import { converterBaseURL } from '../../src/features/tools/converter';
import { normalizeIP } from '../../src/features/tools/ip';
import type { WorkerEnv } from '../env';
import type { TunnelRuntime } from '../types';
const PREFIX = '/api/tools/';
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
export function isPublicHost(hostname: string): boolean {
  const host = hostname.replace(/\.$/, '').toLowerCase();
  if (!host || !host.includes('.') || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || host.startsWith('[')) {
    return false;
  }
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
    const parts = host.split('.').map(Number);
    if (parts.some(part => part > 255)) return false;
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224) {
      return false;
    }
  }
  return true;
}
function isValidIP(value: string): boolean {
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) {
    const parts = value.split('.').map(Number);
    return parts.every(part => part <= 255) && parts[0] !== 0 && parts[0] !== 127;
  }
  if (!value.includes(':') || value.includes('[') || value.includes(']')) return false;
  try {
    const parsed = new URL(`https://[${value}]/`).hostname;
    return parsed !== '[::]' && parsed !== '[::1]';
  } catch {
    return false;
  }
}
function https(value: unknown, allowHTTP = false): URL {
  if (typeof value !== 'string') throw new Error('需要 HTTPS 地址');
  const url = new URL(value.includes('://') ? value : `https://${value}`);
  if ((!['https:', ...(allowHTTP ? ['http:'] : [])].includes(url.protocol)) || url.username || url.password || url.hash) throw new Error('地址必须为 HTTPS，不能包含凭据');
  if (!isPublicHost(url.hostname)) throw new Error('需要公共 HTTPS 地址');
  return url;
}
async function remote(url: URL | string, init?: RequestInit) {
  const response = await fetch(url, { ...init, redirect: 'manual', signal: AbortSignal.timeout(8000) });
  if (response.status >= 300 && response.status < 400) throw new Error('外部服务重定向被拒绝');
  if (!response.ok) throw new Error(`外部服务返回 HTTP ${response.status}`);
  return response;
}
export async function tools(request: Request, env: WorkerEnv, runtime: TunnelRuntime, _ctx: ExecutionContext): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (!path.startsWith(PREFIX)) return null;
  if (request.method !== 'POST') return reply({ error: '请使用 POST' }, 405);
  try {
    const text = await request.text();
    if (text.length > 65536) throw new Error('请求过大');
    let data: Record<string, unknown>;
    try { data = JSON.parse(text) as Record<string, unknown>; } catch { throw new Error('请求 JSON 无效'); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('需要对象');
    const action = path.slice(PREFIX.length);
    if (action === 'network-info') {
      const cf = request.cf || {};
      return reply({ connectingIP: request.headers.get('CF-Connecting-IP') || null, ...Object.fromEntries(['colo', 'country', 'city', 'region', 'asn', 'asOrganization', 'httpProtocol', 'tlsVersion'].map(key => [key, cf[key] ?? null])) });
    }
    if (action === 'converter-presets') {
      const source = 'https://raw.githubusercontent.com/cmliu/cmliu/main/SUBCONFIG.json';
      const value = await (await remote(source)).json() as unknown;
      if (!Array.isArray(value)) throw new Error('预设列表无效');
      return reply(value.filter(row => row && typeof row.label === 'string' && Array.isArray(row.options)).map(row => ({ label: row.label, options: row.options.filter((option: Record<string, unknown>) => option && typeof option.label === 'string' && typeof option.value === 'string') })));
    }
    if (action === 'converter-list') {
      const list = await (await remote('https://raw.githubusercontent.com/cmliu/cmliu/main/SUBAPI.json')).json() as unknown;
      if (!Array.isArray(list)) throw new Error('转换服务列表无效');
      return reply(list.filter(item => item && typeof item.label === 'string' && typeof item.value === 'string' && /^https?:\/\//.test(item.value)).slice(0, 100));
    }
    if (action === 'converter-check') {
      const baseURL = converterBaseURL(https(data.baseURL, true).href); const url = new URL(`${baseURL}/version`);
      const version = await (await remote(url)).text();
      if (version.length > 4096 || !version.toLowerCase().includes('subconverter')) throw new Error('转换服务版本响应无效');
      if (data.config) { const configURL = https(data.config); const config = await (await remote(configURL)).text(); if (!config.trim() || config.length > 1024 * 1024 || /<html/i.test(config)) throw new Error('转换配置响应无效'); }
      return reply({ success: true, version, baseURL });
    }
    if (action === 'ip-info') {
      if (typeof data.ip !== 'string' || !isValidIP(data.ip)) throw new Error('IP 无效');
      let info: Record<string, unknown>;
      try { info = await (await remote(`https://api.ipapi.is/?q=${encodeURIComponent(data.ip)}`)).json() as Record<string, unknown>; } catch { info = await (await remote(`https://api.090227.xyz/api/ipapi?ip=${encodeURIComponent(data.ip)}`)).json() as Record<string, unknown>; }
      if (!info.ip || info.error) throw new Error('IP 信息响应无效');
      return reply(normalizeIP(info));
    }
    return reply({ error: '工具不存在' }, 404);
  } catch (error) {
    // Fetch errors may contain upstream URLs and tokens. Keep network failures generic.
    const message = error instanceof Error && !/fetch|abort|network|https?:|token/i.test(error.message) ? error.message : '外部服务请求失败或超时';
    return reply({ error: message }, 400);
  }
}

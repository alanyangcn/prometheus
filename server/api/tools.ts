// Tool semantics derived from cmliu/edgetunnel admin; GPL-2.0.
import { converterBaseURL } from '../../src/features/tools/converter';
import { normalizeIP } from '../../src/features/tools/ip';
import type { WorkerEnv } from '../env';
import type { TunnelRuntime } from '../types';
const PREFIX = '/api/tools/';
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
function https(value: unknown, allowHTTP = false): URL {
  if (typeof value !== 'string') throw new Error('需要 HTTPS 地址');
  const url = new URL(value.includes('://') ? value : `https://${value}`);
  if ((!['https:', ...(allowHTTP ? ['http:'] : [])].includes(url.protocol)) || url.username || url.password || url.hash) throw new Error('地址必须为 HTTPS，不能包含凭据');
  if (url.hostname === 'localhost' || /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname) || url.hostname.startsWith('[')) throw new Error('需要公共 HTTPS 地址');
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
    if (action === 'path-presets' || action === 'converter-presets') {
      const source = action === 'path-presets' ? 'https://raw.githubusercontent.com/cmliu/cmliu/main/json/edt-path-config.json' : 'https://raw.githubusercontent.com/cmliu/cmliu/main/SUBCONFIG.json';
      const value = await (await remote(source)).json() as unknown;
      if (!Array.isArray(value)) throw new Error('预设列表无效');
      if (action === 'path-presets') return reply(value.filter(row => row && typeof row.项目名 === 'string' && row.路径模板 && typeof row.路径模板 === 'object').map(row => ({ label: row.项目名, templates: row.路径模板, ...(typeof row.提示消息 === 'string' ? { message: row.提示消息 } : {}) })));
      return reply(value.filter(row => row && typeof row.label === 'string' && Array.isArray(row.options)).map(row => ({ label: row.label, options: row.options.filter((option: Record<string, unknown>) => option && typeof option.label === 'string' && typeof option.value === 'string') })));
    }
    if (action === 'proxy-directory') {
      if (!['socks5', 'http', 'https', 'proxyip'].includes(String(data.type))) throw new Error('代理目录类型无效');
      const source = data.type === 'proxyip' ? 'https://zip.cm.edu.kg.cmliussss.net/all.json' : `https://raw.githubusercontent.com/EDT-Pages/Proxy-List/main/data/${data.type}.json`;
      const value = await (await remote(source)).json() as unknown;
      const rows = data.type === 'proxyip' && value && typeof value === 'object' && 'data' in value ? (value as {data: unknown}).data : value;
      if (!Array.isArray(rows)) throw new Error('代理目录响应无效');
      const entries = rows.filter(row => row && typeof row === 'object').filter(row => data.type !== 'proxyip' || (Array.isArray(row.port) ? row.port.includes(443) : row.port === 443)).map(row => {
        const meta = data.type === 'proxyip' ? (row.meta || {}) : row;
        return { address: String(data.type === 'proxyip' ? row.ip || '' : row.proxy || ''), country: String(meta.country || 'Unknown'), countryName: String(meta.country_cn || meta.country_en || meta.country || '未知'), city: String(meta.city || ''), asn: meta.asn || '', organization: String(meta.asOrganization || ''), protocol: String(row.protocol || data.type) };
      }).filter(row => row.address.length > 0 && row.address.length < 4096 && !/[\r\n]/.test(row.address));
      return reply(entries.slice(0, 20000));
    }
    if (action === 'proxyip-check') {
      if (typeof data.address !== 'string' || !/^[\da-fA-F:.]+$/.test(data.address)) throw new Error('PROXYIP 地址无效');
      const result = await (await remote(`https://api.090227.xyz/check?proxyip=${encodeURIComponent(data.address)}`)).json() as Record<string, unknown>;
      if (typeof result.success !== 'boolean') throw new Error('PROXYIP 检测响应无效');
      return reply({ success: result.success, responseTime: Number(result.responseTime) || null, supports_ipv4: result.supports_ipv4 === true, supports_ipv6: result.supports_ipv6 === true });
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
      if (typeof data.ip !== 'string' || !/^[\da-fA-F:.]+$/.test(data.ip)) throw new Error('IP 无效');
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

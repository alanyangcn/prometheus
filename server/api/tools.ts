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
  const response = await fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`外部服务返回 HTTP ${response.status}`);
  return response;
}
function credentials(data: Record<string, unknown>, saved: string | null): Record<string, unknown> {
  const values = Object.values(data).filter(value => typeof value === 'string' && value.trim());
  return values.length ? data : JSON.parse(saved || '{}');
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
    if (action === 'telegram-check' || action === 'telegram-send-test') {
      const c = credentials(data, await env.KV!.get('tg.json'));
      if (typeof c.BotToken !== 'string' || !/^\d+:[\w-]+$/.test(c.BotToken) || typeof c.ChatID !== 'string' || !c.ChatID) throw new Error('Telegram 凭据不完整');
      // Telegram requires its token in the upstream path; never return or log it.
      const method = action === 'telegram-check' ? 'getMe' : 'sendMessage';
      const result = await (await remote(`https://api.telegram.org/bot${c.BotToken}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(method === 'getMe' ? {} : { chat_id: c.ChatID, text: 'Prometheus 管理界面测试通知' }) })).json() as { ok?: boolean; result?: { username?: string; is_bot?: boolean } };
      if (!result.ok || (method === 'getMe' && !result.result?.is_bot)) throw new Error('Telegram 验证失败');
      return reply({ success: true, username: method === 'getMe' ? result.result?.username : undefined, message: method === 'getMe' ? 'Bot 有效；Chat ID 投递状态需显式发送测试确认' : '测试通知已发送' });
    }
    if (action === 'cloudflare-check') {
      const c = credentials(data, await env.KV!.get('cf.json'));
      if (c.UsageAPI) {
        const usage = await (await remote(https(c.UsageAPI))).json() as Record<string, unknown>;
        if (usage.success !== true || !Number.isFinite(usage.total) || !Number.isFinite(usage.max)) throw new Error('UsageAPI 响应无效');
        return reply({ success: true, total: usage.total, max: usage.max });
      }
      let account = c.AccountID;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (c.APIToken && account) headers.Authorization = `Bearer ${String(c.APIToken)}`;
      else if (c.Email && c.GlobalAPIKey) { headers['X-Auth-Email'] = String(c.Email); headers['X-Auth-Key'] = String(c.GlobalAPIKey); }
      else throw new Error('Cloudflare 凭据不完整');
      if (!account) {
        const result = await (await remote('https://api.cloudflare.com/client/v4/accounts', { headers })).json() as { success?: boolean; result?: { id: string; name?: string }[] };
        if (!result.success || !result.result?.length) throw new Error('Cloudflare 账户验证失败');
        account = (result.result.find(a => a.name?.toLowerCase().startsWith(String(c.Email).toLowerCase())) || result.result[0]).id;
      }
      const now = new Date(); const start = new Date(now); start.setUTCHours(0, 0, 0, 0);
      type UsageRow = { sum?: { requests?: number } };
      type UsageAccount = { pagesFunctionsInvocationsAdaptiveGroups?: UsageRow[]; workersInvocationsAdaptive?: UsageRow[] };
      const result = await (await remote('https://api.cloudflare.com/client/v4/graphql', { method: 'POST', headers, body: JSON.stringify({ query: 'query getBillingMetrics($AccountID: String!, $filter: AccountWorkersInvocationsAdaptiveFilter_InputObject) { viewer { accounts(filter: {accountTag: $AccountID}) { pagesFunctionsInvocationsAdaptiveGroups(limit: 1000, filter: $filter) { sum { requests } } workersInvocationsAdaptive(limit: 10000, filter: $filter) { sum { requests } } } } }', variables: { AccountID: account, filter: { datetime_geq: start.toISOString(), datetime_leq: now.toISOString() } } }) })).json() as { errors?: unknown[]; data?: { viewer?: { accounts?: UsageAccount[] } } };
      const accountData = result.data?.viewer?.accounts?.[0];
      if (result.errors?.length || !accountData) throw new Error('Cloudflare 用量查询失败');
      const sum = (rows: UsageRow[] | undefined) => (rows || []).reduce((total, row) => total + Number(row.sum?.requests || 0), 0);
      const pages = sum(accountData.pagesFunctionsInvocationsAdaptiveGroups), workers = sum(accountData.workersInvocationsAdaptive);
      if (!Number.isFinite(pages + workers)) throw new Error('Cloudflare 用量响应无效');
      return reply({ success: true, pages, workers, total: pages + workers, max: 100000 });
    }
    if (action === 'ip-info') {
      if (typeof data.ip !== 'string' || !/^[\da-fA-F:.]+$/.test(data.ip)) throw new Error('IP 无效');
      let info: Record<string, unknown>;
      try { info = await (await remote(`https://api.ipapi.is/?q=${encodeURIComponent(data.ip)}`)).json() as Record<string, unknown>; } catch { info = await (await remote(`https://api.090227.xyz/api/ipapi?ip=${encodeURIComponent(data.ip)}`)).json() as Record<string, unknown>; }
      if (!info.ip || info.error) throw new Error('IP 信息响应无效');
      return reply(normalizeIP(info));
    }
    if (action === 'snippet') {
      if (typeof data.uuid !== 'string' || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(data.uuid)) throw new Error('UUID 无效');
      const source = await (await remote('https://raw.githubusercontent.com/EDT-Pages/EDT.min.js/Snippets/EDT.min.js')).text();
      const pattern = /(const\s+userID\s*=\s*["'])([^"']*)(["']\s*,\s*Password\s*=\s*["'])([^"']*)(["']\s*;)/;
      if (/[\u0590-\u05ff]/.test(source) || /(?:hebrewPadding|religiousPadding|SNIPPETS_DICT|applySnippetDictionary|犹太|希伯来填充)/i.test(source)) throw new Error('Snippet 上游源码包含不兼容的填充或字典内容');
      if (source.length > 1024 * 1024 || !pattern.test(source)) throw new Error('Snippet 源码结构不兼容');
      return reply({ code: source.replace(pattern, (_match, a, _id, b, _password, end) => `${a}${data.uuid}${b}${runtime.sha224(data.uuid)}${end}`) });
    }
    return reply({ error: '工具不存在' }, 404);
  } catch (error) {
    // Fetch errors may contain upstream URLs and tokens. Keep network failures generic.
    const message = error instanceof Error && !/fetch|abort|network|https?:|token/i.test(error.message) ? error.message : '外部服务请求失败或超时';
    return reply({ error: message }, 400);
  }
}

import { tools } from './tools';
import type { WorkerEnv } from '../env';
import type { TunnelRuntime } from '../types';
import type { Configuration, JsonValue } from '../../shared/config';
import { administrator, authenticated, authToken, cookie, identity } from '../auth/session';

function json(value: unknown, status = 200, headers?: HeadersInit): Response {
  const response = Response.json(value, { status, headers });
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}
function object(value: unknown): value is Configuration {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
const aliases: Record<string, string> = {
  '/admin/config.json': '/api/config', '/admin/ADD.txt': '/api/addresses',
  '/admin/log.json': '/api/logs', '/admin/init': '/api/config/reset',
};
function validateShape(value: JsonValue, model: JsonValue, location = 'config'): void {
  if (value === null && ['config.ECHConfig.SNI', 'config.TLS分片', 'config.优选订阅生成.SUB', 'config.反代.SOCKS5.启用'].includes(location)) return;
  if (Array.isArray(model)) {
    if (!Array.isArray(value) || value.some(x => typeof x !== 'string')) throw new Error(`${location} 必须是字符串数组`);
  } else if (object(model)) {
    if (!object(value)) throw new Error(`${location} 必须是对象`);
    for (const [key, item] of Object.entries(value)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key) || !(key in model)) throw new Error(`${location}.${key} 不受支持`);
      validateShape(item, model[key], `${location}.${key}`);
    }
  } else if (model !== null && typeof value !== typeof model) throw new Error(`${location} 类型不正确`);
  else if (model === null && value !== null && !['string', 'boolean'].includes(typeof value)) throw new Error(`${location} 类型不正确`);
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error(`${location} 数值不正确`);
}
function merge(base: Configuration, update: Configuration): Configuration {
  const result = { ...base };
  for (const [key, value] of Object.entries(update)) result[key] = object(value) && object(base[key]) ? merge(base[key], value) : value;
  return result;
}
function validateConfig(update: Configuration, baseline: Configuration): void {
  validateShape(update, baseline);
  const preferred = object(update.优选订阅生成) ? update.优选订阅生成 : {};
  const pool = object(preferred.本地IP库) ? preferred.本地IP库 : {};
  if (pool.随机数量 !== undefined && (!Number.isInteger(pool.随机数量) || Number(pool.随机数量) < 1 || Number(pool.随机数量) > 1024)) throw new Error('随机数量必须为 1–1024');
  if (pool.指定端口 !== undefined && (pool.指定端口 !== -1 && (!Number.isInteger(pool.指定端口) || Number(pool.指定端口) < 1 || Number(pool.指定端口) > 65535))) throw new Error('端口必须为 -1 或 1–65535');
  if (update.协议类型 !== undefined && !['vless', 'trojan', 'ss'].includes(String(update.协议类型))) throw new Error('不支持的协议');
  if (update.传输协议 !== undefined && !['ws', 'grpc', 'xhttp'].includes(String(update.传输协议))) throw new Error('不支持的传输协议');
  if (update.SS && object(update.SS) && update.SS.加密方式 !== undefined && !['aes-128-gcm', 'aes-256-gcm'].includes(String(update.SS.加密方式))) throw new Error('不支持的 Shadowsocks 加密算法');
}
async function body(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length > 1024 * 1024) throw new Error('请求过大');
  return JSON.parse(text);
}

export async function management(request: Request, env: WorkerEnv, runtime: TunnelRuntime, ctx: ExecutionContext): Promise<Response | null> {
  const url = new URL(request.url);
  const originalPath = url.pathname;
  const path = aliases[originalPath] || originalPath;
  const write = !['GET', 'HEAD'].includes(request.method);
  if (write) {
    const origin = request.headers.get('Origin');
    if (origin && origin !== url.origin) return json({ error: '拒绝跨站请求' }, 403);
    if (!['POST', 'PUT'].includes(request.method)) return json({ error: '不支持此方法' }, 405);
  }
  if (path === '/api/session') return json({ configured: !!administrator(env), authenticated: await authenticated(runtime, request, env), storage: !!env.KV });
  if (path === '/api/login' || (originalPath === '/login' && write)) {
    const missing = [...(!administrator(env) ? ['ADMIN'] : []), ...(!env.KV ? ['KV'] : [])];
    if (missing.length) return json({ error: `请先配置 ${missing.join(' 和 ')}` }, 503);
    if (!write) return json({ error: '请使用 POST' }, 405);
    let password: unknown;
    try {
      if ((request.headers.get('Content-Type') || '').includes('application/json')) {
        const data = await body(request);
        password = object(data) ? data.password : null;
      } else password = new URLSearchParams(await request.text()).get('password');
    } catch { return json({ error: '无效的登录请求' }, 400); }
    if (typeof password !== 'string' || password !== administrator(env).replace(/[\r\n]/g, '')) return json({ error: '密码错误' }, 401);
    return json({ success: true }, 200, { 'Set-Cookie': cookie(request, await authToken(runtime, request, env)) });
  }
  if (path === '/api/logout' || originalPath === '/logout') {
    if (path === '/api/logout' && !write) return json({ error: '请使用 POST' }, 405);
    return json({ success: true }, 200, { 'Set-Cookie': cookie(request, '') });
  }
  const known = ['/api/config', '/api/config/reset', '/api/addresses', '/api/logs', '/api/proxy-check'];
  if (!known.includes(path) && !path.startsWith('/api/tools/')) return null;
  if (!await authenticated(runtime, request, env)) return json({ error: '请先登录' }, 401);
  if (!env.KV) return json({ error: '请绑定 KV 命名空间' }, 503);
  const id = await identity(runtime, env, url.hostname);
  const record = (event: string) => {
    ctx.waitUntil((async () => {
      const config = runtime.config_JSON || await runtime.readConfig(env, id.host, id.uuid, request.headers.get('User-Agent') || 'null');
      await runtime.recordLog(env, request, request.headers.get('CF-Connecting-IP') || 'unknown', event, config);
    })().catch(() => {}));
  };
  try {
    if (path.startsWith('/api/tools/')) return tools(request, env, runtime, ctx);
    if (path === '/api/proxy-check') {
      if (!write) return json({ error: '请使用 POST' }, 405);
      const data = await body(request);
      if (!object(data) || !['socks5', 'http', 'https', 'turn', 'sstp'].includes(String(data.type)) || typeof data.address !== 'string') throw new Error('无效的代理设置');
      const parsed = runtime.parseProxyAddress(data.address, runtime.proxyDefaultPort(String(data.type)));
      if (!parsed.hostname || !Number.isInteger(parsed.port) || parsed.port < 1 || parsed.port > 65535) throw new Error('代理地址或端口无效');
      const target = new URL(request.url); target.pathname = '/admin/check'; target.search = '';
      target.searchParams.set(String(data.type), data.address);
      return runtime.worker.fetch(new Request(target, { headers: request.headers }), env, { waitUntil: () => {}, passThroughOnException: () => {} } as unknown as ExecutionContext);
    }
    if (path === '/api/config/reset') {
      if (!write && originalPath !== '/admin/init') return json({ error: '请使用 POST' }, 405);
      const config = await runtime.readConfig(env, id.host, id.uuid, request.headers.get('User-Agent') || 'null', true);
      record('Init_Config');
      return json(config);
    }
    if (path === '/api/config') {
      const config: Configuration = await runtime.readConfig(env, id.host, id.uuid, request.headers.get('User-Agent') || 'null');
      if (!write) return json(config);
      const update = await body(request);
      if (!object(update)) throw new Error('配置必须是对象');
      validateConfig(update, config);
      const saved = merge(config, update);
      if (saved.协议类型 === 'ss' && saved.传输协议 !== 'ws') throw new Error('Shadowsocks 仅支持 WebSocket 传输');
      await env.KV.put('config.json', JSON.stringify(saved));
      record('Save_Config');
      return json({ success: true });
    }
    if (path === '/api/addresses') {
      if (!write) {
        const text = await env.KV.get('ADD.txt') || '';
        if (originalPath === '/admin/ADD.txt') return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
        return json({ text });
      }
      let text: unknown;
      if (originalPath === '/admin/ADD.txt') text = await request.text();
      else { const data = await body(request); text = object(data) ? data.text : null; }
      if (typeof text !== 'string' || text.length > 1024 * 1024) throw new Error('地址库必须是文本且不超过 1 MiB');
      await env.KV.put('ADD.txt', text);
      record('Save_Custom_IPs');
      return json({ success: true });
    }
    if (path === '/api/logs') {
      if (write) return json({ error: '日志接口只读' }, 405);
      return json(JSON.parse(await env.KV.get('log.json') || '[]'));
    }
    return json({ error: 'Not found' }, 404);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : '请求失败' }, 400);
  }
}

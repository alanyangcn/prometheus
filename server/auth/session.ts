import type { WorkerEnv } from '../env';
import type { TunnelRuntime } from '../types';

export type RuntimeSource = TunnelRuntime | (() => TunnelRuntime);
function resolveRuntime(source: RuntimeSource): TunnelRuntime {
  return typeof source === 'function' ? source() : source;
}

export const DEFAULT_KEY = '勿动此默认密钥，有需求请自行通过添加变量KEY进行修改';
export function administrator(env: WorkerEnv): string {
  return env.GO_ON || env.admin || env.PASSWORD || env.password || env.pswd || env.TOKEN || env.KEY || env.UUID || env.uuid || '';
}
export function readCookies(header: string | null, name: string, limit = 8): string[] {
  if (!header) return [];
  const prefix = `${name}=`;
  const values: string[] = [];
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      const value = trimmed.slice(prefix.length);
      if (value) values.push(value);
      if (values.length >= limit) break;
    }
  }
  return values;
}
export async function identity(runtime: RuntimeSource, env: WorkerEnv, hostname: string) {
  const admin = administrator(env);
  const key = env.KEY || DEFAULT_KEY;
  const hash = await resolveRuntime(runtime).hashIdentity(admin + key);
  const fixed = env.UUID || env.uuid;
  const uuid = fixed && /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(fixed)
    ? fixed.toLowerCase()
    : [hash.slice(0, 8), hash.slice(8, 12), '4' + hash.slice(13, 16), '8' + hash.slice(17, 20), hash.slice(20)].join('-');
  const host = env.HOST ? env.HOST.split(/[\s,]+/)[0].toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split(':')[0] : hostname;
  return { admin, key, uuid, host };
}
function equals(left: string, right: string): boolean {
  let mismatch = left.length ^ right.length;
  for (let i = 0; i < right.length; i++) mismatch |= (left.charCodeAt(i) || 0) ^ right.charCodeAt(i);
  return mismatch === 0;
}
export async function authToken(runtime: RuntimeSource, request: Request, env: WorkerEnv): Promise<string> {
  return resolveRuntime(runtime).hashIdentity((request.headers.get('User-Agent') || 'null') + (env.KEY || DEFAULT_KEY) + administrator(env));
}
export async function authenticated(runtime: RuntimeSource, request: Request, env: WorkerEnv): Promise<boolean> {
  if (!administrator(env)) return false;
  const cookies = readCookies(request.headers.get('Cookie'), 'auth');
  if (!cookies.length) return false;
  const expected = await authToken(runtime, request, env);
  return cookies.some(token => equals(token, expected));
}
export function cookie(request: Request, token: string): string {
  const secure = new URL(request.url).protocol === 'https:';
  return `auth=${token}; Path=/; Max-Age=${token ? 86400 : 0}; HttpOnly; ${secure ? 'Secure; ' : ''}SameSite=Lax`;
}

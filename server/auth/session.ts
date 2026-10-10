import type { WorkerEnv } from '../env';
import type { TunnelRuntime } from '../types';

export const DEFAULT_KEY = '勿动此默认密钥，有需求请自行通过添加变量KEY进行修改';
export function administrator(env: WorkerEnv): string {
  return env.ADMIN || env.admin || env.PASSWORD || env.password || env.pswd || env.TOKEN || env.KEY || env.UUID || env.uuid || '';
}
export async function identity(runtime: TunnelRuntime, env: WorkerEnv, hostname: string) {
  const admin = administrator(env);
  const key = env.KEY || DEFAULT_KEY;
  const hash = await runtime.hashIdentity(admin + key);
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
export async function authToken(runtime: TunnelRuntime, request: Request, env: WorkerEnv): Promise<string> {
  return runtime.hashIdentity((request.headers.get('User-Agent') || 'null') + (env.KEY || DEFAULT_KEY) + administrator(env));
}
export async function authenticated(runtime: TunnelRuntime, request: Request, env: WorkerEnv): Promise<boolean> {
  if (!administrator(env)) return false;
  const cookie = (request.headers.get('Cookie') || '').split(';').find(x => x.trim().startsWith('auth='))?.trim().slice(5) || '';
  return !!cookie && equals(cookie, await authToken(runtime, request, env));
}
export function cookie(request: Request, token: string): string {
  const secure = new URL(request.url).protocol === 'https:';
  return `auth=${token}; Path=/; Max-Age=${token ? 86400 : 0}; HttpOnly; ${secure ? 'Secure; ' : ''}SameSite=Lax`;
}

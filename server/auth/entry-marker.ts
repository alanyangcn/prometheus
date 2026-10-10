import { administrator } from './session';
import type { WorkerEnv } from '../env';

const COOKIE = 'prometheus_entry';
const LIFETIME = 30 * 60;
const encoder = new TextEncoder();

async function key(env: WorkerEnv, base: string) {
  return crypto.subtle.importKey('raw', encoder.encode(JSON.stringify([base, administrator(env), env.KEY || ''])), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

/** This records entry discovery only; it never grants authentication. */
export async function hasEntryMarker(request: Request, env: WorkerEnv, base: string): Promise<boolean> {
  if (!base) return false;
  const value = (request.headers.get('Cookie') || '').split(';').map(part => part.trim()).find(part => part.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1) || '';
  const match = /^(\d{10})\.([a-f0-9]{64})$/.exec(value);
  if (!match) return false;
  const expires = Number(match[1]);
  const now = Math.floor(Date.now() / 1000);
  if (expires <= now || expires > now + LIFETIME) return false;
  const signature = Uint8Array.from(match[2]!.match(/../g)!, hex => parseInt(hex, 16));
  return crypto.subtle.verify('HMAC', await key(env, base), signature, encoder.encode(match[1]!));
}

export async function recordEntry(response: Response, request: Request, env: WorkerEnv, base: string): Promise<Response> {
  // Keep the original expiry: refreshes and redirects do not extend the 30-minute window.
  if (await hasEntryMarker(request, env, base)) return response;
  const expires = String(Math.floor(Date.now() / 1000) + LIFETIME);
  const signature = await crypto.subtle.sign('HMAC', await key(env, base), encoder.encode(expires));
  const hex = Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('');
  const secure = new URL(request.url).protocol === 'https:';
  const headers = new Headers(response.headers);
  headers.append('Set-Cookie', `${COOKIE}=${expires}.${hex}; Path=/; Max-Age=${LIFETIME}; Expires=${new Date(Number(expires) * 1000).toUTCString()}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`);
  headers.set('Cache-Control', 'no-store');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

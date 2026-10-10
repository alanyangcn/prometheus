import { connect } from 'cloudflare:sockets';
import { createRuntime } from './runtime';
import { management } from './api/management';
import { administrator, authenticated } from './auth/session';
import type { WorkerEnv } from './env';
import { hasEntryMarker, recordEntry } from './auth/entry-marker';

const legacyManagementPaths = new Set(['/admin/config.json', '/admin/ADD.txt', '/admin/log.json', '/admin/init', '/admin/getADDAPI', '/admin/check']);
const managementPages = new Set(['/spark', '/Illumination', '/Illumination/settings', '/Illumination/subscription', '/Illumination/addresses', '/Illumination/proxies', '/Illumination/logs', '/Illumination/tools', '/Illumination/optimize']);
function managementBase(env: WorkerEnv): string {
  const value = env.ADMIN_PATH?.trim().replace(/^\/+|\/+$/g, '') || '';
  // One URL-safe segment; never collide with assets, API or protocol endpoints.
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(value) || /^(api|assets|src|node_modules|@.*|sub|version|locations|robots\.txt|login|admin|spark|Illumination|setup|logout)$/i.test(value)) return '';
  return '/' + value;
}
function notFound(): Response {
  return new Response('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>404</title><style>body{margin:0;min-height:100vh;display:grid;place-content:center;text-align:center;font-family:system-ui,sans-serif;color:#64748b;background:#f8fafc}h1{font-size:64px;margin:0;color:#1e293b}a{color:inherit}@media(prefers-color-scheme:dark){body{background:#0f172a;color:#94a3b8}h1{color:#e2e8f0}}</style></head><body><h1>404</h1><p>页面不存在</p><a href="/">返回首页</a></body></html>', { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const base = managementBase(env);
    const prefixed = !!base && (url.pathname === base || url.pathname.startsWith(base + '/'));
    const pagePath = prefixed ? url.pathname.slice(base.length) || '/' : '';
    const serveApp = async (incoming: Request, path: string) => {
      if (!env.ASSETS) return new Response('Prometheus: build frontend assets with npm run build.', { status: 503 });
      const adminPage = managementPages.has(path) || path === '/setup';
      if (adminPage && !base) return notFound();
      const target = new URL(incoming.url);
      const assetPath = adminPage ? '/admin.html' : path === '/' ? '/index.html' : path;
      if (target.pathname !== assetPath) target.search = '';
      target.pathname = assetPath;
      const response = await env.ASSETS.fetch(new Request(target, { method: 'GET', headers: incoming.headers }));
      if (!adminPage || !response.ok) return response;
      // Runtime environment determines the router base; the public homepage never receives it.
      const html = new HTMLRewriter().on('head', {
        element(element) { element.append(`<meta name="management-base" content="${base}/">`, { html: true }); },
      }).transform(response);
      const headers = new Headers(html.headers);
      headers.set('Cache-Control', 'no-store');
      headers.delete('ETag');
      headers.delete('Content-Length');
      return new Response(html.body, { status: html.status, headers });
    };
    const runtime = createRuntime({ socketConnect: connect, serveApp });
    const rememberEntry = (response: Response) => recordEntry(response, request, env, base);
    const outsidePage = async () => base && await hasEntryMarker(request, env, base) ? redirectToLogin() : notFound();
    const redirectToLogin = () => new Response(null, { status: 302, headers: { Location: base + '/spark', 'Cache-Control': 'no-store' } });
    try {
      const upgrade = request.headers.get('Upgrade')?.toLowerCase() === 'websocket';
      const read = request.method === 'GET' || request.method === 'HEAD';
      if (prefixed && !upgrade && legacyManagementPaths.has(pagePath)) {
        if (!await authenticated(runtime, request, env)) return read ? rememberEntry(redirectToLogin()) : Response.json({ error: '请先登录' }, { status: 401 });
        const normalizedUrl = new URL(request.url);
        normalizedUrl.pathname = pagePath;
        const normalizedRequest = new Request(normalizedUrl, request);
        const response = await management(normalizedRequest, env, runtime, ctx);
        const result = response || await runtime.worker.fetch(normalizedRequest, env, ctx);
        return read ? rememberEntry(result) : result;
      }
      if (prefixed && !upgrade && read) {
        if (pagePath === '/setup' || pagePath === '/') return rememberEntry(redirectToLogin());
        if (managementPages.has(pagePath)) {
          if (pagePath !== '/spark' && (!env.KV || !await authenticated(runtime, request, env))) return rememberEntry(redirectToLogin());
          return rememberEntry(await serveApp(request, pagePath));
        }
        // Browser navigation to any other path within the management prefix requires login.
        if (!await authenticated(runtime, request, env)) return rememberEntry(redirectToLogin());
        return rememberEntry(notFound());
      }
      // Outside paths reveal the entry only to browsers with an unexpired discovery marker.
      if (!upgrade && (url.pathname === '/spark' || url.pathname === '/Illumination' || url.pathname.startsWith('/Illumination/') || url.pathname === '/admin.html' || url.pathname === '/login' || url.pathname === '/setup' || url.pathname === '/admin' || url.pathname.startsWith('/admin/'))) return read ? outsidePage() : notFound();
      if (url.pathname === '/api/health') return Response.json({ name: 'prometheus', status: 'ok' });
      const response = await management(request, env, runtime, ctx);
      if (response) return response;
      if (url.pathname.startsWith('/api/')) return Response.json({ error: 'Not found' }, { status: 404 });
      const tunnel = upgrade || request.method === 'POST';
      if (tunnel && !administrator(env)) return Response.json({ error: '请先配置 ADMIN' }, { status: 503 });
      if (!tunnel && url.pathname === '/') return serveApp(request, '/');
      const legacyRoutes = ['/sub', '/version', '/locations', '/robots.txt'];
      const quickSubscription = env.KEY && url.pathname === '/' + env.KEY;
      const uuidPath = /^\/[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(url.pathname);
      if (!tunnel && !legacyRoutes.includes(url.pathname) && !quickSubscription && !uuidPath) {
        // Assets are needed by both public photography and login pages. Unknown assets return 404.
        if (url.pathname === '/favicon.svg' || url.pathname.startsWith('/assets/') || url.pathname.startsWith('/src/') || url.pathname.startsWith('/@') || url.pathname.startsWith('/node_modules/')) return serveApp(request, url.pathname);
        return read ? outsidePage() : notFound();
      }
      if (!tunnel && !administrator(env)) return notFound();
      return await runtime.worker.fetch(request, env, ctx);
    } catch (error) {
      console.error('Prometheus request failed:', error instanceof Error ? error.message : 'Unknown error');
      return Response.json({ error: '请求处理失败' }, { status: 500 });
    }
  },
} satisfies ExportedHandler<WorkerEnv>;

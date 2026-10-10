import { connect } from 'cloudflare:sockets';
import { createRuntime } from './runtime';
import { management } from './api/management';
import { administrator, authenticated } from './auth/session';
import type { WorkerEnv } from './env';

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/health') return Response.json({ name: 'prometheus', status: 'ok' });
    const serveApp = async (incoming: Request, path: string) => {
      if (!env.ASSETS) return new Response('Prometheus: build frontend assets with npm run build.', { status: 503 });
      const target = new URL(incoming.url); target.pathname = path; target.search = '';
      return env.ASSETS.fetch(new Request(target, { method: 'GET', headers: incoming.headers }));
    };
    const runtime = createRuntime({ socketConnect: connect, serveApp });
    try {
      const response = await management(request, env, runtime, ctx);
      if (response) return response;
      if (url.pathname.startsWith('/api/')) return Response.json({ error: 'Not found' }, { status: 404 });
      const upgrade = request.headers.get('Upgrade')?.toLowerCase() === 'websocket';
      const tunnel = upgrade || (request.method === 'POST' && !url.pathname.startsWith('/admin/') && url.pathname !== '/login');
      if (tunnel && !administrator(env)) return Response.json({ error: '请先配置 ADMIN' }, { status: 503 });
      const localPages = ['/', '/login', '/admin', '/setup', '/admin/settings', '/admin/addresses', '/admin/proxies', '/admin/logs', '/admin/integrations', '/admin/tools', '/admin/optimize'];
      if (!tunnel && localPages.includes(url.pathname)) return serveApp(request, url.pathname);
      // All management routes remain protected, including legacy diagnostics.
      if (url.pathname.startsWith('/admin/') && !await authenticated(runtime, request, env)) return Response.json({ error: '请先登录' }, { status: 401 });
      const legacyRoutes = ['/sub', '/version', '/locations', '/robots.txt'];
      const quickSubscription = env.KEY && url.pathname === '/' + env.KEY;
      const uuidPath = /^\/[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(url.pathname);
      if (!tunnel && !url.pathname.startsWith('/admin/') && !legacyRoutes.includes(url.pathname) && !quickSubscription && !uuidPath) return serveApp(request, url.pathname);
      if (!tunnel && !administrator(env)) return serveApp(request, '/setup');
      return await runtime.worker.fetch(request, env, ctx);
    } catch (error) {
      console.error('Prometheus request failed:', error instanceof Error ? error.message : 'Unknown error');
      return Response.json({ error: '请求处理失败' }, { status: 500 });
    }
  },
} satisfies ExportedHandler<WorkerEnv>;

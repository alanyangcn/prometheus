import { createRouter, createWebHistory } from 'vue-router';
import { useSessionStore } from '../stores/session';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('../views/HomeView.vue') },
    { path: '/setup', component: () => import('../views/SetupView.vue') },
    { path: '/login', component: () => import('../views/LoginView.vue') },
    { path: '/admin', component: () => import('../views/DashboardView.vue'), meta: { authenticated: true } },
    { path: '/admin/settings', component: () => import('../views/SettingsView.vue'), meta: { authenticated: true } },
    { path: '/admin/addresses', component: () => import('../views/AddressesView.vue'), meta: { authenticated: true } },
    { path: '/admin/proxies', component: () => import('../views/ProxiesView.vue'), meta: { authenticated: true } },
    { path: '/admin/tools', component: () => import('../views/ToolsView.vue'), meta: { authenticated: true } },
    { path: '/admin/optimize', component: () => import('../views/OptimizeView.vue'), meta: { authenticated: true } },
    { path: '/admin/logs', component: () => import('../views/LogsView.vue'), meta: { authenticated: true } },
    { path: '/admin/integrations', component: () => import('../views/IntegrationsView.vue'), meta: { authenticated: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});
router.beforeEach(async to => {
  if (!to.meta.authenticated && to.path !== '/login') return;
  const session = useSessionStore();
  try {
    const state = await session.refresh();
    if (!state.configured) return '/setup';
    if (to.meta.authenticated && !state.authenticated) return '/login';
    if (to.path === '/login' && state.authenticated) return '/admin';
  } catch { if (to.meta.authenticated) return '/login'; }
});
export default router;

import { createRouter, createWebHistory } from 'vue-router';
import { useSessionStore } from '../stores/session';

const router = createRouter({
  history: createWebHistory(document.querySelector<HTMLMetaElement>('meta[name=management-base]')?.content || '/__disabled/'),
  routes: [
    { path: '/setup', redirect: '/spark' },
    { path: '/spark', component: () => import('../views/LoginView.vue') },
    { path: '/Illumination', component: () => import('../views/DashboardView.vue'), meta: { authenticated: true } },
    { path: '/Illumination/network', component: () => import('../views/NetworkView.vue'), meta: { authenticated: true } },
    { path: '/Illumination/settings', component: () => import('../views/SettingsView.vue'), meta: { authenticated: true } },
    { path: '/Illumination/subscription', component: () => import('../views/SubscriptionView.vue'), meta: { authenticated: true } },
    { path: '/Illumination/conversion', component: () => import('../views/ConversionView.vue'), meta: { authenticated: true } },
    { path: '/Illumination/cdn', component: () => import('../views/CdnView.vue'), meta: { authenticated: true } },
    { path: '/Illumination/ech', component: () => import('../views/EchView.vue'), meta: { authenticated: true } },
    { path: '/Illumination/logs', component: () => import('../views/LogsView.vue'), meta: { authenticated: true } },
    { path: '/:pathMatch(.*)*', redirect: '/spark' },
  ],
});
router.beforeEach(async to => {
  if (!to.meta.authenticated && to.path !== '/spark') return;
  const session = useSessionStore();
  try {
    const state = await session.refresh();
    if ((!state.configured || !state.storage) && to.path !== '/spark') return '/spark';
    if (to.meta.authenticated && !state.authenticated) return '/spark';
    if (to.path === '/spark' && state.authenticated && state.storage) return '/Illumination';
  } catch { if (to.meta.authenticated) return '/spark'; }
});
export default router;

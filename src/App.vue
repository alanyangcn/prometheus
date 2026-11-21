<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTheme } from './composables/useTheme';
import { useToastMessage } from './composables/useToast';
import { useSessionStore } from './stores/session';
import AppToast from './components/AppToast.vue';
import ResetConfiguration from './components/ResetConfiguration.vue';
const route = useRoute(), router = useRouter(), session = useSessionStore();
const { dark, toggleTheme } = useTheme();
const menuOpen = ref(false), pageVersion = ref(0);
const resetDialog = ref<InstanceType<typeof ResetConfiguration> | null>(null);
const error = useToastMessage('error'), notice = useToastMessage('success');
const isLogin = computed(() => route.path === '/spark');
const navigation = [
  { path: '/illumination', label: '概览', icon: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z', group: '工作空间' },
  { path: '/illumination/subscription', label: '订阅来源', icon: 'M4 5h16M4 12h10M4 19h7m7-5v7m-3-3 3 3 3-3' },
  { path: '/illumination/settings', label: '节点配置', icon: 'M4 7h16M4 17h16M9 4v6m6 4v6' },
  { path: '/illumination/cdn', label: '上游代理', icon: 'M4 7h5v10H4z M15 7h5v10h-5z M9 12h6' },
  { path: '/illumination/conversion', label: '订阅转换', icon: 'M4 8h16m-4-4 4 4-4 4M20 16H4m4-4-4 4 4 4' },
  { path: '/illumination/network', label: '连接信息', icon: 'M3 12h18M12 3a17 17 0 0 1 0 18 17 17 0 0 1 0-18 M12 3a9 9 0 1 1 0 18 9 9 0 1 1 0-18', group: '维护' },
  { path: '/illumination/logs', label: '操作日志', icon: 'M5 3h14v18H5z M9 8h6M9 12h6M9 16h4' },
];
const currentPage = computed(() => navigation.find(item => item.path === route.path)?.label || '管理后台');
watch(() => route.path, () => { menuOpen.value = false; document.title = `${currentPage.value} · Prometheus`; }, { immediate: true });
function closeMenu(event: KeyboardEvent) { if (event.key === 'Escape') menuOpen.value = false; }
onMounted(() => document.addEventListener('keydown', closeMenu));
onUnmounted(() => document.removeEventListener('keydown', closeMenu));
function configurationReset() { pageVersion.value++; notice.value = '配置已重置为默认值'; }
async function logout() {
  try { await session.logout(); await router.push('/spark'); }
  catch (cause) { error.value = cause instanceof Error ? cause.message : '退出失败'; }
}
</script>
<template>
  <AppToast />
  <div v-if="isLogin" class="login-shell"><RouterView /></div>
  <div v-else class="shell illumination-shell" :class="{ 'menu-open': menuOpen }">
    <a class="skip-link" href="#workspace-main">跳到页面内容</a>
    <button v-if="menuOpen" type="button" class="sidebar-backdrop secondary" aria-label="关闭导航菜单" @click="menuOpen = false" />
    <aside id="management-sidebar" class="workspace-sidebar" :inert="!session.state.authenticated">
      <RouterLink to="/illumination" class="brand"><img src="/favicon.svg" class="brand-mark" alt="" width="30" height="30" /><span>Prometheus<small>隧道与订阅管理</small></span></RouterLink>
      <nav aria-label="管理导航">
        <template v-for="item in navigation" :key="item.path">
          <p v-if="item.group" class="nav-group">{{ item.group }}</p>
          <RouterLink :to="item.path" @click="menuOpen = false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="item.icon" /></svg>{{ item.label }}</RouterLink>
        </template>
      </nav>
      <div class="sidebar-footer"><a href="/" target="_blank" rel="noopener">打开公开首页 <span aria-hidden="true">↗</span></a><span>Prometheus · v1.0.0</span></div>
    </aside>
    <div class="workspace-body">
      <header class="workspace-header">
        <div class="workspace-location"><button type="button" class="secondary menu-toggle" aria-controls="management-sidebar" :aria-expanded="menuOpen" :aria-label="menuOpen ? '关闭导航菜单' : '打开导航菜单'" @click="menuOpen = !menuOpen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg></button><span>管理后台 <span class="breadcrumb-slash">/</span> <strong>{{ currentPage }}</strong></span></div>
        <nav class="header-actions" aria-label="账号与外观"><button type="button" class="secondary icon-button" :aria-label="dark ? '切换浅色模式' : '切换深色模式'" :title="dark ? '切换浅色模式' : '切换深色模式'" @click="toggleTheme"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path v-if="dark" d="M12 3v2m0 14v2M3 12h2m14 0h2M5.5 5.5 7 7m10 10 1.5 1.5M5.5 18.5 7 17M17 7l1.5-1.5"/><circle v-if="dark" cx="12" cy="12" r="4"/><path v-else d="M20 14a8 8 0 0 1-10-10 8 8 0 1 0 10 10Z"/></svg></button><button type="button" class="secondary" @click="logout">退出登录</button></nav>
      </header>
      <main id="workspace-main" tabindex="-1"><RouterView :key="`${route.path}-${pageVersion}`" /></main>
      <footer class="workspace-footer"><span>修改设置后，请在客户端更新订阅。</span><button type="button" class="secondary reset-trigger" @click="resetDialog?.open()">重置配置</button></footer>
    </div>
    <ResetConfiguration ref="resetDialog" @reset="configurationReset" />
  </div>
</template>

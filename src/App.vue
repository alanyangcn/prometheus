<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionStore } from './stores/session';
const session = useSessionStore();
const router = useRouter();
const error = ref('');
const dark = ref(false);
const themeQuery = window.matchMedia('(prefers-color-scheme: dark)');
function savedTheme() { try { return localStorage.getItem('prometheus-theme'); } catch { return null; } }
function applyTheme(value: boolean) {
  dark.value = value;
  document.documentElement.dataset.theme = value ? 'dark' : 'light';
}
function followSystem(event: MediaQueryListEvent) { if (!savedTheme()) applyTheme(event.matches); }
function toggleTheme() {
  applyTheme(!dark.value);
  try { localStorage.setItem('prometheus-theme', dark.value ? 'dark' : 'light'); } catch { /* Storage may be disabled. */ }
}
onMounted(() => {
  const saved = savedTheme();
  applyTheme(saved ? saved === 'dark' : themeQuery.matches);
  themeQuery.addEventListener('change', followSystem);
});
onUnmounted(() => themeQuery.removeEventListener('change', followSystem));
async function logout() {
  try { await session.logout(); await router.push('/login'); }
  catch (e) { error.value = e instanceof Error ? e.message : '退出失败'; }
}
</script>
<template>
  <div class="shell">
    <header>
      <RouterLink class="brand" to="/">Prometheus <span>普罗米修斯</span></RouterLink>
      <nav aria-label="主导航">
        <RouterLink to="/admin">管理面板</RouterLink>
        <button class="secondary" :aria-pressed="dark" @click="toggleTheme">{{ dark ? '浅色模式' : '深色模式' }}</button>
        <button v-if="session.state.authenticated" class="secondary" @click="logout">退出登录</button>
      </nav>
    </header>
    <nav v-if="session.state.authenticated" class="tabs" aria-label="管理导航">
      <RouterLink to="/admin">概览</RouterLink>
      <RouterLink to="/admin/settings">节点设置</RouterLink>
      <RouterLink to="/admin/addresses">地址库</RouterLink>
      <RouterLink to="/admin/proxies">代理检测</RouterLink>
      <RouterLink to="/admin/tools">实用工具</RouterLink>
      <RouterLink to="/admin/optimize">浏览器优选</RouterLink>
      <RouterLink to="/admin/logs">日志</RouterLink>
      <RouterLink to="/admin/integrations">集成</RouterLink>
    </nav>
    <p v-if="error" role="alert" class="error">{{ error }}</p>
    <main><RouterView /></main>
  </div>
</template>

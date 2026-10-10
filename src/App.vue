<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTheme } from './composables/useTheme';
import { useSessionStore } from './stores/session';
import AppToast from './components/AppToast.vue';
import ResetConfiguration from './components/ResetConfiguration.vue';
import { storeToRefs } from 'pinia';
import { useInterfaceStore } from './stores/interface';
const mobileMenu = ref<HTMLDetailsElement | null>(null);
function closeMobileMenu() { mobileMenu.value?.removeAttribute('open'); }
function closeOutsideMenu(event: PointerEvent) { if (!mobileMenu.value?.contains(event.target as Node)) closeMobileMenu(); }
function mobileToggleMode() { interfaceStore.toggleMode(); closeMobileMenu(); }
function mobileReset() { closeMobileMenu(); resetDialog.value?.open(); }
onMounted(() => document.addEventListener('pointerdown', closeOutsideMenu));
onUnmounted(() => document.removeEventListener('pointerdown', closeOutsideMenu));
const interfaceStore = useInterfaceStore();
const { mode } = storeToRefs(interfaceStore);
const resetDialog = ref<InstanceType<typeof ResetConfiguration> | null>(null);
const pageVersion = ref(0);
const notice = ref('');
function configurationReset() { pageVersion.value++; notice.value = '配置已完全重置为默认值'; }
const session = useSessionStore();
const router = useRouter();
const route = useRoute();
watch(() => route.path, closeMobileMenu);
const isLogin = computed(() => route.path === '/spark');
const error = ref('');
const { dark, toggleTheme } = useTheme();
async function logout() {
  try { await session.logout(); await router.push('/spark'); }
  catch (e) { error.value = e instanceof Error ? e.message : '退出失败'; }
}
</script>
<template>
  <AppToast />
  <div class="shell" :class="{ 'login-shell': isLogin, 'illumination-shell': !isLogin }">
    <header v-if="!isLogin">
      <a class="brand" href="/" aria-label="Prometheus 首页"><img src="/favicon.svg" class="brand-mark" alt="" width="28" height="28" /><span class="brand-name">Prometheus</span></a>
      <nav aria-label="主导航">
        <button v-if="session.state.authenticated" type="button" class="secondary mode-switch desktop-control" :aria-pressed="mode === 'expert'" :title="mode === 'simple' ? '切换到专家模式' : '切换到简单模式'" @click="interfaceStore.toggleMode()">{{ mode === 'simple' ? '简单模式' : '专家模式' }}</button>
        <button v-if="session.state.authenticated" type="button" class="danger-reset desktop-control" @click="resetDialog?.open()">重置配置</button>
        <button type="button" class="secondary theme-toggle" :aria-pressed="dark" :aria-label="dark ? '切换浅色模式' : '切换深色模式'" :title="dark ? '切换浅色模式' : '切换深色模式'" @click="toggleTheme">
          <svg v-if="dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.9 13.1A9 9 0 0 1 10.9 3.1 9 9 0 1 0 20.9 13.1Z" /></svg>
        </button>
        <button v-if="session.state.authenticated" type="button" class="secondary theme-toggle logout-toggle" aria-label="退出登录" title="退出登录" @click="logout"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 17v3H4V4h6v3M9 12h12m-4-4 4 4-4 4" /></svg></button>
        <details v-if="session.state.authenticated" ref="mobileMenu" class="mobile-menu" @keydown.esc="closeMobileMenu">
          <summary class="theme-toggle" aria-label="打开导航菜单" title="菜单"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg></summary>
          <div class="mobile-menu-panel">
            <button type="button" class="secondary" :aria-pressed="mode === 'expert'" @click="mobileToggleMode">{{ mode === 'simple' ? '切换到专家模式' : '切换到简单模式' }}</button>
            <button type="button" class="danger-reset" @click="mobileReset">重置配置</button>
          </div>
        </details>
      </nav>
    </header>
    <nav v-if="!isLogin && session.state.authenticated" class="tabs" aria-label="管理导航">
      <RouterLink to="/Illumination">概览</RouterLink>
      <RouterLink to="/Illumination/settings">节点配置</RouterLink>
      <RouterLink to="/Illumination/subscription">优选订阅</RouterLink>
      <RouterLink to="/Illumination/addresses">地址库</RouterLink>
      <RouterLink to="/Illumination/proxies">代理检测</RouterLink>
      <RouterLink to="/Illumination/tools">实用工具</RouterLink>
      <RouterLink to="/Illumination/optimize">浏览器优选</RouterLink>
      <RouterLink to="/Illumination/logs">日志</RouterLink>
    </nav>
    <p v-if="error" role="alert" class="error">{{ error }}</p>
    <p v-if="notice && !isLogin" role="status" class="success">{{ notice }}</p>
    <main :class="{ 'login-main': isLogin }"><RouterView :key="`${route.path}-${pageVersion}`" /></main>
    <ResetConfiguration ref="resetDialog" @reset="configurationReset" />
  </div>
</template>

<style scoped>
.login-shell { max-width: none; padding: 0; }
main.login-main { padding: 0; }
.illumination-shell > header button.danger-reset { color: #c64e5a; background: #e6687210; border: 1px solid #dd67732e; border-radius: 12px; padding: 10px 13px; font-size: 12px; box-shadow: inset 0 1px 1px #ffffff60; -webkit-tap-highlight-color: transparent; }
.illumination-shell > header button.danger-reset:hover { background: #e6687220; }
:global(:root[data-theme=dark] .illumination-shell > header button.danger-reset) { color: #efa0a8; background: #e6687214; border-color: #dd677333; }
.mobile-menu { display: none; position: relative; }
@media (max-width: 600px) {
  .illumination-shell > header { flex-wrap: nowrap; }
  .illumination-shell > header > nav { flex-wrap: nowrap; gap: 6px; }
  .illumination-shell > header .desktop-control { display: none; }
  .illumination-shell > header .brand { gap: 6px; min-width: 0; }
  .illumination-shell > header .brand-name { font-size: 20px; }
  .illumination-shell > header .brand-mark { width: 24px; height: 24px; }
  .mobile-menu { display: block; }
  .mobile-menu summary { display: grid; place-items: center; width: 36px; height: 36px; padding: 8px; border: 1px solid #8295b226; border-radius: 12px; cursor: pointer; list-style: none; color: #647792; background: #ffffff40; -webkit-tap-highlight-color: transparent; }
  .mobile-menu summary::-webkit-details-marker { display: none; }
  .mobile-menu summary svg { width: 20px; height: 20px; }
  .mobile-menu-panel { position: absolute; z-index: 100; right: 0; top: calc(100% + 10px); width: 190px; display: grid; gap: 6px; padding: 10px; border: 1px solid #ffffffb3; border-radius: 18px; background: #f3f6fbeF; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); box-shadow: 0 12px 36px #304b7520; }
  .mobile-menu-panel button { text-align: left; font-size: 12px; padding: 12px; }
  :global(:root[data-theme=dark] .mobile-menu summary) { color: #a8b9d4; background: #ffffff08; border-color: #ffffff20; }
  :global(:root[data-theme=dark] .mobile-menu-panel) { background: #1c2b3cef; border-color: #ffffff20; }
}

.illumination-shell > header > nav { gap: 8px; }
.illumination-shell > header > nav > button,
.illumination-shell > header .mobile-menu summary {
  display: inline-flex; align-items: center; justify-content: center;
  height: 38px; min-height: 38px; padding: 0 12px; border-radius: 12px;
  border: 1px solid #8295b226; background: #ffffff40; color: #647792;
  box-shadow: inset 0 1px 1px #ffffff60; font-size: 12px; line-height: 1;
  -webkit-tap-highlight-color: transparent;
}
.illumination-shell > header > nav > button:hover,
.illumination-shell > header .mobile-menu summary:hover { background: #ffffff70; }
.illumination-shell > header > nav > button.theme-toggle,
.illumination-shell > header .mobile-menu summary { width: 38px; padding: 0; flex-shrink: 0; }
.illumination-shell > header .theme-toggle svg { width: 20px; height: 20px; }
.illumination-shell > header > nav > button.danger-reset { color: #c64e5a; }
:global(:root[data-theme=dark] .illumination-shell > header > nav > button),
:global(:root[data-theme=dark] .illumination-shell > header .mobile-menu summary) { background: #ffffff08; border-color: #ffffff20; color: #a8b9d4; box-shadow: inset 0 1px 1px #ffffff0a; }
:global(:root[data-theme=dark] .illumination-shell > header > nav > button:hover),
:global(:root[data-theme=dark] .illumination-shell > header .mobile-menu summary:hover) { background: #ffffff12; }
:global(:root[data-theme=dark] .illumination-shell > header > nav > button.danger-reset) { color: #efa0a8; }
@media (max-width: 600px) {
  .illumination-shell > header > nav { gap: 6px; }
  .illumination-shell > header > nav > button.desktop-control { display: none; }
}
</style>

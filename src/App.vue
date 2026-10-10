<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionStore } from './stores/session';
const session = useSessionStore();
const router = useRouter();
const error = ref('');
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
        <button v-if="session.state.authenticated" class="secondary" @click="logout">退出登录</button>
      </nav>
    </header>
    <nav v-if="session.state.authenticated" class="tabs" aria-label="管理导航">
      <RouterLink to="/admin">概览</RouterLink>
      <RouterLink to="/admin/settings">节点设置</RouterLink>
      <RouterLink to="/admin/addresses">地址库</RouterLink>
      <RouterLink to="/admin/proxies">代理检测</RouterLink>
      <RouterLink to="/admin/logs">日志</RouterLink>
      <RouterLink to="/admin/integrations">集成</RouterLink>
    </nav>
    <p v-if="error" role="alert" class="error">{{ error }}</p>
    <main><RouterView /></main>
  </div>
</template>

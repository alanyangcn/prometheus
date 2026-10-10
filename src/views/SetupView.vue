<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionStore } from '../stores/session';
const router = useRouter();
const session = useSessionStore();
const checking = ref(false);
const error = ref('');
async function continueToLogin() {
  checking.value = true;
  error.value = '';
  try {
    const state = await session.refresh();
    if (!state.configured) {
      error.value = '服务尚未配置 ADMIN。请在 Cloudflare 的运行时变量和密钥中添加 ADMIN 并部署，再重试。';
      return;
    }
    await router.push(state.authenticated ? '/admin' : '/login');
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '无法读取服务状态，请稍后重试。';
  } finally { checking.value = false; }
}
</script>
<template>
  <h1>完成初始化</h1>
  <section class="card">
    <p>请先为服务设置管理员密码，再进入管理面板。</p>
    <p>本地开发：在项目的 <code>.dev.vars</code> 中设置 <code>ADMIN</code>，然后重启开发服务。</p>
    <p>线上部署：在 Cloudflare 配置 ADMIN 密钥，并绑定名为 KV 的存储空间。</p>
    <button :disabled="checking" @click="continueToLogin">{{ checking ? '检查配置中…' : '前往登录' }}</button>
    <p v-if="error" role="alert">{{ error }}</p>
  </section>
</template>

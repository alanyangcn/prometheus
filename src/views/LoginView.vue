<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionStore } from '../stores/session';
const password = ref(''); const busy = ref(false); const error = ref('');
const session = useSessionStore(); const router = useRouter();
async function login() {
  busy.value = true; error.value = '';
  try { await session.login(password.value); password.value = ''; await router.push('/admin'); }
  catch (e) { error.value = e instanceof Error ? e.message : '登录失败'; }
  finally { busy.value = false; }
}
</script>
<template>
  <h1>管理员登录</h1>
  <form class="card login" @submit.prevent="login">
    <label for="password">管理员密码</label>
    <input id="password" v-model="password" type="password" autocomplete="current-password" required />
    <p v-if="error" role="alert" class="error">{{ error }}</p>
    <button :disabled="busy">{{ busy ? '正在登录…' : '登录' }}</button>
  </form>
</template>

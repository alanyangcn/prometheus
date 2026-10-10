<script setup lang="ts">
import { ref } from 'vue';
import { api } from '../api/client';
const type = ref('socks5'); const address = ref(''); const result = ref<unknown>(null); const error = ref(''); const busy = ref(false);
async function check() {
  busy.value = true; error.value = ''; result.value = null;
  try { result.value = await api(`/api/proxy-check`, { type: type.value, address: address.value }); }
  catch (e) { error.value = e instanceof Error ? e.message : '检测失败'; }
  finally { busy.value = false; }
}
</script>
<template>
  <h1>代理检测</h1><p class="intro">检查自有上游代理的连接状态。账号和密码不会写入浏览器地址栏。</p>
  <form class="card" @submit.prevent="check">
    <label for="proxy-type">代理类型</label><select id="proxy-type" v-model="type"><option v-for="item in ['socks5', 'http', 'https', 'turn', 'sstp']" :key="item">{{ item }}</option></select>
    <label for="proxy-address">代理地址</label><input id="proxy-address" v-model="address" type="password" autocomplete="off" placeholder="user:password@host:port" required />
    <button :disabled="busy">{{ busy ? '检测中…' : '开始检测' }}</button>
    <p v-if="error" role="alert" class="error">{{ error }}</p><pre v-if="result">{{ JSON.stringify(result, null, 2) }}</pre>
  </form>
</template>

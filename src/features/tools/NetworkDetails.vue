<script setup lang="ts">
import { ref } from 'vue';
import IPDetails from './IPDetails.vue';
import { api } from '../../api/client';
const error = ref(''), message = ref(''), busy = ref(false);
const network = ref<Record<string, unknown> | null>(null);
const ip = ref(''), ipInfo = ref<Record<string,unknown> | null>(null);
async function run(action: () => Promise<void>) { busy.value = true; error.value = ''; message.value = ''; try { await action(); } catch (e) { error.value = e instanceof Error ? e.message : '请求失败'; } finally { busy.value = false; } }
async function loadNetwork() { await run(async () => { network.value = await api('/api/tools/network-info', {}); }); }
</script>
<template>
  <section class="network-details">

<section class="card"><h2>当前网络信息</h2><button type="button" :disabled="busy" @click="loadNetwork">读取当前网络信息</button><dl v-if="network"><template v-for="(value, key) in network" :key="key"><dt>{{ key }}</dt><dd>{{ value ?? '—' }}</dd></template></dl><button type="button" v-if="network?.connectingIP" :disabled="busy" @click="run(async () => { ip = String(network?.connectingIP); ipInfo = await api('/api/tools/ip-info', { ip }); })">查询当前 IP 详情</button></section>

<section class="card"><h2>IP 信息</h2><input v-model="ip" aria-label="IP 地址" /><button type="button" :disabled="busy" @click="run(async () => { ipInfo = await api('/api/tools/ip-info', { ip }); })">查询 IP</button><IPDetails v-if="ipInfo" :value="ipInfo" /></section>

<p v-if="error" class="error" role="alert">{{ error }}</p><p v-if="message" class="success" role="status">{{ message }}</p>

  </section>
</template>

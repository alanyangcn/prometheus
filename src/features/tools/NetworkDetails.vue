<script setup lang="ts">
import { useToastMessage } from '../../composables/useToast';
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import IPDetails from './IPDetails.vue';
import { api } from '../../api/client';
const network = ref<Record<string, unknown> | null>(null), networkBusy = ref(false), networkError = useToastMessage('error');
const ip = ref(''), ipInfo = ref<Record<string,unknown> | null>(null), queryBusy = ref(false), queryError = useToastMessage('error');
let active = true;
onBeforeUnmount(() => { active = false; });
const fields = [
  { key: 'connectingIP', label: '连接 IP', icon: 'IP' },
  { key: 'colo', label: 'Cloudflare 机房', icon: 'CF' },
  { key: 'location', label: '地区', icon: '◎' },
  { key: 'networkOwner', label: '网络归属', icon: 'AS' },
  { key: 'httpProtocol', label: 'HTTP 协议', icon: '↗' },
  { key: 'tlsVersion', label: 'TLS 版本', icon: '⌁' },
];
const entries = computed(() => fields.map(field => ({
  ...field,
  value: field.key === 'location'
    ? [network.value?.country, network.value?.region, network.value?.city].filter(value => typeof value === 'string' && value.trim()).join(' · ') || '—'
    : field.key === 'networkOwner'
      ? [network.value?.asn != null && String(network.value.asn).trim() ? `AS${String(network.value.asn).replace(/^AS/i, '')}` : '', network.value?.asOrganization].filter(value => typeof value === 'string' && value.trim()).join(' · ') || '—'
      : network.value?.[field.key] ?? '—',
})));
async function loadNetwork() {
  if (networkBusy.value) return;
  networkBusy.value = true; networkError.value = '';
  try { const value = await api<Record<string,unknown>>('/api/tools/network-info', {}); if (active) network.value = value; }
  catch (cause) { if (active) networkError.value = cause instanceof Error ? cause.message : '读取失败'; }
  finally { if (active) networkBusy.value = false; }
}
async function query(value = ip.value.trim()) {
  if (!value || queryBusy.value) return;
  ip.value = value; queryBusy.value = true; queryError.value = ''; ipInfo.value = null;
  try { const result = await api<Record<string,unknown>>('/api/tools/ip-info', { ip: value }); if (active) ipInfo.value = result; }
  catch (cause) { if (active) queryError.value = cause instanceof Error ? cause.message : '查询失败'; }
  finally { if (active) queryBusy.value = false; }
}
onMounted(() => { void loadNetwork(); });
</script>
<template>
  <div class="network-details">
    <p v-if="networkError" class="error" role="alert">{{ networkError }} <button type="button" class="secondary" :disabled="networkBusy" @click="loadNetwork">重试</button></p>
    <section class="card request-panel" aria-labelledby="request-info-title" :aria-busy="networkBusy">
      <div class="details-heading"><div><span class="details-eyebrow">CONNECTION</span><h2 id="request-info-title">当前连接信息</h2><p>当前浏览器访问 Worker 时的网络信息</p></div><button type="button" class="secondary" :disabled="networkBusy" @click="loadNetwork">{{ networkBusy ? '读取中…' : '刷新信息' }}</button></div>

      <dl class="connection-grid"><div v-for="entry in entries" :key="entry.key" :class="['connection-item', `connection-${entry.key}`]"><dt><span class="connection-icon" aria-hidden="true">{{ entry.icon }}</span>{{ entry.label }}</dt><dd :class="{ 'mono-value': ['connectingIP','asn','colo','httpProtocol','tlsVersion'].includes(entry.key) }">{{ entry.value }}</dd></div></dl>
    </section>
    <section class="card ip-panel" aria-labelledby="ip-query-title">
      <div class="details-heading"><div><span class="details-eyebrow">LOOKUP</span><h2 id="ip-query-title">IP 信息查询</h2></div><button v-if="network?.connectingIP" type="button" class="secondary" :disabled="queryBusy" @click="query(String(network.connectingIP))">查询当前 IP</button></div>
      <form class="ip-query-form" @submit.prevent="query()"><label class="query-field" for="network-query-ip">IP 地址<input id="network-query-ip" v-model="ip" placeholder="输入 IPv4 或 IPv6 地址" autocomplete="off" :disabled="queryBusy" /></label><button :disabled="queryBusy || !ip.trim()">{{ queryBusy ? '查询中…' : '查询' }}</button></form>

      <p v-if="queryError" class="error" role="alert">{{ queryError }}</p>
      <IPDetails v-if="ipInfo" :value="ipInfo" />
    </section>
  </div>
</template>
<style scoped>
.network-details { display:grid; gap:22px; }.details-heading { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:24px; }.details-heading h2 { margin:6px 0 0; }.details-heading p { color:var(--muted); font-size:12px; margin:6px 0 0; }.details-eyebrow { color:var(--muted); font-size:10px; letter-spacing:.12em; }.connection-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:20px; margin:0; }.connection-item { min-width:0; border-top:1px solid var(--edge); padding-top:16px; }.connection-icon { display:none; }.connection-item dd { margin:10px 0 0; font-size:14px; }.mono-value { font-family:ui-monospace,monospace; }.ip-query-form { display:flex; align-items:flex-end; gap:12px; }.query-field { flex:1; min-width:0; margin:0; }.query-field input { margin:9px 0 0; }.ip-panel :deep(.ip-details) { margin-top:24px; }.ip-query-form button { flex-shrink:0; min-height:44px; }
@media(max-width:600px) { .connection-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px 14px; }.details-heading { flex-wrap:wrap; }.ip-query-form { flex-wrap:wrap; }.ip-query-form button { width:100%; } }
</style>

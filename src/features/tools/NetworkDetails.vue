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
    <section class="card request-panel" aria-labelledby="request-info-title" :aria-busy="networkBusy">
      <div class="details-heading"><div><span class="details-eyebrow">CONNECTION</span><h2 id="request-info-title">当前连接信息</h2><p>当前浏览器访问 Worker 时的网络信息</p></div><button type="button" class="secondary" :disabled="networkBusy" @click="loadNetwork">{{ networkBusy ? '读取中…' : '刷新信息' }}</button></div>

      <dl class="connection-grid"><div v-for="entry in entries" :key="entry.key" :class="['connection-item', `connection-${entry.key}`]"><dt><span class="connection-icon" aria-hidden="true">{{ entry.icon }}</span>{{ entry.label }}</dt><dd :class="{ 'mono-value': ['connectingIP','asn','colo','httpProtocol','tlsVersion'].includes(entry.key) }">{{ entry.value }}</dd></div></dl>
    </section>
    <section class="card ip-panel" aria-labelledby="ip-query-title">
      <div class="details-heading"><div><span class="details-eyebrow">LOOKUP</span><h2 id="ip-query-title">IP 信息查询</h2></div><button v-if="network?.connectingIP" type="button" class="secondary" :disabled="queryBusy" @click="query(String(network.connectingIP))">查询当前 IP</button></div>
      <form class="ip-query-form" @submit.prevent="query()"><label class="query-field" for="network-query-ip">IP 地址<input id="network-query-ip" v-model="ip" placeholder="输入 IPv4 或 IPv6 地址" autocomplete="off" :disabled="queryBusy" /></label><button :disabled="queryBusy || !ip.trim()">{{ queryBusy ? '查询中…' : '查询' }}</button></form>

      <IPDetails v-if="ipInfo" :value="ipInfo" />
    </section>
  </div>
</template>
<style scoped>
.network-details{display:grid;gap:24px}.network-details .card{margin:0}.details-heading{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:24px}.details-heading h2{margin:5px 0 0!important}.details-heading p{margin:6px 0 0;color:#7b8ba4}.details-heading button{flex-shrink:0}.details-eyebrow{font-size:10px;font-weight:650;letter-spacing:.16em;color:#7b94b5}.connection-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:0}.connection-item{min-width:0;padding:18px;border:1px solid #ffffffa6;border-radius:18px;background:linear-gradient(135deg,#ffffff59,#ffffff26);box-shadow:inset 0 1px 1px #ffffff99}.connection-item dt{display:flex;align-items:center;gap:8px;font-size:11px;color:#7587a1}.connection-icon{display:grid;place-items:center;min-width:25px;height:25px;border-radius:8px;background:#7c9edc12;color:#7593bc;font-size:10px;font-weight:600}.connection-item dd{margin:12px 0 0;font-size:14px;font-weight:550;color:#3f5471;overflow-wrap:anywhere}.mono-value{font-family:ui-monospace,SFMono-Regular,monospace}.ip-query-form{display:flex;gap:12px;align-items:flex-end}.query-field{flex:1;min-width:0;margin:0!important}.query-field input{margin:9px 0 0!important}.ip-query-form button{flex-shrink:0;min-height:42px}.ip-panel :deep(.ip-details){margin-top:24px}
:global(:root[data-theme=dark] .connection-item){border-color:#ffffff20;background:linear-gradient(135deg,#ffffff08,#ffffff03);box-shadow:inset 0 1px 1px #ffffff0a}:global(:root[data-theme=dark] .connection-item dd){color:#c4d3e9}:global(:root[data-theme=dark] .connection-item dt),:global(:root[data-theme=dark] .details-heading p){color:#a0b2cb}
@media(max-width:600px){.connection-location,.connection-networkOwner{grid-column:1/-1}}
@media(max-width:800px){.connection-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:480px){.details-heading{gap:12px;flex-wrap:wrap}.connection-grid{gap:10px}.connection-item{padding:14px}.connection-item dd{font-size:12px}.ip-query-form{flex-wrap:wrap}.ip-query-form button{width:100%}}
</style>

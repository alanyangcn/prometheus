<script setup lang="ts">
import { computed } from 'vue';
import { normalizeIP, locationMap } from './ip';
const props = defineProps<{value: Record<string,unknown>}>();
const info = computed(() => normalizeIP(props.value));
const mapURL = computed(() => locationMap(info.value));
const fields = computed(() => [
  ['IP 地址', info.value.ip],
  ['地区', [info.value.location.country, info.value.location.state, info.value.location.city].filter(Boolean).join(' · ') || info.value.location.country_code],
  ['网络归属', [info.value.asn.asn ? `AS${info.value.asn.asn}` : '', info.value.asn.org].filter(Boolean).join(' · ')],
  ['公司', info.value.company.name],
]);
const flags: Record<string,string> = {is_proxy:'代理',is_vpn:'VPN',is_tor:'Tor',is_abuser:'滥用',is_bogon:'Bogon',is_datacenter:'数据中心',is_mobile:'移动网络'};
</script>
<template>
  <article class="ip-details"><h3>查询结果</h3><dl class="ip-facts"><div v-for="[label,value] in fields" :key="String(label)"><dt>{{ label }}</dt><dd>{{ value || '未知' }}</dd></div></dl><a v-if="mapURL" :href="mapURL" target="_blank" rel="noopener noreferrer">在地图上查看位置 ↗</a><h3>来源标记</h3><p class="hint">标记来自查询服务，仅供参考；缺失数据统一显示为未知。</p><dl class="ip-facts"><div v-for="(label,key) in flags" :key="key"><dt>{{ label }}</dt><dd>{{ info[key] === true ? '是' : info[key] === false ? '否' : '未知' }}</dd></div></dl></article>
</template>
<style scoped>
.ip-details { border-top:1px solid var(--edge); padding-top:20px; }.ip-details h3 { margin:0 0 16px; }.ip-details h3:not(:first-child) { margin-top:24px; }.ip-details a { font-size:12px; }.ip-facts { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px 24px; margin:0; }.ip-facts dd { margin:5px 0 10px; font-size:13px; }
@media(max-width:480px) { .ip-facts { grid-template-columns:1fr; } }
</style>

<script setup lang="ts">
import { computed } from 'vue';
import { abuseScore, normalizeIP, locationMap } from './ip';
const props = defineProps<{value: Record<string,unknown>}>();
const info = computed(() => normalizeIP(props.value)), score = computed(() => abuseScore(info.value));
const mapURL = computed(() => locationMap(info.value));
const risk = computed(() => score.value === null ? '未知' : score.value >= 1 ? '极度危险' : score.value >= .2 ? '高风险' : score.value >= .05 ? '轻微风险' : score.value >= .0025 ? '纯净' : '极度纯净');
const flags: Record<string,string> = {is_crawler:'爬虫',is_proxy:'代理',is_vpn:'VPN',is_tor:'Tor',is_abuser:'滥用',is_bogon:'Bogon',is_datacenter:'数据中心',is_mobile:'移动网络',is_satellite:'卫星网络'};
</script>
<template><article class="card"><h3>{{ info.ip }}</h3><h4>位置</h4><dl><template v-for="(value,key) in info.location" :key="key"><dt>{{ key }}</dt><dd>{{ value ?? '未知' }}</dd></template></dl><p v-if="mapURL"><a :href="mapURL" target="_blank" rel="noopener noreferrer">在 OpenStreetMap 查看位置</a></p><h4>公司</h4><dl><template v-for="(value,key) in info.company" :key="key"><dt>{{ key }}</dt><dd>{{ value ?? '未知' }}</dd></template></dl><h4>ASN</h4><dl><template v-for="(value,key) in info.asn" :key="key"><dt>{{ key }}</dt><dd>{{ value ?? '未知' }}</dd></template></dl><h4>安全与滥用</h4><p>参考综合评分：{{ score === null ? '未知' : `${(score*100).toFixed(2)}%` }} · {{ risk }}</p><p class="hint">算法为公司和 ASN 滥用分均值 × 5，每项爬虫/代理/VPN/Tor/滥用标记 +15%，Bogon +100%；仅供查看来源数据。</p><dl><template v-for="(label,key) in flags" :key="key"><dt>{{ label }}</dt><dd>{{ info[key] === true ? '是' : info[key] === false ? '否' : '未知' }}</dd></template></dl></article></template>

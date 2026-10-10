<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import NetworkDiagnostics from './NetworkDiagnostics.vue';
const expanded = ref(false);
const cloudflareIndex = ref(0);
const wallSource = ref('Google');
import { networkSources, probeNetwork, type NetworkResult } from './network';
const cards = [
  { group: '国内出口', title: '国内测试', description: '访问国内测试站点时的网络出口' },
  { group: '海外出口', title: '国外测试', description: '访问海外测试站点时的网络出口' },
  { group: 'Cloudflare 出口', title: 'Cloudflare', description: '访问 CF CDN 站点时所使用的落地 IP' },
  { group: '墙外测试', title: '墙外测试', description: '访问 Google / X 测试站点时的网络出口' },
];
const results = ref<Record<string, NetworkResult[]>>({});
const completed = ref<Record<string, boolean>>({});
const busy = ref(false);
let controller: AbortController | undefined;
async function refresh() {
  controller?.abort();
  const current = new AbortController(); controller = current;
  busy.value = true; results.value = {}; completed.value = {}; cloudflareIndex.value = 0;
  await Promise.all(cards.map(async card => {
    const sources = networkSources.filter(source => source.group === card.group);
    if (card.group === 'Cloudflare 出口' || card.group === '墙外测试') {
      const entries = await Promise.all(sources.map(source => probeNetwork(source, current.signal)));
      if (!current.signal.aborted) {
        const successful = entries.filter(result => result.success);
        results.value[card.group] = card.group === 'Cloudflare 出口'
          ? successful.filter((result, index) => successful.findIndex(entry => entry.version === result.version && entry.ip?.toLowerCase() === result.ip?.toLowerCase()) === index).sort((a, b) => (a.version || '').localeCompare(b.version || ''))
          : entries;
      }
    } else {
      for (const source of sources) {
        if (current.signal.aborted) break;
        const result = await probeNetwork(source, current.signal);
        if (result.success && !current.signal.aborted) { results.value[card.group] = [result]; break; }
      }
    }
    if (!current.signal.aborted) completed.value[card.group] = true;
  }));
  if (controller === current) busy.value = false;
}
function visibleResults(group: string): NetworkResult[] {
  const entries = results.value[group] || [];
  if (group === 'Cloudflare 出口') return entries.slice(cloudflareIndex.value, cloudflareIndex.value + 1);
  if (group === '墙外测试') return entries.filter(result => result.name === wallSource.value);
  return entries;
}
onMounted(() => { void refresh(); });
onUnmounted(() => controller?.abort());
</script>
<template>
  <section class="card network-overview" aria-label="当前网络信息" :aria-busy="busy">
    <div class="network-heading"><h2>当前网络信息</h2><div class="network-heading-actions"><button type="button" class="secondary" :disabled="busy" @click="refresh">{{ busy ? '检测中…' : '重新检测' }}</button><button type="button" class="secondary latency-expand" :aria-expanded="expanded" aria-controls="site-latency" :aria-label="expanded ? '收起站点延迟' : '展开站点延迟并测速'" :title="expanded ? '收起站点延迟' : '展开站点延迟并测速'" @click="expanded = !expanded"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true" :class="{ expanded }"><path d="m7 10 5 5 5-5" /></svg></button></div></div>
    <div class="network-grid">
      <article v-for="card in cards" :key="card.group" class="network-tile">
        <div class="network-tile-heading"><span class="network-indicator" :class="{ ready: visibleResults(card.group).some(result => result.success), pending: !completed[card.group] }" aria-hidden="true" /><h3>{{ card.title }}</h3><span v-if="card.group === 'Cloudflare 出口'" class="network-provider"><template v-if="results[card.group]?.length"><template v-for="(entry, index) in results[card.group]" :key="entry.ip"><span v-if="index" class="probe-separator"> / </span><button type="button" class="secondary probe-selector" :class="{ active: cloudflareIndex === index }" :aria-pressed="cloudflareIndex === index" @click="cloudflareIndex = index">{{ cloudflareIndex === index ? `ProxyIP${entry.version}` : entry.version }}</button></template></template><template v-else>ProxyIP</template></span><span v-else-if="card.group === '墙外测试'" class="network-provider"><button v-for="source in ['Google', 'X.com']" :key="source" type="button" class="secondary probe-selector" :class="{ active: wallSource === source }" :aria-pressed="wallSource === source" @click="wallSource = source">{{ source === 'Google' ? '谷歌(Google)' : '推特(X.com)' }}</button></span><span v-else class="network-provider">{{ results[card.group]?.map(result => result.name).join(' / ') }}</span></div>
        <div v-for="result in visibleResults(card.group).filter(result => result.success)" :key="result.name" class="network-result">
          <div class="network-address"><span>{{ result.ip }}</span><span class="network-version">{{ result.version }}</span></div>
          <p class="network-location">{{ result.location || '地区信息未提供' }}<span v-if="result.asn"> · AS{{ result.asn }}</span></p>
        </div>
        <p v-if="!visibleResults(card.group).some(result => result.success)" class="network-state" role="status">{{ completed[card.group] ? '暂时无法获取，可能受网络或跨域策略限制' : '正在检测网络出口…' }}</p>
        <p class="network-description">{{ card.group === '墙外测试' ? `访问 ${wallSource} 测试站点时的网络出口` : card.description }}</p>
      </article>
    </div>
    <p class="network-note"><strong>国内测试</strong> 是由您梯子的 <strong>分流规则</strong> 决定的，<strong>国外测试、谷歌</strong> 是由您的 <strong>优选IP</strong> 决定的，而 <strong>CF、ChatGPT、推特</strong> 是由您的 <strong>PROXYIP</strong> 决定的。</p>
    <NetworkDiagnostics v-if="expanded" />
  </section>
</template>
<style scoped>
.network-overview { margin-bottom: 24px; }
.network-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 20px; }
.network-heading h2 { margin: 0 !important; }
.network-heading-actions { display: flex; align-items: center; gap: 8px; }
.network-heading-actions button.latency-expand { display: grid; place-items: center; width: 40px; height: 40px; min-height: 40px; padding: 9px; }
.latency-expand svg { width: 20px; height: 20px; }
.latency-expand svg.expanded { transform: rotate(180deg); }
.network-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.network-tile { min-width: 0; padding: 18px 20px; border-radius: 18px; border: 1px solid #ffffffb3; background: linear-gradient(135deg,#ffffff59,#ffffff26); box-shadow: inset 0 1px 1px #ffffff99,0 4px 12px #5477ae06; }
.network-tile-heading { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; padding-bottom: 12px; margin-bottom: 14px; border-bottom: 1px solid #8295b21a; }
.network-tile-heading h3 { margin: 0; font-size: 12px; font-weight: 600; }
.network-provider { font-size: 10px; color: #8290a5; overflow-wrap: anywhere; }
.network-overview .network-provider .probe-selector { border: 0; background: transparent; padding: 2px 4px; min-height: 0; border-radius: 4px; font-size: 10px; color: #8290a5; box-shadow: none; }
.network-overview .network-provider .probe-selector.active { color: #528bc7; text-decoration: none; }
.network-overview .network-provider .probe-selector:hover { background: transparent; }
.network-overview .network-provider .probe-selector:focus-visible { outline: 2px solid #528bc766; outline-offset: 2px; }
:global(:root[data-theme=dark] .illumination-shell .network-overview .network-provider .probe-selector) { background: transparent; border: 0; color: #98acc5; box-shadow: none; }
:global(:root[data-theme=dark] .illumination-shell .network-overview .network-provider .probe-selector.active) { color: #8ab5e8; background: transparent; }
.network-indicator { width: 6px; height: 6px; border-radius: 50%; background: #b7a19c; flex-shrink: 0; }
.network-indicator.ready { background: #6ba38b; box-shadow: 0 0 0 3px #6ba38b12; }
.network-indicator.pending:not(.ready) { background: #b0bdd0; }
.network-result + .network-result { margin-top: 12px; }
.network-address { display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px; color: #528bc7; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 14px; font-weight: 550; overflow-wrap: anywhere; }
.network-address > span:first-child { min-width: 0; }
.network-version { font-size: 10px; font-weight: 400; color: #8290a5; }
.network-tile .network-location { font-size: 12px; line-height: 1.7; color: #71849e; margin: 7px 0 0; overflow-wrap: anywhere; }
.network-tile .network-description { font-size: 10px; color: #8b99ad; margin: 14px 0 0; }
.network-tile .network-state { font-size: 12px; color: #8290a5; margin: 0; line-height: 1.8; }
.network-overview .network-note { font-size: 11px; color: #8290a5; margin: 18px 0 0; }
:global(:root[data-theme=dark] .network-tile) { border-color: #ffffff20; background: linear-gradient(135deg,#ffffff08,#ffffff03); box-shadow: inset 0 1px 1px #ffffff0a; }
:global(:root[data-theme=dark] .network-address) { color: #8ab5e8; }
:global(:root[data-theme=dark] .network-tile .network-location) { color: #a0b2cb; }
@media (max-width: 600px) { .network-grid { grid-template-columns: 1fr; gap: 12px; } .network-tile { padding: 16px; border-radius: 16px; } .network-address { font-size: 13px; } }
</style>

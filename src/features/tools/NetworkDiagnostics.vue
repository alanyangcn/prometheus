<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { latencySites, latencyLoop } from './network';
const running = ref(false);
const samples = 20;
const measurements = ref<Record<string, (number | null)[]>>({});
let controller: AbortController | undefined;
function stop() { controller?.abort(); controller = undefined; running.value = false; }
async function start() {
  stop(); const current = new AbortController(); controller = current;
  running.value = true; measurements.value = {};
  const count = Math.max(1, Math.min(100, samples));
  await Promise.all(latencySites.map(site => {
    measurements.value[site.name] = [];
    return latencyLoop(site.url, count, current.signal, value => { if (!current.signal.aborted) measurements.value[site.name]!.push(value); });
  }));
  if (controller === current) { controller = undefined; running.value = false; }
}
function latest(name: string) { return measurements.value[name]?.at(-1); }
function tone(name: string) { const value = latest(name); return value == null ? 'unavailable' : value < 100 ? 'fast' : value < 200 ? 'moderate' : 'slow'; }
function graph(name: string) {
  const values = measurements.value[name] || [], max = Math.max(150, ...values.filter((v): v is number => v !== null));
  let drawing = false;
  return values.map((value, index) => {
    if (value === null) { drawing = false; return ''; }
    const command = drawing ? 'L' : 'M'; drawing = true;
    return `${command}${index * 400 / Math.max(1, samples - 1)},${48 - value / max * 40}`;
  }).join(' ');
}
onMounted(() => { void start(); });
onBeforeUnmount(stop);
</script>
<template>
  <div id="site-latency" class="site-latency">
    <div class="latency-grid">
      <article v-for="(site, index) in latencySites" :key="site.name" class="latency-tile" :class="tone(site.name)">
        <div class="latency-info"><span class="site-symbol" aria-hidden="true">{{ ['▥', '▣', '◉', '淘', '⌘', '➤', '𝕏', '▶'][index] }}</span><h3>{{ site.name }}</h3><span class="site-region" :class="{ international: site.region === '国际' }">{{ site.region }}</span></div>
        <div class="latency-value" role="status"><template v-if="latest(site.name) != null">{{ latest(site.name) }}<span>ms</span></template><span v-else class="latency-placeholder">{{ latest(site.name) === null ? '超时 / 失败' : running ? '检测中' : '未测得' }}</span></div>
        <svg class="latency-graph" viewBox="0 0 400 52" preserveAspectRatio="none" aria-hidden="true"><path :d="graph(site.name)" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke" /></svg>
      </article>
    </div>
  </div>
</template>
<style scoped>
.site-latency { margin-top: 22px; }
.latency-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 16px; }
.latency-tile { --latency-color: #7890aa; position: relative; isolation: isolate; overflow: hidden; min-width: 0; min-height: 82px; display: flex; align-items: center; gap: 12px; justify-content: space-between; padding: 18px; border: 1px solid #ffffffa6; border-radius: 16px; background: linear-gradient(135deg,#ffffff59,#ffffff26); box-shadow: inset 0 1px 1px #ffffff80; }
.latency-tile.fast { --latency-color: #64a18b; }
.latency-tile.moderate { --latency-color: #94a54e; }
.latency-tile.slow { --latency-color: #c49762; }
.latency-info { position: relative; z-index: 1; display: flex; align-items: center; flex-wrap: wrap; gap: 8px; min-width: 0; }
.site-symbol { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 10px; color: #6f99c7; background: #749bd514; font-size: 17px; }
.latency-info h3 { font-size: 12px; font-weight: 600; margin: 0; }
.site-region { font-size: 9px; color: #77a68f; }
.site-region.international { color: #78a4cf; }
.latency-value { position: relative; z-index: 1; color: var(--latency-color); font-size: 25px; font-weight: 650; font-style: italic; letter-spacing: -.7px; flex-shrink: 0; font-variant-numeric: tabular-nums; }
.latency-value > span { font-size: 11px; font-weight: 400; margin-left: 2px; letter-spacing: 0; }
.latency-value .latency-placeholder { font-size: 10px; font-style: normal; }
.latency-graph { position: absolute; z-index: 0; width: 100%; height: 42px; bottom: 0; left: 0; opacity: .3; color: var(--latency-color); pointer-events: none; }
:global(:root[data-theme=dark] .latency-tile) { border-color: #ffffff20; background: linear-gradient(135deg,#ffffff08,#ffffff03); box-shadow: inset 0 1px 1px #ffffff0a; }
@media (max-width: 600px) { .latency-grid { grid-template-columns: 1fr; gap: 10px; } .latency-tile { min-height: 76px; padding: 16px; } }
</style>

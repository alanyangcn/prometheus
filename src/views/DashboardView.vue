<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { attachLiquidGlass } from '../features/appearance/liquidGlass';
import { useConfigStore } from '../stores/config';
import ShareLink from '../components/ShareLink.vue';
import NetworkOverview from '../features/tools/NetworkOverview.vue';
import { subscriptionLinks } from '../features/sharing/links';
import type { Configuration } from '../../shared/config';
const store = useConfigStore(); const error = ref('');
const loading = ref(true);
const subscriptionsGlass = ref<HTMLElement | null>(null);
const cleanups: (() => void)[] = [];
let active = true;
onMounted(async () => {
  try { await store.load(); }
  catch (e) { error.value = e instanceof Error ? e.message : '加载失败'; }
  finally { loading.value = false; }
  await nextTick();
  if (active) for (const element of [subscriptionsGlass.value]) if (element) cleanups.push(attachLiquidGlass(element));
});
onUnmounted(() => { active = false; cleanups.forEach(cleanup => cleanup()); });
const generation = computed(() => store.data?.优选订阅生成 as Configuration | undefined);
const token = computed(() => String(generation.value?.TOKEN || ''));
const links = computed(() => subscriptionLinks(window.location.origin, token.value, String(generation.value?.SUBNAME || 'Prometheus')));
</script>
<template>
  <section class="illumination-overview" aria-labelledby="overview-title">
    <div class="overview-heading"><h1 id="overview-title" class="page-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg><span>概览</span></h1></div>
    <NetworkOverview />
    <p v-if="error" role="alert" class="error">{{ error }}</p>
    <div v-if="loading" class="overview-loading" role="status">正在读取你的工作空间…</div>
    <div v-else-if="store.data" class="overview-grid">
      <section ref="subscriptionsGlass" class="overview-glass subscriptions-panel">
        <div class="panel-heading"><span class="panel-symbol" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="m10 13 4-4m-6 6-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 2 2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(2 0)" /></svg></span><div><h2>节点与订阅</h2><p>点击链接，即可复制</p></div></div>
        <div class="subscription-links">
        <ShareLink label="节点链接" :url="String(store.data.LINK || '')" :import-url="String(store.data.LINK || '')" />
        <ShareLink v-for="link in links" :key="link.id" :label="link.label" :url="link.url" :import-url="link.importUrl" :filename="link.filename" />
        </div>
      </section>
    </div>
  </section>
</template>
<style scoped>
.overview-heading { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin: 8px 0 32px; }
.overview-heading h1 { font-size: clamp(27px, 4vw, 39px); font-weight: 600; letter-spacing: -1.3px; margin: 0; }
.overview-grid { display: grid; grid-template-columns: minmax(0, 1fr); align-items: start; gap: 24px; }
.overview-glass { --glass-filter: blur(18px) saturate(1.35); position: relative; isolation: isolate; min-width: 0; padding: 28px; border: 1px solid #ffffffb3; border-radius: 28px; box-shadow: 0 14px 50px #45608a0c, 0 3px 12px #45608a06; }
.overview-glass::before { content: ''; position: absolute; inset: 0; z-index: -2; border-radius: inherit; background: linear-gradient(140deg,#ffffff85,#ffffff40 60%,#ffffff66); -webkit-backdrop-filter: var(--glass-filter); backdrop-filter: var(--glass-filter); box-shadow: inset 0 1px 2px #ffffffe0, inset 1px 0 2px #ffffff80, inset 0 -1px 2px #ffffff70; }
.overview-glass::after { content: ''; position: absolute; inset: 0; z-index: -1; border-radius: inherit; padding: 1px; pointer-events: none; background: linear-gradient(130deg,#fff,#ffffff10 30%,#a0bbdf40 55%,#ffffffbb 80%,#ffffff20); -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; }
.panel-heading { display: flex; align-items: center; gap: 12px; margin-bottom: 26px; }
.panel-symbol { width: 40px; height: 40px; flex-shrink: 0; display: grid; place-items: center; border-radius: 14px; background: #ffffff60; border: 1px solid #ffffffb3; color: #7994bc; box-shadow: inset 0 1px 2px #ffffffcc; }
.panel-symbol svg { width: 21px; height: 21px; }
.panel-heading h2 { font-size: 16px; font-weight: 600; margin: 0 0 5px; letter-spacing: -.3px; }
.panel-heading p { font-size: 11px; margin: 0; color: #8290a5; }
.subscription-links { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 24px; }
.subscriptions-panel :deep(.field) { margin: 0; padding: 20px 0; border-top: 1px solid #8295b214; }
.subscriptions-panel :deep(label) { font-size: 12px; color: #647792; font-weight: 550; margin-bottom: 10px; }
.subscriptions-panel :deep(input) { background: #ffffff40; border: 1px solid #ffffffa6; border-radius: 12px; font-size: 12px; padding: 11px 12px; margin-bottom: 0; color: #667b98; text-overflow: ellipsis; }
.subscriptions-panel :deep(.actions) { align-items: center; gap: 8px; margin-top: 10px; }
.subscriptions-panel :deep(button) { font-size: 11px; padding: 8px 12px; border-radius: 10px; }
.subscriptions-panel :deep(.actions a) { font-size: 11px; padding: 6px 4px; }
.subscriptions-panel :deep(img) { max-width: 100%; height: auto; border-radius: 16px; margin-top: 16px; }
.overview-loading { padding: 48px 24px; text-align: center; color: #8290a5; font-size: 13px; }
:global(:root[data-theme=dark] .overview-glass) { border-color: #ffffff26; box-shadow: 0 14px 50px #0000001a; }
:global(:root[data-theme=dark] .overview-glass::before) { background: linear-gradient(140deg,#24374a9e,#18253688 60%,#2731498f); box-shadow: inset 0 1px 2px #ffffff26, inset 0 -1px 2px #ffffff1a; }
:global(:root[data-theme=dark] .overview-glass::after) { opacity: .35; }
:global(:root[data-theme=dark] .panel-symbol)  { background: #ffffff08; border-color: #ffffff20; box-shadow: none; }
:global(:root[data-theme=dark] .subscriptions-panel input) { background: #101c3033; border-color: #ffffff20; color: #a9bbd6; }
:global(:root[data-theme=dark] .subscriptions-panel label) { color: #a0b2cb; }
@media (max-width: 800px) { .overview-grid, .subscription-links { grid-template-columns: 1fr; } }
@media (max-width: 600px) { .overview-heading { display: block; margin-bottom: 24px; } .overview-glass { padding: 22px; border-radius: 24px; } }
@media (prefers-reduced-transparency: reduce) { .overview-glass::before { -webkit-backdrop-filter: none; backdrop-filter: none; background: #f1f5fc; } :global(:root[data-theme=dark] .overview-glass::before) { background: #1c2b3c; } }
</style>

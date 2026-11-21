<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useConfigStore } from '../stores/config';
import ShareLink from '../components/ShareLink.vue';
import PageState from '../components/PageState.vue';
import SubscriptionTokenHelp from '../components/SubscriptionTokenHelp.vue';
import { subscriptionLinks } from '../features/sharing/links';
const store = useConfigStore(), loading = ref(true), error = ref('');
async function load() {
  loading.value = true; error.value = '';
  try { await store.load(); } catch (cause) { error.value = cause instanceof Error ? cause.message : '读取配置失败'; }
  finally { loading.value = false; }
}
onMounted(load);
const links = computed(() => {
  const generation = store.data?.优选订阅生成;
  const sub = generation && typeof generation === 'object' && !Array.isArray(generation) ? generation : {};
  return sub.TOKEN ? subscriptionLinks(location.origin, String(sub.TOKEN), String(sub.SUBNAME || store.data?.HOST || location.hostname)) : [];
});
const commonLinks = computed(() => links.value.filter(link => ['auto', 'clash', 'sb'].includes(link.id)));
const otherLinks = computed(() => links.value.filter(link => !['auto', 'clash', 'sb'].includes(link.id)));
const summary = computed(() => [
  { label: '节点域名', value: String(store.data?.HOST || '未设置') },
  { label: '协议 / 传输', value: `${String(store.data?.协议类型 || '—').toUpperCase()} / ${String(store.data?.传输协议 || '—').toUpperCase()}` },
  { label: 'ECH', value: store.data?.ECH ? '已启用' : '未启用' },
]);
</script>
<template>
  <section class="management-page">
    <div class="dashboard-heading"><div><h1 class="page-title">概览</h1><p class="page-description">获取订阅，或继续调整你的节点。</p></div><RouterLink class="button secondary" to="/illumination/settings">配置节点 <span aria-hidden="true">↗</span></RouterLink></div>
    <PageState :loading="loading" :error="error" @retry="load" />
    <template v-if="!loading && !error && store.data">
      <dl class="node-summary"><div v-for="item in summary" :key="item.label"><dt>{{ item.label }}</dt><dd>{{ item.value }}</dd></div></dl>
      <section class="card subscriptions-panel" aria-labelledby="subscriptions-title">
        <div class="section-heading"><h2 id="subscriptions-title">订阅与导入</h2><p>复制链接或扫描二维码，在客户端添加订阅。链接包含访问凭据，请妥善保管。</p></div>
        <div class="subscription-links"><ShareLink v-for="link in commonLinks" :key="link.id" copy-button :label="link.label" :url="link.url" :import-url="link.importUrl" :filename="link.filename"><template v-if="link.id === 'auto'" #label-action><SubscriptionTokenHelp /></template></ShareLink></div>
        <p v-if="!links.length" class="error" role="alert">未读取到订阅凭据，请重新加载配置。</p>
        <details><summary>其他客户端与单节点链接</summary><div class="subscription-links"><ShareLink copy-button label="单节点链接" :url="String(store.data.LINK || '')" :import-url="String(store.data.LINK || '')" /><ShareLink v-for="link in otherLinks" :key="link.id" copy-button :label="link.label" :url="link.url" :import-url="link.importUrl" :filename="link.filename" /></div></details>
        <p class="hint subscription-note">Clash、Sing-box 等格式可能依赖订阅转换服务；遇到导入错误时，可检查转换后端。</p>
      </section>
      <div class="dashboard-shortcuts"><RouterLink to="/illumination/subscription"><span class="shortcut-number">01</span><div><strong>选择订阅来源</strong><p>随机地址、自定义地址或已有生成器</p></div><span aria-hidden="true">→</span></RouterLink><RouterLink to="/illumination/cdn"><span class="shortcut-number">02</span><div><strong>设置上游代理</strong><p>PROXYIP 或自己的代理账号</p></div><span aria-hidden="true">→</span></RouterLink></div>
    </template>
  </section>
</template>
<style scoped>
.dashboard-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; }
.dashboard-heading .button { margin-top:3px; }
.node-summary { display:grid; grid-template-columns:1.5fr 1fr .7fr; gap:0; margin:0 0 24px; padding:22px 24px; border:1px solid var(--edge); border-radius:14px; background:var(--surface); }
.node-summary > div { min-width:0; padding:0 24px; border-right:1px solid var(--edge); }.node-summary > div:first-child { padding-left:0; }.node-summary > div:last-child { border-right:0; }.node-summary dt { font-size:11px; }.node-summary dd { margin:9px 0 0; font-weight:600; font-size:14px; }
.subscription-links { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:20px 28px; }
.subscription-links :deep(.field) { margin:0; padding:18px 0 0; border-top:1px solid var(--edge); }
.subscription-links :deep(input) { font-family:ui-monospace,monospace; font-size:12px; }
.subscription-links :deep(.actions) { margin-top:10px; gap:12px; font-size:12px; }.subscription-links :deep(.actions button) { min-height:34px; padding:7px 10px; font-size:12px; }
.subscription-note { margin-bottom:0; margin-top:24px; }
.dashboard-shortcuts { display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-top:22px; }.dashboard-shortcuts a { display:flex; align-items:center; gap:14px; padding:22px; border:1px solid var(--edge); border-radius:14px; color:var(--ink); background:var(--surface); }.dashboard-shortcuts a:hover { border-color:var(--accent); text-decoration:none; }.dashboard-shortcuts strong { font-size:13px; }.dashboard-shortcuts p { font-size:11px; color:var(--muted); margin:5px 0 0; }.dashboard-shortcuts a > span:last-child { margin-left:auto; color:var(--muted); }.shortcut-number { font-size:11px; color:var(--accent); align-self:flex-start; padding-top:2px; }
@media(max-width:1100px) { .dashboard-shortcuts { grid-template-columns:1fr; } }
@media(max-width:600px) { .subscription-links { grid-template-columns:1fr; gap:18px; }.dashboard-heading .button { font-size:11px; padding:8px 10px; }.node-summary { padding:18px; grid-template-columns:1fr 1fr; gap:18px; }.node-summary > div { padding:0; border:0; }.node-summary > div:first-child { grid-column:1/-1; border-bottom:1px solid var(--edge); padding-bottom:16px; } }
</style>

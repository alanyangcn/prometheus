<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useConfigStore } from '../stores/config';
import type { Configuration } from '../../shared/config';
import { snapshot } from '../stores/snapshot';
import PersistedSection from '../components/PersistedSection.vue';
import { readPreference, writePreference } from '../features/configuration/preferences';
import ConfigurationModes from '../components/ConfigurationModes.vue';
import { prepareSettings, echConflict, resolveEchConflict, group, applyProtocolInteractions, hostsMismatch } from '../features/configuration/settings';
import { api } from '../api/client';
import ConfigFields from '../components/ConfigFields.vue';
const currentHostname = location.hostname;
const mode = ref(readPreference(localStorage, 'mode', 'simple'));
watch(mode, value => writePreference(localStorage, 'mode', value));
const store = useConfigStore(); const draft = ref<Configuration | null>(null);
const message = ref(''); const error = ref(''); const busy = ref(false);
const conflict = computed(() => draft.value ? echConflict(draft.value) : false);
watch(() => [draft.value?.协议类型, draft.value?.传输协议, draft.value?.SS], () => {
  if (draft.value) applyProtocolInteractions(draft.value);
}, { deep: true });
const disabledFields = computed(() => {
  if (!draft.value) return [];
  const ss = draft.value.协议类型 === 'ss';
  return [...(ss ? ['传输协议'] : []), ...(ss || draft.value.传输协议 === 'grpc' ? ['启用0RTT'] : []), ...(ss && group(draft.value, 'SS').TLS === false ? ['ECH', 'TLS分片'] : [])];
});
function fillUserAgent() { if (draft.value) draft.value.gRPCUserAgent = navigator.userAgent; }
function resolve(action: 'chrome' | 'firefox' | 'disable') { if (draft.value) resolveEchConflict(draft.value, action); }
function cancel() { if (store.data) draft.value = snapshot(store.data); message.value = '已取消未保存的修改'; error.value = ''; }
const basicKeys = ['协议类型', '传输协议', 'PATH', 'SS', 'Fingerprint', 'gRPC模式', 'gRPCUserAgent', '跳过证书验证'];
const advancedExcluded = ['优选订阅生成', '反代', 'TG', '订阅转换配置', ...basicKeys];
async function load() {
  try { draft.value = snapshot(await store.load()); }
  catch (e) { error.value = e instanceof Error ? e.message : '加载失败'; }
}
onMounted(load);
async function save() {
  if (!draft.value) return;
  if (conflict.value) { error.value = '请先解决 ECH 与浏览器指纹的冲突'; return; } busy.value = true; message.value = ''; error.value = '';
  try { const prepared = prepareSettings(draft.value, navigator.userAgent);
    const subscription = prepared.优选订阅生成 as Configuration | undefined;
    const library = subscription?.本地IP库 as Configuration | undefined;
    if (subscription?.local && library?.随机IP === false && !(await api<{ text: string }>('/api/addresses')).text.trim()) throw new Error('自定义地址库不能为空，请先添加地址');
    await store.save(prepared); draft.value = snapshot(store.data!); message.value = '设置已保存'; }
  catch (e) { error.value = e instanceof Error ? e.message : '保存失败'; }
  finally { busy.value = false; }
}
async function reset() {
  if (!window.confirm('重置节点设置？地址库和集成凭据会保留。')) return;
  busy.value = true; error.value = '';
  try { await store.reset(); draft.value = snapshot(store.data!); message.value = '设置已重置'; }
  catch (e) { error.value = e instanceof Error ? e.message : '重置失败'; }
  finally { busy.value = false; }
}
</script>
<template>
  <h1>节点设置</h1>
  <p class="intro">设置协议、传输、订阅生成和上游代理。凭据在集成页面单独管理。</p>
  <p v-if="error" role="alert" class="error">{{ error }}</p>
  <form v-if="draft" class="card" @submit.prevent="save">
    <div class="field"><label for="settings-mode">设置界面</label><select id="settings-mode" v-model="mode"><option value="simple">简单模式</option><option value="expert">专家模式</option></select></div>
    <p v-if="hostsMismatch(draft, currentHostname)" role="status" class="hint">当前访问域名 {{ currentHostname }} 不在 HOSTS 列表中（{{ Array.isArray(draft.HOSTS) ? draft.HOSTS.join(', ') : '' }}）。生成节点使用已配置域名，请确认该域名可访问。</p>
    <PersistedSection id="node" title="节点设置" default-open><ConfigFields :model="draft" :exclude="Object.keys(draft).filter(key => !basicKeys.includes(key))" :disabled="disabledFields" /></PersistedSection>
    <PersistedSection v-if="mode === 'expert'" id="advanced" title="TLS、ECH 与高级节点设置"><ConfigFields :model="draft" :exclude="advancedExcluded" :disabled="disabledFields" /></PersistedSection>
    <div v-if="'gRPCUserAgent' in draft" class="actions"><button type="button" class="secondary" @click="fillUserAgent()">使用当前浏览器 UA</button></div>
    <section v-if="conflict" role="alert" class="card"><p>当前指纹 {{ draft.Fingerprint }} 不支持 ECH，请选择兼容指纹或关闭 ECH。</p><div class="actions"><button type="button" @click="resolve('chrome')">使用 Chrome 并启用 ECH</button><button type="button" @click="resolve('firefox')">使用 Firefox 并启用 ECH</button><button type="button" @click="resolve('disable')">关闭 ECH</button></div></section>
    <ConfigurationModes :model="draft" :expert="mode === 'expert'" />
    <div class="actions"><button :disabled="busy">保存设置</button><button type="button" class="secondary" :disabled="busy" @click="cancel">取消修改</button><button type="button" class="secondary" :disabled="busy" @click="reset">重置设置</button></div>
    <p v-if="message" role="status" class="success">{{ message }}</p>
  </form>
</template>

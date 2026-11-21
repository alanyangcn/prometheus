<script setup lang="ts">
import PageState from '../components/PageState.vue';
import UnsavedChanges from '../components/UnsavedChanges.vue';
import { useToastMessage } from '../composables/useToast';
import { vGlassDialog } from '../features/appearance/glassDialog';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { Configuration } from '../../shared/config';
import { useConfigStore } from '../stores/config';
import { snapshot } from '../stores/snapshot';
import { group, prepareSettings } from '../features/configuration/settings';
import ConfigFields from '../components/ConfigFields.vue';
import { parseChainInput } from '../features/tools/chain';
import type { ProxyResult } from '../features/tools/proxies';
import { api } from '../api/client';
const loading = ref(true), loadError = ref('');
const store = useConfigStore();
const draft = ref<Configuration | null>(null);
const busy = ref(false), error = useToastMessage('error'), message = useToastMessage('success');
const verification = ref('');
const verificationKey = computed(() => draft.value ? `${group(group(draft.value, '反代'), 'SOCKS5').启用}:${group(group(draft.value, '反代'), 'SOCKS5').账号}` : '');
const reverse = computed(() => draft.value ? group(draft.value, '反代') : {} as Configuration);
const proxy = computed(() => group(reverse.value, 'SOCKS5'));
const protocol = computed({get: () => String(proxy.value.启用 || 'socks5'), set: (value: string) => {proxy.value.启用 = value; verification.value = '';}});
const accessMode = computed({get: () => proxy.value.启用 ? 'other' : 'auto', set: (value: string) => {proxy.value.启用 = value === 'auto' ? null : 'socks5'; verification.value = '';}});
const automatic = computed({get: () => reverse.value.PROXYIP === 'auto', set: (value: boolean) => {reverse.value.PROXYIP = value ? 'auto' : '';}});
const dialog = ref<HTMLDialogElement | null>(null), dialogKind = ref('');
const account = ref(''), modalError = useToastMessage('error'), modalBusy = ref(false);
function openDialog(kind: string) { dialogKind.value = kind; modalError.value = ''; account.value = String(proxy.value.账号 || ''); dialog.value?.showModal(); }
async function verifyAccount() {
  modalBusy.value = true; modalError.value = '';
  try { const selectedProtocol = protocol.value; const input = parseChainInput(account.value, selectedProtocol); const result = await api<ProxyResult>('/api/proxy-check', {type:input.scheme,address:input.address}); if (!result.success) throw new Error(result.error || '验证失败'); proxy.value.启用 = input.scheme; proxy.value.账号 = input.address; verification.value = verificationKey.value; dialog.value?.close(); message.value = '代理验证成功，已填入，请保存设置'; }
  catch (cause) { modalError.value = cause instanceof Error ? cause.message : '验证失败'; } finally { modalBusy.value = false; }
}
function syncSavedVerification(value: Configuration) {
  const savedProxy = group(group(value, '反代'), 'SOCKS5');
  verification.value = savedProxy.启用 && String(savedProxy.账号 || '').trim() ? `${savedProxy.启用}:${savedProxy.账号}` : '';
}
const changed = computed(() => !!draft.value && JSON.stringify(draft.value.反代) !== JSON.stringify(store.data?.反代));
async function load() { loading.value = true; loadError.value = ''; try { const loaded = snapshot(await store.load()); draft.value = loaded; syncSavedVerification(loaded); } catch (cause) { loadError.value = cause instanceof Error ? cause.message : '加载失败'; } finally { loading.value = false; } }
onMounted(load);
onBeforeUnmount(() => dialog.value?.close());
function cancel() { if (store.data) { const restored = snapshot(store.data); draft.value = restored; syncSavedVerification(restored); } else verification.value = ''; error.value = ''; message.value = ''; }
async function save() {
  if (!draft.value || !changed.value || busy.value) return; error.value = ''; message.value = '';
  const rev = group(draft.value, '反代');
  const proxy = group(rev, 'SOCKS5');
  if (!proxy.启用 && !String(rev.PROXYIP || '').trim()) { error.value = '请填写 PROXYIP 地址或启用自动获取'; return; }
  if (proxy.启用 && verification.value !== verificationKey.value) { error.value = '请先验证当前代理账号'; return; }
  busy.value = true;
  try { await store.save(prepareSettings({反代: snapshot(rev)}, navigator.userAgent)); const updated = snapshot(store.data!); draft.value = updated; syncSavedVerification(updated); message.value = '上游代理已保存'; }
  catch (cause) { error.value = cause instanceof Error ? cause.message : '保存失败'; } finally { busy.value = false; }
}
</script>
<template>
<section class="management-page"><h1 class="page-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 18a4 4 0 0 1-1-8 7 7 0 0 1 13-1 4.5 4.5 0 0 1 0 9H6Z"/></svg><span>上游代理</span></h1>
<p class="page-description">设置 Worker 连接目标时使用的落地地址或代理账号。</p>

<PageState :loading="loading" :error="loadError" @retry="load" />
<UnsavedChanges :changed="changed" :busy="busy" />
<form v-if="draft && !loading && !loadError" class="card cdn-form" @submit.prevent="save">
<fieldset class="cdn-fields" :disabled="busy">
<div class="cdn-row"><label for="cdn-mode">反代模式</label><select v-glass-select id="cdn-mode" v-model="accessMode"><option value="auto">PROXYIP</option><option value="other">其他代理</option></select></div>
<div v-if="accessMode === 'auto'" class="cdn-row"><label for="cdn-ip">PROXYIP</label><div class="cdn-inline"><input id="cdn-ip" v-model="reverse.PROXYIP" :disabled="automatic" placeholder="proxyip.cmliussss.net" /><label class="cdn-check"><input v-model="automatic" type="checkbox" />启用自动获取</label></div></div>
<div v-else class="cdn-row"><label for="cdn-protocol">代理协议</label><div class="cdn-inline"><select v-glass-select id="cdn-protocol" v-model="protocol" class="protocol-select"><option v-for="value in ['socks5','http','https','turn','sstp']" :key="value">{{ value }}</option></select><span aria-hidden="true">://</span><input :value="String(proxy.账号 || '')" readonly aria-label="代理账号，点击验证" placeholder="user:password@127.0.0.1:1080" @click="openDialog('account')" @keydown.enter.prevent="openDialog('account')" /><label class="cdn-check"><input v-model="proxy.全局" type="checkbox" />启用全局代理</label></div></div>
<details v-if="accessMode === 'other' && !proxy.全局"><summary>代理目标白名单</summary><ConfigFields :model="proxy" :exclude="['启用','账号','全局']" prefix="cdn-target" /></details>
</fieldset>
<div class="cdn-footer form-footer"><div class="cdn-tools"><button type="button" class="secondary" @click="openDialog('help')">为什么需要反代？PROXYIP 又是什么？</button><button v-if="reverse.路径模板 !== undefined && (accessMode === 'auto' || ['socks5','http'].includes(protocol))" type="button" class="secondary" @click="openDialog('templates')">路径模板配置</button></div><span class="form-status" :class="{ dirty: changed }">{{ changed ? '有未保存的修改' : '配置已同步' }}</span><div class="actions"><button type="button" class="secondary" :disabled="busy || !changed" @click="cancel">取消</button><button :disabled="busy || !changed">{{ busy ? '保存中…' : '保存' }}</button></div></div>

</form>
<Teleport to="body"><dialog ref="dialog" v-glass-dialog class="cdn-dialog glass-dialog" @cancel="event => { if (modalBusy) event.preventDefault(); }"><div class="dialog-heading"><h2>{{ {account:'代理账号验证',templates:'路径模板配置',help:'为什么需要反代？PROXYIP 是什么？'}[dialogKind] }}</h2><button type="button" class="secondary" :disabled="modalBusy" aria-label="关闭" @click="dialog?.close()">×</button></div>
<template v-if="dialogKind === 'account'"><label for="cdn-account">{{ protocol.toUpperCase() }} 代理地址</label><input id="cdn-account" v-model="account" type="password" autocomplete="off" placeholder="user:password@host:port" :disabled="modalBusy" /><button type="button" :disabled="modalBusy || !account.trim()" @click="verifyAccount">{{ modalBusy ? '验证中…' : '验证并填入' }}</button><p>验证通过后填入表单，点击页面“保存”后生效。</p></template>
<template v-else-if="dialogKind === 'templates'"><p>模板使用 <code v-text="'{{IP:PORT}}'" /> 作为代理地址占位符，保存时去掉开头的斜线。</p><ConfigFields :model="group(reverse,'路径模板')" prefix="cdn-template" /><button type="button" class="secondary" @click="dialog?.close()">完成，返回表单保存</button></template>

<template v-else><p>Worker 访问部分 Cloudflare CDN 目标时，需要使用上游落地地址。PROXYIP 模式使用指定地址，自动获取使用项目内置来源。</p><p>其他代理模式通过账号代理连接目标；关闭全局代理时按目标白名单使用，开启时将其他目标也交给代理。代理可用性由实际连接和目标响应决定。</p><p>路径模板将代理参数编码进节点路径；修改后需要保存并在客户端更新订阅。</p></template>
</dialog></Teleport>
</section>
</template>
<style scoped>
.cdn-fields { border:0; padding:0; margin:0; min-width:0; }
.cdn-row { display:grid; grid-template-columns:160px minmax(0,1fr); align-items:center; gap:20px; margin-bottom:20px; }
.cdn-row > label { margin:0; font-size:12px; }.cdn-row input,.cdn-row select { margin:0; min-width:0; }
.cdn-inline { display:flex; align-items:center; gap:10px; min-width:0; }.cdn-inline > input { flex:1; width:0; cursor:pointer; }.cdn-inline .protocol-select { width:100px; flex-shrink:0; }
.cdn-check { display:flex; align-items:center; gap:8px; white-space:nowrap; margin:0; font-size:12px; }
.cdn-footer { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:16px; padding-top:20px; border-top:1px solid #8295b220; }.cdn-tools { display:flex; flex-wrap:wrap; gap:8px; }.cdn-footer button { font-size:12px; }.cdn-footer .actions { margin:0; }
.cdn-dialog { width: min(720px, calc(100vw - 32px)); }.dialog-heading { display:flex; justify-content:space-between; align-items:center; gap:16px; }.dialog-heading h2 { font-size:18px; }.cdn-dialog p { font-size:13px; line-height:1.8; }

@media(max-width:700px) { .cdn-row { grid-template-columns:1fr; gap:8px; }.cdn-inline { flex-wrap:wrap; }.cdn-inline > input { min-width:140px; }.cdn-check { width:100%; }.cdn-footer { align-items:flex-start; }.cdn-footer .actions { margin-left:auto; } }
</style>

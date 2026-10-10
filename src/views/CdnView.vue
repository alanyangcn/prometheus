<script setup lang="ts">
import { useToastMessage } from '../composables/useToast';
import { vGlassDialog } from '../features/appearance/glassDialog';
import { computed, onMounted, ref } from 'vue';
import type { Configuration } from '../../shared/config';
import { useConfigStore } from '../stores/config';
import { snapshot } from '../stores/snapshot';
import { group, prepareSettings } from '../features/configuration/settings';
import ConfigFields from '../components/ConfigFields.vue';
import { parseChainInput } from '../features/tools/chain';
import type { DirectoryEntry, ProxyResult } from '../features/tools/proxies';
import { api } from '../api/client';
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
const entries = ref<DirectoryEntry[]>([]), directoryResults = ref<Record<string,ProxyResult>>({});
const directoryKind = ref(''), search = ref(''), country = ref('');
const filtered = computed(() => entries.value.filter(item => (!country.value || item.country === country.value) && `${item.address} ${item.countryName} ${item.city}`.toLowerCase().includes(search.value.toLowerCase())));
const presets = ref<{label:string;templates:Configuration;message?:string}[]>([]);
function openDialog(kind: string) { dialogKind.value = kind; modalError.value = ''; account.value = String(proxy.value.账号 || ''); dialog.value?.showModal(); }
async function verifyAccount() {
  modalBusy.value = true; modalError.value = '';
  try { const selectedProtocol = protocol.value; const input = parseChainInput(account.value, selectedProtocol); const result = await api<ProxyResult>('/api/proxy-check', {type:input.scheme,address:input.address}); if (!result.success) throw new Error(result.error || '验证失败'); proxy.value.启用 = input.scheme; proxy.value.账号 = input.address; verification.value = verificationKey.value; dialog.value?.close(); message.value = '代理验证成功，已填入，请保存设置'; }
  catch (cause) { modalError.value = cause instanceof Error ? cause.message : '验证失败'; } finally { modalBusy.value = false; }
}
async function openDirectory() {
  openDialog('directory'); entries.value = []; directoryResults.value = {}; search.value = ''; country.value = ''; directoryKind.value = accessMode.value === 'auto' ? 'proxyip' : protocol.value; modalBusy.value = true;
  try { entries.value = await api<DirectoryEntry[]>('/api/tools/proxy-directory', {type:directoryKind.value}); } catch (cause) { modalError.value = cause instanceof Error ? cause.message : '目录读取失败'; } finally { modalBusy.value = false; }
}
async function chooseEntry(entry: DirectoryEntry) {
  modalBusy.value = true; modalError.value = '';
  try { const input = parseChainInput(entry.address,directoryKind.value); const result = await api<ProxyResult>(directoryKind.value === 'proxyip' ? '/api/tools/proxyip-check' : '/api/proxy-check', directoryKind.value === 'proxyip' ? {address:entry.address} : {type:input.scheme,address:input.address}); directoryResults.value[entry.address] = result; if (!result.success) throw new Error(result.error || '该地址不可用'); if (directoryKind.value === 'proxyip') reverse.value.PROXYIP = entry.address; else {proxy.value.启用 = input.scheme; proxy.value.账号 = input.address; verification.value = verificationKey.value;} dialog.value?.close(); message.value = '已验证并填入，请保存设置'; }
  catch (cause) { modalError.value = cause instanceof Error ? cause.message : '验证失败'; } finally { modalBusy.value = false; }
}
async function loadTemplates() { modalBusy.value = true; modalError.value = ''; try {presets.value = await api('/api/tools/path-presets',{});} catch (cause) {modalError.value = cause instanceof Error ? cause.message : '预设读取失败';} finally {modalBusy.value = false;} }
function applyTemplate(event: Event) { const value = (event.target as HTMLSelectElement).value; if (value === '') return; const preset = presets.value[Number(value)]; if (preset) Object.assign(group(reverse.value,'路径模板'), snapshot(preset.templates)); }
onMounted(async () => { try { draft.value = snapshot(await store.load()); } catch (cause) { error.value = cause instanceof Error ? cause.message : '加载失败'; } });
function cancel() { if (store.data) draft.value = snapshot(store.data); error.value = ''; message.value = ''; verification.value = ''; }
async function save() {
  if (!draft.value || busy.value) return; error.value = ''; message.value = '';
  const proxy = group(group(draft.value, '反代'), 'SOCKS5');
  if (proxy.启用 && verification.value !== verificationKey.value) { error.value = '请先验证当前代理账号'; return; }
  busy.value = true;
  try { await store.save(prepareSettings({反代: snapshot(group(draft.value, '反代'))}, navigator.userAgent)); draft.value = snapshot(store.data!); message.value = 'Cloudflare CDN 访问设置已保存'; }
  catch (cause) { error.value = cause instanceof Error ? cause.message : '保存失败'; } finally { busy.value = false; }
}
</script>
<template>
<section class="management-page"><h1 class="page-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 18a4 4 0 0 1-1-8 7 7 0 0 1 13-1 4.5 4.5 0 0 1 0 9H6Z"/></svg><span>Cloudflare CDN 访问设置</span></h1>

<form v-if="draft" class="card cdn-form" @submit.prevent="save">
<fieldset class="cdn-fields" :disabled="busy">
<div class="cdn-row"><label for="cdn-mode">反代模式</label><select v-glass-select id="cdn-mode" v-model="accessMode"><option value="auto">PROXYIP</option><option value="other">其他代理</option></select></div>
<div v-if="accessMode === 'auto'" class="cdn-row"><label for="cdn-ip">PROXYIP</label><div class="cdn-inline"><input id="cdn-ip" v-model="reverse.PROXYIP" :disabled="automatic" placeholder="proxyip.cmliussss.net" /><label class="cdn-check"><input v-model="automatic" type="checkbox" />启用自动获取</label></div></div>
<div v-else class="cdn-row"><label for="cdn-protocol">代理协议</label><div class="cdn-inline"><select v-glass-select id="cdn-protocol" v-model="protocol" class="protocol-select"><option v-for="value in ['socks5','http','https','turn','sstp']" :key="value">{{ value }}</option></select><span aria-hidden="true">://</span><input :value="String(proxy.账号 || '')" readonly aria-label="代理账号，点击验证" placeholder="user:password@127.0.0.1:1080" @click="openDialog('account')" @keydown.enter.prevent="openDialog('account')" /><label class="cdn-check"><input v-model="proxy.全局" type="checkbox" />启用全局代理</label></div></div>
<details v-if="accessMode === 'other' && !proxy.全局"><summary>代理目标白名单</summary><ConfigFields :model="proxy" :exclude="['启用','账号','全局']" prefix="cdn-target" /></details>
</fieldset>
<div class="cdn-footer"><div class="cdn-tools"><button type="button" class="secondary" @click="openDialog('help')">为什么需要反代？PROXYIP 又是什么？</button><button v-if="reverse.路径模板 !== undefined && (accessMode === 'auto' || ['socks5','http'].includes(protocol))" type="button" class="secondary" @click="openDialog('templates')">路径模板配置</button><button v-if="accessMode === 'auto' || ['socks5','http','https'].includes(protocol)" type="button" class="secondary" @click="openDirectory">获取更多 {{ accessMode === 'auto' ? 'PROXYIP' : protocol.toUpperCase() }}</button></div><div class="actions"><button type="button" class="secondary" :disabled="busy" @click="cancel">取消</button><button :disabled="busy">{{ busy ? '保存中…' : '保存' }}</button></div></div>

</form>
<Teleport to="body"><dialog ref="dialog" v-glass-dialog class="cdn-dialog glass-dialog" @cancel="event => { if (modalBusy) event.preventDefault(); }"><div class="dialog-heading"><h2>{{ {account:'代理账号验证',templates:'路径模板配置',directory:'获取更多代理',help:'为什么需要反代？PROXYIP 是什么？'}[dialogKind] }}</h2><button type="button" class="secondary" :disabled="modalBusy" aria-label="关闭" @click="dialog?.close()">×</button></div>
<template v-if="dialogKind === 'account'"><label for="cdn-account">{{ protocol.toUpperCase() }} 代理地址</label><input id="cdn-account" v-model="account" type="password" autocomplete="off" placeholder="user:password@host:port" :disabled="modalBusy" /><button type="button" :disabled="modalBusy || !account.trim()" @click="verifyAccount">{{ modalBusy ? '验证中…' : '验证并填入' }}</button><p>验证通过后填入表单，点击页面“保存”后生效。</p></template>
<template v-else-if="dialogKind === 'templates'"><button type="button" class="secondary" :disabled="modalBusy" @click="loadTemplates">读取模板预设</button><select v-glass-select v-if="presets.length" aria-label="路径模板预设" @change="applyTemplate"><option value="">选择预设</option><option v-for="(preset,index) in presets" :key="preset.label" :value="index">{{ preset.label }}</option></select><p>模板使用 <code v-text="'{{IP:PORT}}'" /> 作为代理地址占位符，保存时去掉开头的斜线。</p><ConfigFields :model="group(reverse,'路径模板')" prefix="cdn-template" /><button type="button" class="secondary" @click="dialog?.close()">完成，返回表单保存</button></template>
<template v-else-if="dialogKind === 'directory'"><p v-if="modalBusy" role="status">读取或验证中…</p><label for="cdn-search">搜索地址或地区</label><input id="cdn-search" v-model="search" /><select v-glass-select v-model="country" aria-label="筛选国家"><option value="">全部国家</option><option v-for="value in [...new Set(entries.map(item => item.country))].sort()" :key="value">{{ value }}</option></select><p>{{ filtered.length }} 个结果</p><article v-for="entry in filtered.slice(0,100)" :key="entry.address" class="directory-entry"><span>{{ entry.countryName }} {{ entry.city }}</span><code>{{ entry.address }}</code><button type="button" class="secondary" :disabled="modalBusy" @click="chooseEntry(entry)">验证并选用</button></article><p v-if="filtered.length > 100">当前显示前 100 项，请搜索或按国家筛选。</p></template>
<template v-else><p>Worker 访问部分 Cloudflare CDN 目标时，需要使用上游落地地址。PROXYIP 模式使用指定地址，自动获取使用项目内置来源。</p><p>其他代理模式通过账号代理连接目标；关闭全局代理时按目标白名单使用，开启时将其他目标也交给代理。代理可用性由实际连接和目标响应决定。</p><p>路径模板将代理参数编码进节点路径；修改后需要保存并在客户端更新订阅。目录中的代理属于第三方来源，选用前会执行验证。</p></template>
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
.cdn-dialog { width: min(720px, calc(100vw - 32px)); }.dialog-heading { display:flex; justify-content:space-between; align-items:center; gap:16px; }.dialog-heading h2 { font-size:18px; }.cdn-dialog p { font-size:13px; line-height:1.8; }.directory-entry { display:grid; gap:8px; padding:16px 0; border-top:1px solid #8295b220; }.directory-entry code { overflow-wrap:anywhere; }

@media(max-width:700px) { .cdn-row { grid-template-columns:1fr; gap:8px; }.cdn-inline { flex-wrap:wrap; }.cdn-inline > input { min-width:140px; }.cdn-check { width:100%; }.cdn-footer { align-items:flex-start; }.cdn-footer .actions { margin-left:auto; } }
</style>

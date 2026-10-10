<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import type { Configuration } from '../../shared/config';
import { useConfigStore } from '../stores/config';
import { snapshot } from '../stores/snapshot';
import { group } from '../features/configuration/settings';
import { converterKey } from '../features/tools/converter';
import { api } from '../api/client';
const store = useConfigStore(), draft = ref<Configuration | null>(null);
const conversion = computed(() => draft.value ? group(draft.value,'订阅转换配置') : {} as Configuration);
const error = ref(''), message = ref(''), busy = ref(false), presetsError = ref('');
const presets = ref<{label:string;options:{label:string;value:string}[]}[]>([]), presetChoice = ref('custom');
const dialog = ref<HTMLDialogElement | null>(null), services = ref<{label:string;value:string}[]>([]), serviceChoice = ref('custom'), backend = ref('');
const modalBusy = ref(false), modalError = ref(''), version = ref(''), verifiedKey = ref(''), verifiedBase = ref('');
const currentKey = computed(() => converterKey(backend.value,String(conversion.value.SUBCONFIG || '')));
const canConfirm = computed(() => Boolean(verifiedKey.value && verifiedKey.value === currentKey.value));
const flags = [['SUBEMOJI','Emoji','在节点名称中显示 Emoji 旗帜'],['SUBLIST','仅输出节点信息','不附加规则和策略组'],['UDP','UDP','传递 UDP 转换参数'],['XUDP','XUDP','传递 XUDP 转换参数'],['TLS13','TLS 1.3','传递 TLS 1.3 转换参数']];
function syncPreset() { const value = String(conversion.value.SUBCONFIG || ''); presetChoice.value = presets.value.some(group => group.options.some(option => option.value === value)) ? value : 'custom'; }
async function loadPresets() { presetsError.value = ''; try {presets.value = await api('/api/tools/converter-presets',{}); syncPreset();} catch (cause) {presetsError.value = cause instanceof Error ? cause.message : '预设读取失败';} }
onMounted(async () => {try {draft.value = snapshot(await store.load()); await loadPresets();} catch (cause) {error.value = cause instanceof Error ? cause.message : '加载失败';}});
onBeforeUnmount(() => dialog.value?.close());
function choosePreset() { if (presetChoice.value !== 'custom') conversion.value.SUBCONFIG = presetChoice.value; }
function cancel() {if (store.data) draft.value = snapshot(store.data); syncPreset(); error.value = ''; message.value = '';}
async function openBackend() {backend.value = String(conversion.value.SUBAPI || ''); verifiedKey.value = ''; version.value = ''; modalError.value = ''; serviceChoice.value = 'custom'; dialog.value?.showModal(); modalBusy.value = true; try {services.value = await api('/api/tools/converter-list',{}); if (services.value.some(item => item.value === backend.value)) serviceChoice.value = backend.value;} catch (cause) {modalError.value = cause instanceof Error ? cause.message : '列表读取失败，可填写自定义地址';} finally {modalBusy.value = false;} }
function chooseService() {if (serviceChoice.value !== 'custom') backend.value = serviceChoice.value; verifiedKey.value = '';}
async function verifyBackend() {modalBusy.value = true; modalError.value = ''; verifiedKey.value = ''; try { const key = currentKey.value; const result = await api<{baseURL:string;version:string}>('/api/tools/converter-check',{baseURL:backend.value,config:conversion.value.SUBCONFIG}); if (key !== currentKey.value) throw new Error('地址或配置已变化，请重新验证'); verifiedBase.value = result.baseURL; verifiedKey.value = key; version.value = result.version;} catch (cause) {modalError.value = cause instanceof Error ? cause.message : '验证失败';} finally {modalBusy.value = false;} }
function confirmBackend() {if (!canConfirm.value) return; conversion.value.SUBAPI = verifiedBase.value; dialog.value?.close();}
async function save() {if (!draft.value || busy.value) return; error.value = ''; message.value = ''; busy.value = true; try { const patch = snapshot(conversion.value); const checked = await api<{baseURL:string}>('/api/tools/converter-check',{baseURL:patch.SUBAPI,config:patch.SUBCONFIG}); patch.SUBAPI = checked.baseURL; await store.save({订阅转换配置:patch}); draft.value = snapshot(store.data!); syncPreset(); message.value = '订阅转换配置已保存';} catch (cause) {error.value = cause instanceof Error ? cause.message : '保存失败';} finally {busy.value = false;} }
</script>
<template>
<section class="management-page"><h1 class="page-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 8h15m-4-4 4 4-4 4M20 16H5m4-4-4 4 4 4"/></svg><span>订阅转换配置</span></h1><p v-if="error" role="alert" class="error">{{ error }}</p>
<form v-if="draft" class="card" @submit.prevent="save"><fieldset :disabled="busy" class="conversion-fields">
<div class="conversion-row"><label for="conversion-backend">订阅转换后端</label><input id="conversion-backend" :value="conversion.SUBAPI" readonly placeholder="https://SUBAPI.cmliussss.net" title="点击验证和设置后端" @click="openBackend" @keydown.enter.prevent="openBackend" /></div>
<div class="conversion-row"><label for="conversion-preset">订阅转换配置文件</label><div><select id="conversion-preset" v-model="presetChoice" @change="choosePreset"><option value="custom">自定义</option><optgroup v-for="preset in presets" :key="preset.label" :label="preset.label"><option v-for="option in preset.options" :key="option.value" :value="option.value">{{ option.label }}</option></optgroup></select><input v-if="presetChoice === 'custom'" v-model="conversion.SUBCONFIG" aria-label="自定义订阅转换配置文件 URL" placeholder="https://raw.githubusercontent.com/…" required /><p v-if="presetsError" class="error">{{ presetsError }} <button type="button" class="secondary" @click="loadPresets">重新读取</button></p></div></div>
<div class="conversion-flags"><template v-for="[key,label,description] in flags" :key="key"><label v-if="conversion[key] !== undefined" :title="description"><input v-model="conversion[key]" type="checkbox" />{{ label }}</label></template></div>
</fieldset><div class="conversion-footer actions"><button type="button" class="secondary" :disabled="busy" @click="cancel">取消</button><button :disabled="busy">{{ busy ? '验证并保存中…' : '保存' }}</button></div><p v-if="message" class="success" role="status">{{ message }}</p></form>
<Teleport to="body"><dialog ref="dialog" class="conversion-dialog" aria-labelledby="backend-title" @cancel="event => {if (modalBusy) event.preventDefault();}"><h2 id="backend-title">订阅转换后端</h2><p v-if="modalError" role="alert" class="error">{{ modalError }}</p><label for="backend-service">订阅转换后端</label><select id="backend-service" v-model="serviceChoice" :disabled="modalBusy" @change="chooseService"><option value="custom">自定义</option><option v-for="service in services" :key="service.value" :value="service.value">{{ service.label }} · {{ service.value }}</option></select><template v-if="serviceChoice === 'custom'"><label for="backend-custom">自定义后端地址</label><input id="backend-custom" v-model="backend" :disabled="modalBusy" placeholder="输入订阅转换后端地址" /></template><p v-if="version" role="status">{{ version }}</p><div class="actions"><button type="button" :disabled="modalBusy || !backend.trim()" @click="verifyBackend">{{ modalBusy ? '验证中…' : '可用性验证' }}</button><button type="button" :disabled="modalBusy || !canConfirm" @click="confirmBackend">确定</button><button type="button" class="secondary" :disabled="modalBusy" @click="dialog?.close()">取消</button></div></dialog></Teleport>
</section>
</template>
<style scoped>
.conversion-fields { border:0; padding:0; margin:0; min-width:0; }.conversion-row { display:grid; grid-template-columns:160px minmax(0,1fr); align-items:start; gap:20px; margin-bottom:24px; }.conversion-row > label { padding-top:12px; font-size:12px; }.conversion-row > input[readonly] { cursor:pointer; }.conversion-flags { display:flex; flex-wrap:wrap; gap:16px; }.conversion-flags label { display:flex; align-items:center; gap:8px; font-size:12px; }.conversion-flags input { width:auto; margin:0; }.conversion-footer { justify-content:flex-end; border-top:1px solid #8295b220; padding-top:20px; margin-top:24px; }.conversion-dialog { width:min(580px,calc(100vw - 32px)); max-height:85dvh; padding:24px; border-radius:24px; border:1px solid #ffffffb3; color:#425773; background:#f0f5fbef; backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px); }.conversion-dialog::backdrop { background:#18263f50; backdrop-filter:blur(5px); }.conversion-dialog h2 { font-size:18px; }.conversion-dialog p { overflow-wrap:anywhere; font-size:12px; }
:global(:root[data-theme=dark] .conversion-dialog) { background:#1c2b3cef; color:#b1c1d8; border-color:#ffffff20; }
@media(max-width:700px) {.conversion-row {grid-template-columns:1fr; gap:8px;}.conversion-row > label {padding:0;}}
</style>

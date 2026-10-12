<script setup lang="ts">
import { useToastMessage } from '../composables/useToast';
import { vGlassDialog } from '../features/appearance/glassDialog';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useConfigStore } from '../stores/config';
import type { Configuration } from '../../shared/config';
import { snapshot } from '../stores/snapshot';
import { prepareSettings, echConflict, resolveEchConflict, group, applyProtocolInteractions, hostsMismatch } from '../features/configuration/settings';
const store = useConfigStore();
const draft = ref<Configuration | null>(null), original = ref<Configuration | null>(null);
const message = useToastMessage('success'), error = useToastMessage('error'), busy = ref(false);
const dialog = ref<HTMLDialogElement | null>(null), dialogKind = ref<'hosts' | 'uuid' | 'alpn' | 'tls'>('uuid');
const hostText = ref(''), dialogError = useToastMessage('error'), pendingALPN = ref('');
const hostname = location.hostname;
const nodeKeys = ['PATH', 'HOSTS', '协议类型', '传输协议', 'SS', 'Fingerprint', 'gRPC模式', 'gRPCUserAgent', '跳过证书验证', 'ALPN', '随机路径', '启用0RTT', 'TLS分片'];
const fingerprints = ['chrome', 'firefox', 'safari', 'ios', 'android', 'edge', '360', 'qq', 'random', 'randomized'];
const alpns = ['', 'h3', 'h2', 'http/1.1', 'h3,h2', 'h2,http/1.1', 'h3,h2,http/1.1'];
const has = (key: string) => draft.value?.[key] !== undefined;
const ss = computed(() => draft.value?.协议类型 === 'ss');
const noTLS = computed(() => ss.value && group(draft.value!, 'SS').TLS === false);
const grpc = computed(() => draft.value?.传输协议 === 'grpc');
const hosts = computed(() => Array.isArray(draft.value?.HOSTS) ? draft.value!.HOSTS as string[] : null);
const conflict = computed(() => !!draft.value && echConflict(draft.value));
function editable(config: Configuration): Configuration {
  const result: Configuration = {};
  for (const key of nodeKeys) if (config[key] !== undefined) result[key] = config[key];
  result.SUBNAME = group(config, '优选订阅生成').SUBNAME;
  result.ECH = config.ECH ?? false;
  return result;
}
const changed = computed(() => !!draft.value && !!original.value && JSON.stringify(editable(draft.value)) !== JSON.stringify(editable(original.value)));
watch(() => [draft.value?.协议类型, draft.value?.传输协议, draft.value?.SS], () => { if (draft.value) applyProtocolInteractions(draft.value); }, { deep: true });
function reset(value: Configuration) { original.value = snapshot(value); draft.value = snapshot(value); }
onMounted(async () => { try { reset(await store.load()); } catch (cause) { error.value = cause instanceof Error ? cause.message : '加载失败'; } });
onBeforeUnmount(() => dialog.value?.close());
function cancel() { if (original.value) draft.value = snapshot(original.value); error.value = ''; message.value = '已取消未保存的修改'; }
function fillUserAgent() { if (draft.value) draft.value.gRPCUserAgent = navigator.userAgent; }
function normalizePath() { if (draft.value) { const path = String(draft.value.PATH || '').split('#')[0].trim(); draft.value.PATH = path && !path.startsWith('/') ? `/${path}` : path; } }
function open(kind: typeof dialogKind.value) { dialogKind.value = kind; dialogError.value = ''; if (kind === 'hosts') hostText.value = hosts.value?.join('\n') || ''; dialog.value?.showModal(); }
function close() { dialog.value?.close(); }
function confirmHosts() {
  try {
    const items = [...new Set(hostText.value.split(/[\s,，。、]+/).filter(Boolean).map(value => new URL(value.includes('://') ? value : `https://${value}`).hostname.toLowerCase()))];
    if (!items.length) throw new Error('请至少输入一个域名');
    draft.value!.HOSTS = items; close(); message.value = '域名列表已更新，请保存配置';
  } catch { dialogError.value = '请至少输入一个有效域名，每行一个'; }
}
function setTLS(event: Event) {
  const value = (event.target as HTMLSelectElement).value === 'true';
  if (!value && group(draft.value!, 'SS').TLS !== false) { (event.target as HTMLSelectElement).value = 'true'; open('tls'); }
  else group(draft.value!, 'SS').TLS = value;
}
function setALPN(event: Event) {
  const select = event.target as HTMLSelectElement;
  if (select.value) { pendingALPN.value = select.value; select.value = String(draft.value!.ALPN || ''); open('alpn'); }
  else draft.value!.ALPN = '';
}
function confirmDialog() { if (dialogKind.value === 'alpn') draft.value!.ALPN = pendingALPN.value; else if (dialogKind.value === 'tls') group(draft.value!, 'SS').TLS = false; close(); }
function fragment(value: string, event: Event) { draft.value!.TLS分片 = (event.target as HTMLInputElement).checked ? value : null; }
function resolve(action: 'chrome' | 'firefox' | 'disable') { if (draft.value) resolveEchConflict(draft.value, action); }
async function save() {
  if (!draft.value || !changed.value || busy.value) return;
  if (conflict.value) { error.value = '请先解决 ECH 与浏览器指纹的冲突'; return; }
  busy.value = true; error.value = ''; message.value = '';
  try {
    if (has('完整节点路径')) normalizePath();
    const update: Configuration = {};
    for (const key of nodeKeys) if (has(key)) update[key] = draft.value[key];
    // ECH belongs to its own page; only persist explicit protocol/fingerprint interactions here.
    if (draft.value.ECH !== original.value?.ECH) update.ECH = draft.value.ECH;
    const prepared = prepareSettings(update, navigator.userAgent);
    prepared.优选订阅生成 = { SUBNAME: group(draft.value, '优选订阅生成').SUBNAME };
    await store.save(prepared); reset(store.data!); message.value = '节点配置已保存';
  } catch (cause) { error.value = cause instanceof Error ? cause.message : '保存失败'; } finally { busy.value = false; }
}
</script>
<template>
  <section class="management-page">
    <h1 class="page-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/></svg><span>节点配置</span></h1>

    <form v-if="draft" class="card node-form" @submit.prevent="save">
      <fieldset :disabled="busy" class="node-fields">
        <div class="field"><label for="subscription-name">订阅名称</label><input id="subscription-name" v-model="group(draft, '优选订阅生成').SUBNAME" /></div>
        <div class="field"><label for="node-host">节点域名</label><input id="node-host" :value="hosts ? hosts.join('、') : String(draft.HOST || '')" readonly :class="{ clickable: hosts }" :title="hosts ? '点击编辑多个节点域名' : '节点域名'" @click="hosts && open('hosts')" @keydown.enter.prevent="hosts && open('hosts')" /></div>
        <div class="field"><label for="node-uuid" class="label-help">UUID <button type="button" class="help-button secondary question-help-button" aria-label="查看 UUID 说明" @click="open('uuid')">?</button></label><input id="node-uuid" :value="String(draft.UUID || '')" readonly title="UUID 通过环境变量设置" /></div>
        <p v-if="hostsMismatch(draft, hostname)" class="hint" role="status">当前访问域名 {{ hostname }} 不在 HOSTS 列表中，请确认配置的节点域名可访问。</p>
        <div v-if="has('PATH')" class="field"><label for="node-path">PATH</label><input id="node-path" v-model="draft.PATH" :readonly="!has('完整节点路径')" :title="has('完整节点路径') ? '节点的伪装路径' : '通过 PATH 环境变量修改'" @change="normalizePath" /></div>
        <div class="node-grid">
          <div class="field"><label for="node-protocol">节点协议</label><select v-glass-select id="node-protocol" v-model="draft.协议类型"><option value="vless">VLESS</option><option value="trojan">Trojan</option><option v-if="has('SS')" value="ss">Shadowsocks</option></select></div>
          <template v-if="ss && has('SS')">
            <div class="field"><label for="ss-method">加密方式</label><select v-glass-select id="ss-method" v-model="group(draft, 'SS').加密方式"><option value="aes-128-gcm">aes-128-gcm（CPU 消耗少）</option><option value="aes-256-gcm">aes-256-gcm</option></select></div>
            <div class="field"><label for="ss-tls">TLS</label><select v-glass-select id="ss-tls" :value="String(group(draft, 'SS').TLS)" @change="setTLS"><option value="true">启用</option><option value="false">关闭</option></select></div>
          </template>
          <div v-if="has('gRPC模式')" class="field"><label for="node-transport">传输协议</label><select v-glass-select id="node-transport" v-model="draft.传输协议" :disabled="ss"><option value="ws">WebSocket</option><option value="xhttp">XHTTP</option><option value="grpc">gRPC</option></select></div>
          <div v-if="grpc && has('gRPC模式')" class="field"><label for="grpc-mode">gRPC 模式</label><select v-glass-select id="grpc-mode" v-model="draft.gRPC模式"><option value="gun">gun 普通模式</option><option value="multi">multi 并发模式</option></select></div>
          <div v-if="has('Fingerprint')" class="field"><label for="node-fingerprint">指纹伪装</label><select v-glass-select id="node-fingerprint" v-model="draft.Fingerprint"><option v-for="value in fingerprints" :key="value" :value="value">{{ value }}{{ ['chrome', 'firefox'].includes(value) ? '（支持 ECH）' : '' }}</option></select></div>
          <div v-if="has('ALPN')" class="field"><label for="node-alpn">ALPN</label><select v-glass-select id="node-alpn" :value="draft.ALPN || ''" @change="setALPN"><option v-for="value in alpns" :key="value" :value="value">{{ value || '客户端自动协商' }}</option></select></div>
        </div>
        <div v-if="grpc && has('gRPCUserAgent')" class="field"><label for="grpc-ua">gRPC UA</label><div class="ua-field"><input id="grpc-ua" v-model="draft.gRPCUserAgent" /><button type="button" class="secondary" @click="fillUserAgent">获取当前 UA</button></div></div>
        <div class="node-options">
          <label v-if="has('跳过证书验证')"><input v-model="draft.跳过证书验证" type="checkbox" />跳过证书验证</label>
          <label v-if="has('随机路径')"><input v-model="draft.随机路径" type="checkbox" />随机伪装路径</label>
          <label v-if="has('启用0RTT')"><input v-model="draft.启用0RTT" type="checkbox" :disabled="ss || grpc" />启用 0-RTT (ed=2560)</label>
          <template v-if="has('TLS分片')"><label><input type="checkbox" :checked="draft.TLS分片 === 'Shadowrocket'" :disabled="noTLS" @change="fragment('Shadowrocket', $event)" />启用分片 (Shadowrocket)</label><label><input type="checkbox" :checked="draft.TLS分片 === 'Happ'" :disabled="noTLS" @change="fragment('Happ', $event)" />启用分片 (Happ)</label></template>
        </div>
        <div v-if="conflict" role="alert"><p>当前指纹 {{ draft.Fingerprint }} 不支持 ECH，请选择处理方式。</p><div class="actions"><button type="button" @click="resolve('chrome')">使用 Chrome 并启用 ECH</button><button type="button" @click="resolve('firefox')">使用 Firefox 并启用 ECH</button><button type="button" class="secondary" @click="resolve('disable')">关闭 ECH</button></div></div>
      </fieldset>
      <div class="actions"><button :disabled="busy || !changed">{{ busy ? '保存中…' : '保存设置' }}</button><button type="button" class="secondary" :disabled="busy || !changed" @click="cancel">取消修改</button></div>

    </form>
    <Teleport to="body"><dialog ref="dialog" v-glass-dialog class="node-dialog glass-dialog">
      <div class="dialog-heading"><h2>{{ dialogKind === 'hosts' ? '节点域名' : dialogKind === 'uuid' ? 'UUID 说明' : dialogKind === 'alpn' ? '确认 ALPN 配置' : '关闭 Shadowsocks TLS' }}</h2><button type="button" class="secondary" aria-label="关闭弹窗" @click="close">×</button></div>
      <template v-if="dialogKind === 'hosts'"><label for="node-hosts">每行一个域名，也支持逗号分隔</label><textarea id="node-hosts" v-model="hostText" rows="6" /><div class="actions"><button type="button" @click="confirmHosts">确定</button><button type="button" class="secondary" @click="close">取消</button></div></template>
      <template v-else-if="dialogKind === 'uuid'">
        <div class="uuid-flow" aria-label="GO_ON 和 KEY 生成 UUID，再生成订阅 TOKEN"><span>GO_ON + KEY</span><span aria-hidden="true">→</span><strong>UUID</strong><span aria-hidden="true">→</span><span class="uuid-flow-muted">订阅 TOKEN</span></div>
        <section class="card uuid-help-card"><span class="uuid-method">方式 1：动态关联</span><h3>♻️ 修改项目变量</h3><p>修改变量 <b>GO_ON</b> 或 <b>KEY</b> 的值，系统将会根据算法动态生成新的 UUID。</p></section>
        <section class="card uuid-help-card"><span class="uuid-method">方式 2：手动固定</span><h3>📌 直接赋值 UUID</h3><p>设定符合 <b>UUIDv4 标准</b>的变量 <b>UUID</b>，可将 UUID 强制锁定为您指定的值。</p></section>
        <p class="uuid-help-tip"><strong>⚠️ 重要提示：</strong>一旦手动指定 <b>UUID</b> 变量，其值将不再随 GO_ON/KEY 的改动而发生变化。</p>
        <div class="actions"><button type="button" class="secondary" @click="close">知道了</button></div>
      </template>
      <template v-else><p>{{ dialogKind === 'alpn' ? `将使用 ${pendingALPN}。手动指定 ALPN 可能与客户端或网络不兼容，导致连接失败。默认使用客户端自动协商。` : '关闭后将不使用传输层 TLS，同时关闭 ECH 和 TLS 分片。请确认客户端和网络支持此配置。' }}</p><div class="actions"><button type="button" @click="confirmDialog">确认修改</button><button type="button" class="secondary" @click="close">取消</button></div></template>
    </dialog></Teleport>
  </section>
</template>
<style scoped>
.node-fields{border:0;padding:0;margin:0;min-width:0}.node-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 1.25rem}.node-options{display:flex;flex-wrap:wrap;gap:1rem 1.5rem;margin:1.5rem 0}.node-options label{display:flex;align-items:center;gap:.55rem;font-size:.9rem}.clickable{cursor:pointer}.label-help{display:flex;align-items:center;gap:.5rem}.ua-field{display:flex;gap:.65rem}.ua-field input{flex:1;min-width:0}.ua-field button{white-space:nowrap}.node-dialog { width: min(520px, calc(100vw - 32px)); }.dialog-heading{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1rem}.dialog-heading h2{margin:0;font-size:1.2rem}.node-dialog p{line-height:1.7}.node-dialog textarea{box-sizing:border-box;width:100%;margin-top:.75rem}@media(max-width:600px){.node-grid{grid-template-columns:1fr}.ua-field{flex-direction:column}.node-options{gap:1rem}}

.uuid-flow{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:10px;margin:24px 0;font-size:12px}.uuid-flow span:not([aria-hidden]),.uuid-flow strong{padding:9px 12px;border:1px solid var(--dialog-edge);border-radius:12px;background:var(--dialog-field)}.uuid-flow strong{color:#3986e8}.uuid-flow-muted{color:var(--dialog-muted)}.uuid-help-card{margin:14px 0}.uuid-method{font-size:11px;color:var(--dialog-muted)}.uuid-help-card h3{margin:8px 0}.uuid-help-card p{margin:0}.uuid-help-tip{padding:14px 16px;border-radius:16px;background:#eaa32d12;border:1px solid #eaa32d30}
</style>

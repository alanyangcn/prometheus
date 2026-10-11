<script setup lang="ts">
import { useToastMessage } from '../composables/useToast';
import { computed, ref, onBeforeUnmount } from 'vue';
import { vGlassDialog } from '../features/appearance/glassDialog';
import { api } from '../api/client';
import { chainLine, parseChainInput } from '../features/tools/chain';
const dialog = ref<HTMLDialogElement | null>(null);
function open() { dialog.value?.showModal(); }
function close() { dialog.value?.close(); }
defineExpose({ open });
onBeforeUnmount(close);
const text = defineModel<string>({required:true});
const host = ref(location.hostname), port = ref('443'), name = ref('链式代理'), type = ref('socks5'), address = ref('');
const checked = ref(''), result = ref<Record<string, unknown> | null>(null), error = useToastMessage('error'), message = useToastMessage('success'), busy = ref(false);
const chainKey = computed(() => `${type.value}://${address.value.trim()}`);
async function run(action: () => Promise<void>) { busy.value = true; error.value = ''; message.value = ''; try { await action(); } catch (e) { error.value = e instanceof Error ? e.message : '请求失败'; } finally { busy.value = false; } }
function normalizeChainInput() { const value = parseChainInput(address.value, type.value); type.value = value.scheme; address.value = value.address; if (value.name) name.value = value.name; }
async function checkProxy() { normalizeChainInput(); const key = chainKey.value; checked.value = ''; result.value = null; await run(async () => { const value = await api<Record<string, unknown>>('/api/proxy-check', { type: type.value, address: address.value.trim().replace(new RegExp(`^${type.value}(?:://|=)`, 'i'), '') }); result.value = value; if (value.success === true && key === chainKey.value) { checked.value = key; message.value = '代理检测成功'; } else throw new Error(String(value.error || '检测失败，请重新验证')); }); }
async function append() { await run(async () => { if (checked.value !== chainKey.value) throw new Error('请先验证当前代理'); const line = chainLine(host.value, port.value, name.value, type.value, address.value); text.value = text.value.trim() ? `${text.value.trim()}\n${line}` : line; message.value = '已追加链式代理节点，请保存优选订阅'; close(); }); }
</script>
<template>
  <Teleport to="body"><dialog ref="dialog" v-glass-dialog class="glass-dialog chain-dialog" aria-labelledby="chain-title">
    <h2 id="chain-title">添加链式代理节点</h2>
    <div class="field"><label for="chain-name">节点名称</label><input id="chain-name" v-model="name" :disabled="busy" placeholder="链式代理" /></div>
    <div class="field"><label for="chain-host">优选域名/IP</label><div class="host-row"><input id="chain-host" v-model="host" :disabled="busy" /><span aria-hidden="true">:</span><input id="chain-port" v-model="port" :disabled="busy" inputmode="numeric" aria-label="端口（可留空）" placeholder="可选" /></div></div>
    <div class="field"><label for="chain-address">链式代理</label><div class="proxy-row"><select v-glass-select id="chain-type" v-model="type" :disabled="busy" aria-label="代理协议"><option v-for="p in ['socks5','http','https','turn','sstp']" :key="p">{{ p }}</option></select><span aria-hidden="true">://</span><input id="chain-address" v-model="address" :disabled="busy" type="password" autocomplete="off" placeholder="user:password@host:port" autofocus /></div></div>
    <dl v-if="result" class="chain-result"><template v-for="key in ['ip','loc','responseTime']" :key="key"><dt>{{ key }}</dt><dd>{{ result[key] ?? '—' }}</dd></template></dl>
    <div class="actions"><button type="button" :disabled="busy || !address.trim()" @click="checkProxy">{{ busy ? '正在处理…' : '可用性验证' }}</button><button type="button" :disabled="busy || !checked || checked !== chainKey" @click="append">添加</button><button type="button" class="secondary" @click="close">取消</button></div>
  </dialog></Teleport>
</template>
<style scoped>
.chain-dialog { width: min(580px, calc(100vw - 32px)); }
.chain-dialog h2 { margin-bottom: 24px; }
.chain-dialog .field { margin-bottom: 16px; }
.host-row { display: grid; grid-template-columns: minmax(0, 1fr) auto 90px; align-items: center; gap: 8px; }
.proxy-row { display: grid; grid-template-columns: 110px auto minmax(0, 1fr); align-items: center; gap: 8px; }
.chain-dialog input, .chain-dialog select { min-width: 0; margin-bottom: 0; }
.chain-dialog .actions { align-items: center; }
.chain-dialog .actions button { flex: 1; white-space: nowrap; }
.chain-result { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 6px 16px; font-size: 12px; }
.chain-result dd { margin: 0; overflow-wrap: anywhere; }
@media (max-width: 480px) { .proxy-row { grid-template-columns: 90px auto minmax(0, 1fr); gap: 6px; } .host-row { grid-template-columns: minmax(0, 1fr) auto 70px; } .chain-dialog .actions button { padding: 10px 12px; } }
</style>

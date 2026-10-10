<script setup lang="ts">
import { computed, ref, nextTick, onBeforeUnmount } from 'vue';
import type { Configuration } from '../../shared/config';
import { group, subscriptionMode, setSubscriptionMode, type SubscriptionMode } from '../features/configuration/settings';
import SubscriptionOptimizer from './SubscriptionOptimizer.vue';
import SubscriptionApiImport from './SubscriptionApiImport.vue';
import SubscriptionChainProxy from './SubscriptionChainProxy.vue';
const addresses = defineModel<string>('addresses', { required: true });
const helper = ref('');
const optimizerDialog = ref<HTMLDialogElement | null>(null);
const optimizing = ref(false);
async function openOptimizer() { optimizing.value = true; await nextTick(); optimizerDialog.value?.showModal(); }
function closeOptimizer() { optimizerDialog.value?.close(); optimizing.value = false; }
onBeforeUnmount(closeOptimizer);
function exportAddresses() { const url = URL.createObjectURL(new Blob([addresses.value],{type:'text/plain;charset=utf-8'})); const link = document.createElement('a'); link.href = url; link.download = 'prometheus-addresses.txt'; link.click(); URL.revokeObjectURL(url); }

const fileError = ref('');
async function upload(event: Event) {
  const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return;
  fileError.value = '';
  try { addresses.value = await file.text(); } catch { fileError.value = '读取文本失败'; } finally { input.value = ''; }
}
const props = defineProps<{ model: Configuration }>();
const sub = computed(() => group(props.model, '优选订阅生成'));
const library = computed(() => group(sub.value, '本地IP库'));
const mode = computed({ get: () => subscriptionMode(props.model), set: (mode: SubscriptionMode) => setSubscriptionMode(props.model, mode) });

</script>
<template>
  <div class="field"><label for="subscription-mode">优选订阅模式</label><select id="subscription-mode" v-model="mode"><option value="generator">优选订阅生成器（使用已有优选结果）</option><option value="random">随机优选（根据订阅时的网络下发官方优选）</option><option value="custom">自定义订阅（支持汇聚订阅）</option></select></div>
  <template v-if="mode === 'random'">
    <div class="field"><label for="random-count">随机优选数量</label><input id="random-count" v-model.number="library.随机数量" type="number" min="1" max="99" required /></div>
    <div v-if="library.指定端口 !== undefined" class="field"><label for="preferred-port">指定优选端口</label><select id="preferred-port" v-model.number="library.指定端口"><option :value="-1">随机端口</option><option v-for="port in [443,2053,2083,2087,2096,8443]" :key="port" :value="port">{{ port }}</option></select></div>
  </template>
  <template v-if="mode === 'custom'">
    <div class="field"><label for="custom-preferred-addresses">自定义优选</label><textarea id="custom-preferred-addresses" v-model="addresses" rows="10" spellcheck="false" placeholder="www.visa.cn#优选域名
104.24.0.232:8443#优选IPv4
[2606:4700::]:2053#优选IPv6" required /></div>
    <div class="field"><label for="preferred-upload">导入本地文本</label><input id="preferred-upload" type="file" accept=".txt,.csv,text/plain" @change="upload" /><p v-if="fileError" class="error" role="alert">{{ fileError }}</p></div>
    <div class="actions"><button type="button" class="secondary" @click="openOptimizer">开始优选</button><button type="button" class="secondary" @click="exportAddresses">导出地址文本</button><button type="button" class="secondary" :aria-expanded="helper === 'api'" @click="helper = helper === 'api' ? '' : 'api'">订阅接口</button><button type="button" class="secondary" :aria-expanded="helper === 'chain'" @click="helper = helper === 'chain' ? '' : 'chain'">链式代理</button></div>
    <SubscriptionApiImport v-if="helper === 'api'" v-model="addresses" />
    <SubscriptionChainProxy v-if="helper === 'chain'" v-model="addresses" />
  </template>
  <div v-if="mode === 'generator'" class="field"><label for="generator-url">优选订阅生成器</label><input id="generator-url" v-model="sub.SUB" placeholder="sub.cmliussss.net" required /><p class="hint">可填写域名或完整 URL，保存时提取域名。</p></div>
  <Teleport to="body"><dialog v-if="optimizing" ref="optimizerDialog" class="optimizer-dialog" aria-labelledby="optimizer-title" @close="optimizing = false"><div class="optimizer-heading"><h2 id="optimizer-title">在线优选 IP</h2><button type="button" class="secondary" @click="closeOptimizer">返回优选订阅</button></div><SubscriptionOptimizer v-model="addresses" /></dialog></Teleport>
</template>
<style scoped>
.actions { margin-bottom: 18px; }
:deep(.subscription-helper) { margin-top: 20px; }
.optimizer-dialog { width: min(1100px, calc(100vw - 24px)); max-height: 90dvh; padding: 24px; border: 1px solid #ffffffb3; border-radius: 24px; background: #f0f5fbf5; color: #425773; }
.optimizer-dialog::backdrop { background: #18263f50; backdrop-filter: blur(5px); }
.optimizer-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }.optimizer-heading h2 { font-size: 18px; }
:global(:root[data-theme=dark] .optimizer-dialog) { background: #1c2b3cf5; color: #b1c1d8; border-color: #ffffff20; }
</style>

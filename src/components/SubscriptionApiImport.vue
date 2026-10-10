<script setup lang="ts">
import { useToastMessage } from '../composables/useToast';
import { computed, ref } from 'vue';
import { api } from '../api/client';
import { prepareApiSource, appendAddressLines } from '../features/configuration/imports';
const text = defineModel<string>({required:true});
const importPort = ref('443'), useProxyIP = ref(false), verifiedURL = ref(''), verifiedResults = ref<string[]>([]);
const source = ref(''), error = useToastMessage('error'), message = useToastMessage('success'), busy = ref(false);
const sourceKey = computed(() => { try { return prepareApiSource(source.value, importPort.value, useProxyIP.value).url; } catch { return ''; } });
const canAppend = computed(() => Boolean(verifiedURL.value && verifiedURL.value === sourceKey.value));
function normalizeSource() {
  if (!source.value.trim()) return;
  try { const normalized = prepareApiSource(source.value, importPort.value, useProxyIP.value); source.value = normalized.source; importPort.value = normalized.port; }
  catch (e) { error.value = e instanceof Error ? e.message : 'API 地址无效'; }
}
async function check() {
  busy.value = true; error.value = ''; message.value = ''; verifiedURL.value = ''; verifiedResults.value = [];
  try {
    const prepared = prepareApiSource(source.value, importPort.value, useProxyIP.value); source.value = prepared.source; importPort.value = prepared.port;
    const result = await api<{ success?: boolean; data: string[] }>(`/admin/getADDAPI?url=${encodeURIComponent(prepared.url)}`);
    if (result.success === false || !Array.isArray(result.data) || !result.data.length || !result.data.every(line => typeof line === 'string')) throw new Error('此来源未返回可用地址');
    if (sourceKey.value !== prepared.url) throw new Error('来源配置已变更，请重新验证');
    verifiedURL.value = prepared.url; verifiedResults.value = result.data;
    message.value = '验证成功。选择追加 API URL（每次订阅更新）或当前返回地址，然后保存地址库。';
  } catch (e) { error.value = e instanceof Error ? e.message : '验证失败'; }
  finally { busy.value = false; }
}
function append(kind: 'url' | 'results') {
  if (!canAppend.value) { error.value = '请先验证当前 API 配置'; return; }
  text.value = appendAddressLines(text.value, kind === 'url' ? [verifiedURL.value] : verifiedResults.value);
  message.value = kind === 'url' ? 'API URL 已追加，请保存地址库' : '返回地址已追加，请保存地址库';
}
</script>
<template><section class="subscription-helper"><h2>优选 API 导入</h2><label for="source">API 地址 / GitHub 文件链接</label><input id="source" v-model="source" type="url" :disabled="busy" placeholder="https://…" @change="normalizeSource" /><label for="import-port">默认端口</label><input id="import-port" v-model="importPort" type="number" min="1" max="65535" :disabled="busy" /><label for="api-proxyip">将优选结果作为 PROXYIP</label><input id="api-proxyip" v-model="useProxyIP" type="checkbox" :disabled="busy" /><p class="hint">GitHub blob/tree 链接会转换为 raw 地址。URL 中的 port 参数会自动提取到默认端口；勾选 PROXYIP 会添加 proxyip=true。</p><div class="actions"><button type="button" :disabled="busy || !source" @click="check">可用性验证</button><button type="button" class="secondary" :disabled="busy || !canAppend" @click="append('url')">追加 API URL</button><button type="button" class="secondary" :disabled="busy || !canAppend" @click="append('results')">追加返回地址</button></div><textarea v-if="canAppend" :value="verifiedResults.join('\n')" rows="6" readonly aria-label="API 验证结果" /><p v-else-if="verifiedURL" class="hint">来源配置已变更，请重新验证后追加。</p></section></template>

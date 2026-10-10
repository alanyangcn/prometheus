<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useConfigStore } from '../stores/config';
import { setSubscriptionMode } from '../features/configuration/settings';
import { prepareApiSource, appendAddressLines } from '../features/configuration/imports';
import { snapshot } from '../stores/snapshot';
import { api } from '../api/client';
const store = useConfigStore(); const activate = ref(true);
const importPort = ref('443'); const useProxyIP = ref(false); const verifiedURL = ref(''); const verifiedResults = ref<string[]>([]);
const sourceKey = computed(() => { try { return prepareApiSource(source.value, importPort.value, useProxyIP.value).url; } catch { return ''; } });
const canAppend = computed(() => Boolean(verifiedURL.value && verifiedURL.value === sourceKey.value));
const text = ref(''); const source = ref(''); const error = ref(''); const message = ref(''); const busy = ref(false);
onMounted(async () => { try { text.value = (await api<{ text: string }>('/api/addresses')).text; } catch (e) { error.value = e instanceof Error ? e.message : '加载失败'; } });
async function save() {
  busy.value = true; error.value = ''; message.value = '';
  try { if (activate.value && !text.value.trim()) throw new Error('启用自定义模式前请添加地址');
    await api('/api/addresses', { text: text.value }); if (activate.value) { const draft = snapshot(await store.load()); setSubscriptionMode(draft, 'custom'); await store.save(draft); }
    message.value = activate.value ? '地址库已保存并启用自定义模式' : '地址库已保存'; }
  catch (e) { error.value = e instanceof Error ? e.message : '保存失败'; }
  finally { busy.value = false; }
}
async function upload(event: Event) {
  const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return;
  try { text.value = await file.text(); message.value = '文本已载入，请保存地址库'; } catch { error.value = '读取文件失败'; } finally { input.value = ''; }
}
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
function download() {
  const url = URL.createObjectURL(new Blob([text.value], { type: 'text/plain;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'prometheus-addresses.txt'; anchor.click(); URL.revokeObjectURL(url);
}
</script>
<template>
  <h1>地址库</h1><p class="intro">每行一个地址，可附加端口与备注，例如 example.com:443#节点名称。也可填写订阅源或其他节点链接。</p>
  <section class="card"><label for="addresses">自定义地址</label><textarea id="addresses" v-model="text" rows="14" spellcheck="false" />
    <div class="field"><label for="address-upload">上传本地文本</label><input id="address-upload" type="file" accept=".txt,.csv,text/plain" @change="upload" /></div><div class="field"><label for="activate-custom">保存后启用自定义地址模式</label><input id="activate-custom" v-model="activate" type="checkbox" /></div>
    <div class="actions"><button :disabled="busy" @click="save">保存地址库</button><button class="secondary" @click="download">导出文本</button></div>
  </section>
  <section class="card"><h2>优选 API 导入</h2><label for="source">API 地址 / GitHub 文件链接</label><input id="source" v-model="source" type="url" :disabled="busy" placeholder="https://…" @change="normalizeSource" /><label for="import-port">默认端口</label><input id="import-port" v-model="importPort" type="number" min="1" max="65535" :disabled="busy" /><label for="api-proxyip">将优选结果作为 PROXYIP</label><input id="api-proxyip" v-model="useProxyIP" type="checkbox" :disabled="busy" /><p class="hint">GitHub blob/tree 链接会转换为 raw 地址。URL 中的 port 参数会自动提取到默认端口；勾选 PROXYIP 会添加 proxyip=true。</p><div class="actions"><button :disabled="busy || !source" @click="check">可用性验证</button><button class="secondary" :disabled="busy || !canAppend" @click="append('url')">追加 API URL</button><button class="secondary" :disabled="busy || !canAppend" @click="append('results')">追加返回地址</button></div><textarea v-if="canAppend" :value="verifiedResults.join('\n')" rows="6" readonly aria-label="API 验证结果" /><p v-else-if="verifiedURL" class="hint">来源配置已变更，请重新验证后追加。</p></section>
  <p v-if="error" role="alert" class="error">{{ error }}</p><p v-if="message" role="status" class="success">{{ message }}</p>
</template>

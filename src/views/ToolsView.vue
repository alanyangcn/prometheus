<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { converterKey as makeConverterKey, saveVerifiedConverter, type VerifiedConverter } from '../features/tools/converter';
import type { Configuration } from '../../shared/config';
import IPDetails from '../features/tools/IPDetails.vue';
import { api } from '../api/client';
import { chainLine, parseChainInput } from '../features/tools/chain';
const host = ref(location.hostname), port = ref('443'), name = ref('链式代理'), type = ref('socks5'), address = ref('');
const checked = ref(''), result = ref<Record<string, unknown> | null>(null), error = ref(''), message = ref(''), busy = ref(false);
const enableCustom = ref(true), network = ref<Record<string, unknown> | null>(null);
const converter = ref(''), converterConfig = ref(''), version = ref(''), verifiedConverter = ref('');
const converterList = ref<{label: string; value: string}[]>([]), ip = ref(''), ipInfo = ref<Record<string,unknown> | null>(null);
const verified = ref<VerifiedConverter | null>(null);
const converterKey = computed(() => makeConverterKey(converter.value,converterConfig.value));
const chainKey = computed(() => `${type.value}://${address.value.trim()}`);
async function run(action: () => Promise<void>) { busy.value = true; error.value = ''; message.value = ''; try { await action(); } catch (e) { error.value = e instanceof Error ? e.message : '请求失败'; } finally { busy.value = false; } }
function normalizeChainInput() { const value = parseChainInput(address.value, type.value); type.value = value.scheme; address.value = value.address; if (value.name) name.value = value.name; }
async function checkProxy() { normalizeChainInput(); const key = chainKey.value; checked.value = ''; result.value = null; await run(async () => { const value = await api<Record<string, unknown>>('/api/proxy-check', { type: type.value, address: address.value.trim().replace(new RegExp(`^${type.value}(?:://|=)`, 'i'), '') }); result.value = value; if (value.success === true && key === chainKey.value) checked.value = key; else throw new Error(String(value.error || '检测失败，请重新验证')); }); }
async function loadNetwork() { await run(async () => { network.value = await api('/api/tools/network-info', {}); }); }
async function append() { await run(async () => { if (checked.value !== chainKey.value) throw new Error('请先验证当前代理'); const line = chainLine(host.value, port.value, name.value, type.value, address.value); const current = await api<{text: string}>('/api/addresses'); await api('/api/addresses', { text: current.text.trim() ? `${current.text.trim()}\n${line}` : line }); if (enableCustom.value) { try { await api('/api/config', { 优选订阅生成: { local: true, 本地IP库: { 随机IP: false } } }); } catch { throw new Error('地址已保存，但启用自定义地址模式失败；请到订阅设置中启用'); } } message.value = enableCustom.value ? '已追加地址库并启用自定义地址订阅模式' : '已追加到优选地址库'; }); }
async function checkConverter() { verifiedConverter.value = ''; verified.value = null; await run(async () => { const snapshot = { key: converterKey.value, baseURL: converter.value, config: converterConfig.value }; const value = await api<{version: string; baseURL: string}>('/api/tools/converter-check', { baseURL: snapshot.baseURL, config: snapshot.config }); version.value = value.version; if (snapshot.key === converterKey.value) { verifiedConverter.value = snapshot.key; verified.value = {...snapshot,baseURL:value.baseURL}; } }); }
async function saveConverter() { await run(async () => { if (!verified.value) throw new Error('请先验证转换服务'); await saveVerifiedConverter(verified.value,() => converterKey.value,() => api<Configuration>('/api/config'),patch => api('/api/config',patch)); message.value = '订阅转换设置已保存（使用验证返回的后端地址）'; }); }
onMounted(() => run(async () => { const config = await api<any>('/api/config'); converter.value = config.订阅转换配置?.SUBAPI || ''; converterConfig.value = config.订阅转换配置?.SUBCONFIG || ''; }));
</script>
<template>
  <section class="management-page">
<h1 class="page-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 6a5 5 0 0 0-6 6l-5 5a3 3 0 0 0 4 4l5-5a5 5 0 0 0 6-6l-3 3-4-4 3-3Z"/></svg><span>实用工具</span></h1>
<section class="card"><h2>当前网络信息</h2><button :disabled="busy" @click="loadNetwork">读取当前网络信息</button><dl v-if="network"><template v-for="(value, key) in network" :key="key"><dt>{{ key }}</dt><dd>{{ value ?? '—' }}</dd></template></dl><button v-if="network?.connectingIP" :disabled="busy" @click="run(async () => { ip = String(network?.connectingIP); ipInfo = await api('/api/tools/ip-info', { ip }); })">查询当前 IP 详情</button></section>
<section class="card"><h2>链式代理节点</h2><label for="chain-host">优选域名/IP</label><input id="chain-host" v-model="host" /><label for="chain-port">端口（可留空）</label><input id="chain-port" v-model="port" /><label for="chain-name">节点名称</label><input id="chain-name" v-model="name" /><label for="chain-type">代理协议</label><select id="chain-type" v-model="type"><option v-for="p in ['socks5','http','https','turn','sstp']" :key="p">{{ p }}</option></select><label for="chain-address">代理地址</label><input id="chain-address" v-model="address" type="password" autocomplete="off" placeholder="user:password@host:port" /><label for="chain-custom"><input id="chain-custom" v-model="enableCustom" type="checkbox" />追加后启用自定义地址订阅模式</label><div class="actions"><button :disabled="busy" @click="checkProxy">检测代理</button><button :disabled="busy || checked !== chainKey" @click="append">追加地址库</button></div><dl v-if="result"><template v-for="key in ['success','ip','loc','responseTime','error']" :key="key"><dt>{{ key }}</dt><dd>{{ result[key] ?? '—' }}</dd></template></dl></section>
<section class="card"><h2>订阅转换配置服务</h2><p class="hint">可读取参考项目维护的第三方服务列表，也可直接填写 HTTP(S) 后端。检测保存流程会去掉 /sub、/version 尾缀与查询参数，保存验证返回的后端地址。</p><button :disabled="busy" @click="run(async () => { converterList = await api('/api/tools/converter-list', {}); })">读取服务列表</button><select v-if="converterList.length" v-model="converter" aria-label="参考转换服务列表"><option v-for="item in converterList" :key="item.value" :value="item.value">{{ item.label }} — {{ item.value }}</option></select><label for="converter-base">后端地址</label><input id="converter-base" v-model="converter" /><label for="converter-config">转换配置 URL</label><input id="converter-config" v-model="converterConfig" /><div class="actions"><button :disabled="busy" @click="checkConverter">验证版本和配置</button><button :disabled="busy || verifiedConverter !== converterKey || !verifiedConverter" @click="saveConverter">保存转换设置</button></div><p>{{ version }}</p></section>
<section class="card"><h2>IP 信息</h2><input v-model="ip" aria-label="IP 地址" /><button :disabled="busy" @click="run(async () => { ipInfo = await api('/api/tools/ip-info', { ip }); })">查询 IP</button><IPDetails v-if="ipInfo" :value="ipInfo" /></section>

<p v-if="error" class="error" role="alert">{{ error }}</p><p v-if="message" class="success" role="status">{{ message }}</p>

  </section>
</template>

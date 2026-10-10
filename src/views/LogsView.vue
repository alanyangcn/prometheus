<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api } from '../api/client';
type Entry = Record<string, unknown>;
const logs = ref<Entry[]>([]), error = ref(''), busy = ref(false), query = ref(''), type = ref(''), from = ref(''), to = ref('');
const types = computed(() => [...new Set(logs.value.map(x => String(x.TYPE || 'Unknown')))]);
const filtered = computed(() => [...logs.value].reverse().filter(entry => (!type.value || entry.TYPE === type.value) && (!query.value || JSON.stringify(entry).toLowerCase().includes(query.value.toLowerCase())) && (!from.value || Number(entry.TIME) >= new Date(from.value).getTime()) && (!to.value || Number(entry.TIME) <= new Date(to.value).getTime())));
async function load() { busy.value = true; error.value = ''; try { const value = await api<unknown>('/api/logs'); logs.value = Array.isArray(value) ? value.filter(x => x && typeof x === 'object') : []; } catch (e) { error.value = e instanceof Error ? e.message : '加载失败'; } finally { busy.value = false; } }
function exportLogs() { const url = URL.createObjectURL(new Blob([JSON.stringify(filtered.value, null, 2)], {type:'application/json'})); const a = document.createElement('a'); a.href = url; a.download = 'prometheus-logs.json'; a.click(); URL.revokeObjectURL(url); }
function time(value: unknown) { const date = new Date(Number(value)); return Number.isFinite(date.getTime()) ? date.toLocaleString() : '未知时间'; }
onMounted(load);
</script>
<template><h1>操作日志</h1><section class="card"><div class="actions"><button :disabled="busy" @click="load">刷新日志</button><button class="secondary" @click="exportLogs">导出筛选结果</button></div><label>搜索 IP、位置、URL、UA</label><input v-model="query" /><label>类型</label><select v-model="type"><option value="">全部类型</option><option v-for="item in types" :key="item">{{ item }}</option></select><label>起始时间</label><input v-model="from" type="datetime-local" /><label>结束时间</label><input v-model="to" type="datetime-local" /><p>{{ filtered.length }} / {{ logs.length }} 条</p><p v-if="error" role="alert" class="error">{{ error }}</p><p v-else-if="!filtered.length" class="hint">暂无符合条件的日志。</p><article v-for="(entry, index) in filtered" :key="index" class="card"><h2>{{ entry.TYPE }} · {{ time(entry.TIME) }}</h2><dl><template v-for="key in ['IP','ASN','CC','URL','UA']" :key="key"><dt>{{ key }}</dt><dd style="overflow-wrap:anywhere">{{ entry[key] || '—' }}</dd></template></dl></article></section></template>

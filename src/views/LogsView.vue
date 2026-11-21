<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api } from '../api/client';
import PageState from '../components/PageState.vue';
type Entry = Record<string, unknown>;
const logs = ref<Entry[]>([]), error = ref(''), busy = ref(false);
const search = ref(''), type = ref(''), date = ref('');
const operations: Record<string, string> = { Get_SUB:'获取订阅', Get_Best_SUB:'获取优选订阅', Save_Config:'保存配置', Save_Custom_IPs:'保存地址库', Init_Config:'重置配置', Admin_Login:'访问管理页面' };
const entries = computed(() => {
  const day = date.value ? Date.parse(`${date.value}T00:00:00+08:00`) : null;
  return logs.value.filter(entry => (!type.value || entry.TYPE === type.value) && (!search.value.trim() || [entry.IP,entry.CC,operation(entry.TYPE)].join(' ').toLowerCase().includes(search.value.trim().toLowerCase())) && (day === null || Number(entry.TIME) >= day && Number(entry.TIME) < day + 86400000)).sort((a,b) => Number(b.TIME || 0) - Number(a.TIME || 0));
});
async function load() { if (busy.value) return; busy.value = true; error.value = ''; try { const value = await api<unknown>('/api/logs'); logs.value = Array.isArray(value) ? value.filter(x => x && typeof x === 'object') : []; } catch (cause) { error.value = cause instanceof Error ? cause.message : '读取日志失败'; } finally { busy.value = false; } }
function clearFilters() { search.value = ''; type.value = ''; date.value = ''; }
function exportLogs() { const url = URL.createObjectURL(new Blob([JSON.stringify(entries.value,null,2)],{type:'application/json'})); const link = document.createElement('a'); link.href = url; link.download = 'prometheus-logs.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000); }
function time(value: unknown) { if (value === null || value === undefined || value === '') return '未知时间'; const date = new Date(Number(value)); return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(date) : '未知时间'; }
function operation(value: unknown) { const key = String(value || ''); return operations[key] || key || '未知操作'; }
onMounted(load);
</script>
<template>
  <section class="management-page">
    <div class="logs-heading"><div><h1 class="page-title">操作日志</h1><p class="page-description">查看配置修改和订阅访问记录，时间为 UTC+8。</p></div><div class="actions"><button type="button" class="secondary" :disabled="busy" @click="load">{{ busy ? '刷新中…' : '刷新' }}</button><button type="button" class="secondary" :disabled="!entries.length" @click="exportLogs">导出当前结果</button></div></div>
    <PageState :loading="busy && !logs.length" :error="error" @retry="load" />
    <section v-if="!error && (!busy || logs.length)" class="card" :aria-busy="busy" aria-label="日志记录">
      <div class="log-filters"><label for="log-search">搜索<input id="log-search" v-model="search" type="search" placeholder="IP、地区或操作" /></label><label for="log-type">操作类型<select v-glass-select id="log-type" v-model="type"><option value="">全部操作</option><option v-for="(label,key) in operations" :key="key" :value="key">{{ label }}</option></select></label><label for="log-date">日期（UTC+8）<input id="log-date" v-model="date" type="date" /></label></div>
      <div class="log-summary"><span>显示 {{ entries.length }} / {{ logs.length }} 条记录</span><button v-if="search || type || date" type="button" class="secondary" @click="clearFilters">清除筛选</button></div>
      <div v-if="entries.length" class="table-wrap"><table><caption class="visually-hidden">管理操作和订阅访问日志</caption><thead><tr><th scope="col">时间（UTC+8）</th><th scope="col">操作</th><th scope="col">IP</th><th scope="col">地区</th></tr></thead><tbody><tr v-for="(entry,index) in entries" :key="index"><td class="log-time">{{ time(entry.TIME) }}</td><td><span class="operation-badge">{{ operation(entry.TYPE) }}</span></td><td class="log-ip">{{ entry.IP || '未知' }}</td><td>{{ entry.CC || '未知' }}</td></tr></tbody></table></div>
      <div v-else class="logs-empty"><h2>{{ logs.length ? '没有匹配的记录' : '暂无操作记录' }}</h2><p>{{ logs.length ? '试试其他关键词，或清除筛选条件。' : '保存配置或获取订阅后，相关操作会显示在这里；关闭日志时不会产生记录。' }}</p></div>
    </section>
  </section>
</template>
<style scoped>
.logs-heading { display:flex; justify-content:space-between; gap:20px; align-items:flex-start; }.logs-heading > .actions { margin:0; flex-shrink:0; }.log-filters { display:grid; grid-template-columns:1.5fr 1fr 1fr; gap:16px; }.log-filters label { min-width:0; }.log-filters input,.log-filters select { margin-top:9px; }.log-summary { display:flex; align-items:center; justify-content:space-between; margin:4px 0 18px; color:var(--muted); font-size:12px; min-height:32px; }.log-summary button { padding:6px 10px; min-height:32px; font-size:11px; }.log-time { white-space:nowrap; font-variant-numeric:tabular-nums; }.log-ip { font-family:ui-monospace,monospace; }.operation-badge { display:inline-block; white-space:nowrap; color:var(--accent); background:var(--accent-soft); padding:4px 8px; border-radius:6px; font-size:11px; }.logs-empty { text-align:center; padding:40px 12px; }.logs-empty h2 { font-size:16px; margin-bottom:8px; }.logs-empty p { color:var(--muted); font-size:13px; }
@media(max-width:900px) { .logs-heading { flex-direction:column; gap:0; margin-bottom:22px; } }
@media(max-width:600px) { .log-filters { grid-template-columns:1fr 1fr; gap:10px; }.log-filters > label:first-child { grid-column:1/-1; } }
</style>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api } from '../api/client';
type Entry = Record<string, unknown>;
const logs = ref<Entry[]>([]), error = ref(''), busy = ref(false);
const entries = computed(() => [...logs.value].sort((a, b) => Number(b.TIME || 0) - Number(a.TIME || 0)));
const operations: Record<string, string> = { Get_SUB: '获取订阅', Get_Best_SUB: '获取优选订阅', Save_Config: '保存配置', Save_Custom_IPs: '保存地址库', Init_Config: '初始化配置', Admin_Login: '访问管理页面' };
async function load() { busy.value = true; error.value = ''; try { const value = await api<unknown>('/api/logs'); logs.value = Array.isArray(value) ? value.filter(x => x && typeof x === 'object') : []; } catch (e) { error.value = e instanceof Error ? e.message : '加载失败'; } finally { busy.value = false; } }
function exportLogs() { const url = URL.createObjectURL(new Blob([JSON.stringify(entries.value, null, 2)], {type:'application/json'})); const a = document.createElement('a'); a.href = url; a.download = 'prometheus-logs.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function time(value: unknown) { if (value === null || value === undefined || value === '') return '未知时间'; const date = new Date(Number(value)); return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(date) : '未知时间'; }
function operation(value: unknown) { const type = String(value || ''); return operations[type] || type || '未知操作'; }
onMounted(load);
</script>
<template>
  <section class="management-page logs-page">
    <div class="logs-heading"><div><h1 class="page-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9 8h6M9 12h6M9 16h4"/></svg><span>操作日志</span></h1></div><div class="logs-actions"><button :disabled="busy" @click="load">{{ busy ? '刷新中…' : '刷新日志' }}</button><button class="secondary" :disabled="!entries.length" @click="exportLogs">导出日志</button></div></div>
    <section class="card logs-surface" :aria-busy="busy" aria-label="日志记录">
      <div class="logs-summary"><h2>活动记录</h2><span>{{ entries.length }} 条记录</span></div>
      <p v-if="error" role="alert" class="error">{{ error }}</p>
      <p v-if="busy && !entries.length" role="status" class="logs-empty">正在读取日志…</p>
      <p v-else-if="!entries.length && !error" class="logs-empty">暂无日志记录</p>
      <ol v-if="entries.length" class="log-list">
        <li v-for="(entry, index) in entries" :key="index" class="log-entry">
          <dl class="log-details">
            <div class="log-time"><dt>时间 <span>(UTC+8)</span></dt><dd>{{ time(entry.TIME) }}</dd></div>
            <div class="log-ip"><dt>IP</dt><dd>{{ entry.IP || '未知' }}</dd></div>
            <div class="log-region"><dt>地区</dt><dd>{{ entry.CC || '未知' }}</dd></div>
            <div class="log-operation"><dt>操作</dt><dd><span class="operation-badge">{{ operation(entry.TYPE) }}</span></dd></div>
          </dl>
        </li>
      </ol>
    </section>
  </section>
</template>
<style scoped>
.logs-heading { display: flex; justify-content: space-between; align-items: center; gap: 24px; margin-bottom: 28px; }
.logs-heading h1 { font-size: clamp(27px, 4vw, 39px); font-weight: 600; letter-spacing: -1px; margin: 0; }
.logs-heading .intro { color: #7b8ba4; font-size: 13px; line-height: 1.8; margin: 0; }
.logs-actions { display: flex; flex-shrink: 0; gap: 8px; }
.logs-actions button { font-size: 12px; border-radius: 12px; padding: 11px 16px; -webkit-tap-highlight-color: transparent; }
.logs-summary { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 24px; }
.logs-summary h2 { margin: 0 !important; }
.logs-summary > span { font-size: 11px; color: #8290a5; }
.log-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.log-entry { min-width: 0; padding: 18px 20px; border: 1px solid #ffffffa6; border-radius: 18px; background: linear-gradient(135deg,#ffffff50,#ffffff26); box-shadow: inset 0 1px 1px #ffffff80; }
.log-details { display: grid; grid-template-columns: 1.2fr 1fr 1fr .9fr; gap: 20px; margin: 0; align-items: start; }
.log-details > div { min-width: 0; }
.log-details dt { font-size: 10px; color: #8290a5; margin-bottom: 9px; letter-spacing: .04em; }
.log-details dt span { font-size: 9px; }
.log-details dd { margin: 0; font-size: 12px; color: #526985; line-height: 1.7; overflow-wrap: anywhere; }
.log-time dd, .log-ip dd { font-variant-numeric: tabular-nums; }
.operation-badge { display: inline-block; max-width: 100%; border-radius: 8px; padding: 3px 9px; color: #6084b6; background: #719ce914; font-size: 11px; }
.logs-empty { padding: 36px 16px; text-align: center; color: #8290a5; }
:global(:root[data-theme=dark] .log-entry) { background: linear-gradient(135deg,#ffffff08,#ffffff03); border-color: #ffffff1c; box-shadow: inset 0 1px 1px #ffffff0a; }
:global(:root[data-theme=dark] .log-details dd) { color: #c1d0e6; }
:global(:root[data-theme=dark] .operation-badge) { color: #a4c4f0; background: #719ce91a; }
@media (max-width: 800px) { .log-details { grid-template-columns: 1.2fr 1fr; gap: 16px 24px; } }
@media (max-width: 600px) { .logs-heading { align-items: flex-start; flex-direction: column; gap: 18px; margin-bottom: 24px; } .log-entry { padding: 16px; border-radius: 15px; } .log-details { grid-template-columns: 1fr; gap: 13px; } .log-details > div { display: grid; grid-template-columns: 92px minmax(0, 1fr); gap: 10px; align-items: baseline; } .log-details dt { margin: 0; } .log-details dd { font-size: 12px; } .logs-summary { margin-bottom: 18px; } }
</style>

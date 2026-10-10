<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../api/client';
const logs = ref<unknown[]>([]); const error = ref(''); const busy = ref(false);
async function load() {
  busy.value = true; error.value = '';
  try { logs.value = await api<unknown[]>('/api/logs'); }
  catch (e) { error.value = e instanceof Error ? e.message : '加载失败'; }
  finally { busy.value = false; }
}
onMounted(load);
</script>
<template>
  <h1>操作日志</h1><section class="card"><button :disabled="busy" @click="load">刷新日志</button>
    <p v-if="error" role="alert" class="error">{{ error }}</p><p v-else-if="!logs.length" class="hint">暂无日志。</p>
    <pre v-for="(entry, index) in [...logs].reverse()" :key="index">{{ JSON.stringify(entry, null, 2) }}</pre>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useConfigStore } from '../stores/config';
import type { Configuration } from '../../shared/config';
const store = useConfigStore(); const error = ref(''); const message = ref('');
onMounted(async () => { try { await store.load(); } catch (e) { error.value = e instanceof Error ? e.message : '加载失败'; } });
const generation = computed(() => store.data?.优选订阅生成 as Configuration | undefined);
const token = computed(() => String(generation.value?.TOKEN || ''));
const links = computed(() => [
  { label: '节点链接', value: String(store.data?.LINK || '') },
  ...[['自适应订阅', ''], ['Base64', '&b64'], ['Clash', '&clash'], ['Sing-box', '&sb'], ['Surge', '&surge']].map(([label, suffix]) => ({ label, value: `${window.location.origin}/sub?token=${encodeURIComponent(token.value)}${suffix}` })),
]);
const usage = computed(() => ((store.data?.CF as Configuration | undefined)?.Usage as Configuration | undefined));
async function copy(value: string) {
  try { await navigator.clipboard.writeText(value); message.value = '已复制'; }
  catch { error.value = '复制失败，请手动选择链接复制'; }
}
</script>
<template>
  <h1>管理概览</h1>
  <p v-if="error" role="alert" class="error">{{ error }}</p>
  <template v-if="store.data">
    <section class="card">
      <h2>节点与订阅</h2>
      <div v-for="link in links" :key="link.label" class="field">
        <label>{{ link.label }}</label><div class="copy-row"><input :value="link.value" readonly :aria-label="link.label" /><button @click="copy(link.value)">复制</button></div>
      </div>
      <p v-if="message" role="status" class="success">{{ message }}</p>
    </section>
    <section class="card">
      <h2>运行配置</h2><p>{{ store.data.协议类型 }} / {{ store.data.传输协议 }}</p><p>域名：{{ store.data.HOST }}</p>
      <p v-if="usage?.success">今日请求：{{ usage.total }} / {{ usage.max }}</p>
      <p v-else class="hint">未配置用量数据，请在集成页面设置 Cloudflare 凭据或用量接口。</p>
    </section>
  </template>
</template>

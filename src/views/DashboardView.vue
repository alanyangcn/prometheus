<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useConfigStore } from '../stores/config';
import ShareLink from '../components/ShareLink.vue';
import { subscriptionLinks } from '../features/sharing/links';
import type { Configuration } from '../../shared/config';
const store = useConfigStore(); const error = ref('');
onMounted(async () => { try { await store.load(); } catch (e) { error.value = e instanceof Error ? e.message : '加载失败'; } });
const generation = computed(() => store.data?.优选订阅生成 as Configuration | undefined);
const token = computed(() => String(generation.value?.TOKEN || ''));
const links = computed(() => subscriptionLinks(window.location.origin, token.value, String(generation.value?.SUBNAME || 'Prometheus')));
const usage = computed(() => ((store.data?.CF as Configuration | undefined)?.Usage as Configuration | undefined));
</script>
<template>
  <h1>管理概览</h1>
  <p v-if="error" role="alert" class="error">{{ error }}</p>
  <template v-if="store.data">
    <section class="card">
      <h2>节点与订阅</h2>
      <ShareLink label="节点链接" :url="String(store.data.LINK || '')" :import-url="String(store.data.LINK || '')" />
      <ShareLink v-for="link in links" :key="link.id" :label="link.label" :url="link.url" :import-url="link.importUrl" :filename="link.filename" />
    </section>
    <section class="card">
      <h2>运行配置</h2><p>{{ store.data.协议类型 }} / {{ store.data.传输协议 }}</p><p>域名：{{ store.data.HOST }}</p>
      <p v-if="usage?.success">今日请求：{{ usage.total }} / {{ usage.max }}</p>
      <p v-else class="hint">未配置用量数据，请在集成页面设置 Cloudflare 凭据或用量接口。</p>
    </section>
  </template>
</template>

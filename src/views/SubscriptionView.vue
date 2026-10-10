<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { Configuration } from '../../shared/config';
import { useConfigStore } from '../stores/config';
import { snapshot } from '../stores/snapshot';
import { group, subscriptionMode, prepareSettings } from '../features/configuration/settings';
import { api } from '../api/client';
import PreferredSubscription from '../components/PreferredSubscription.vue';
const store = useConfigStore();
const draft = ref<Configuration | null>(null);
const addresses = ref('');
const savedAddresses = ref('');
const busy = ref(false), error = ref(''), message = ref('');
onMounted(async () => {
  try { const [config, list] = await Promise.all([store.load(), api<{text:string}>('/api/addresses')]); draft.value = snapshot(config); addresses.value = savedAddresses.value = list.text; }
  catch (cause) { error.value = cause instanceof Error ? cause.message : '加载失败'; }
});
function cancel() { addresses.value = savedAddresses.value; if (store.data) draft.value = snapshot(store.data); error.value = ''; message.value = '已取消未保存的修改'; }
async function save() {
  if (!draft.value || busy.value) return;
  busy.value = true; error.value = ''; message.value = '';
  try {
    if (subscriptionMode(draft.value) === 'custom' && !addresses.value.trim()) throw new Error('自定义地址库不能为空，请先添加地址');
    if (subscriptionMode(draft.value) === 'random' && (!Number.isInteger(group(group(draft.value, '优选订阅生成'), '本地IP库').随机数量) || Number(group(group(draft.value, '优选订阅生成'), '本地IP库').随机数量) > 99)) throw new Error('随机优选数量必须为 1–99 的整数');
    // Update only this section, preserving node and proxy settings saved elsewhere.
    const subscription = snapshot(group(draft.value, '优选订阅生成'));
    delete subscription.SUBNAME;
    const prepared = prepareSettings({ 优选订阅生成: subscription }, navigator.userAgent);
    if (subscriptionMode(draft.value) === 'custom') { await api('/api/addresses', {text: addresses.value}); savedAddresses.value = addresses.value; }
    try { await store.save(prepared); } catch (cause) { if (subscriptionMode(draft.value) === 'custom') throw new Error(`地址库已保存，但订阅设置保存失败：${cause instanceof Error ? cause.message : '请重试'}`); throw cause; }
    draft.value = snapshot(store.data!);
    message.value = '优选订阅设置已保存';
  } catch (cause) { error.value = cause instanceof Error ? cause.message : '保存失败'; }
  finally { busy.value = false; }
}
</script>
<template>
  <section class="management-page">
    <h1 class="page-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M4 12h10M4 17h7m7-3v7m-3-3 3 3 3-3" /></svg><span>优选订阅</span></h1>
    <p v-if="error" role="alert" class="error">{{ error }}</p>
    <form v-if="draft" class="card" @submit.prevent="save">
      <fieldset class="subscription-fields" :disabled="busy"><PreferredSubscription :model="draft" v-model:addresses="addresses" /></fieldset>
      <div class="actions"><button :disabled="busy">{{ busy ? '保存中…' : '保存设置' }}</button><button type="button" class="secondary" :disabled="busy" @click="cancel">取消修改</button></div>
      <p v-if="message" role="status" class="success">{{ message }}</p>
    </form>
  </section>
</template>
<style scoped>
.subscription-fields { border: 0; padding: 0; margin: 0; min-width: 0; }
</style>

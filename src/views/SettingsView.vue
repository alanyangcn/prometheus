<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useConfigStore } from '../stores/config';
import type { Configuration } from '../../shared/config';
import { snapshot } from '../stores/snapshot';
import ConfigFields from '../components/ConfigFields.vue';
const store = useConfigStore(); const draft = ref<Configuration | null>(null);
const message = ref(''); const error = ref(''); const busy = ref(false);
async function load() {
  try { draft.value = snapshot(await store.load()); }
  catch (e) { error.value = e instanceof Error ? e.message : '加载失败'; }
}
onMounted(load);
async function save() {
  if (!draft.value) return; busy.value = true; message.value = ''; error.value = '';
  try { await store.save(draft.value); draft.value = snapshot(store.data!); message.value = '设置已保存'; }
  catch (e) { error.value = e instanceof Error ? e.message : '保存失败'; }
  finally { busy.value = false; }
}
async function reset() {
  if (!window.confirm('重置节点设置？地址库和集成凭据会保留。')) return;
  busy.value = true; error.value = '';
  try { await store.reset(); draft.value = snapshot(store.data!); message.value = '设置已重置'; }
  catch (e) { error.value = e instanceof Error ? e.message : '重置失败'; }
  finally { busy.value = false; }
}
</script>
<template>
  <h1>节点设置</h1>
  <p class="intro">设置协议、传输、订阅生成和上游代理。凭据在集成页面单独管理。</p>
  <p v-if="error" role="alert" class="error">{{ error }}</p>
  <form v-if="draft" class="card" @submit.prevent="save">
    <ConfigFields :model="draft" />
    <div class="actions"><button :disabled="busy">保存设置</button><button type="button" class="secondary" :disabled="busy" @click="reset">重置设置</button></div>
    <p v-if="message" role="status" class="success">{{ message }}</p>
  </form>
</template>

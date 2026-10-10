<script setup lang="ts">
import { useToastMessage } from '../composables/useToast';
import { computed, onMounted, ref } from 'vue';
import type { Configuration } from '../../shared/config';
import { useConfigStore } from '../stores/config';
import { snapshot } from '../stores/snapshot';
import { echConflict, resolveEchConflict, group, prepareSettings } from '../features/configuration/settings';
import EchConfiguration from '../components/EchConfiguration.vue';
const store = useConfigStore();
const draft = ref<Configuration | null>(null);
const busy = ref(false), error = useToastMessage('error'), message = useToastMessage('success');
const conflict = computed(() => draft.value ? echConflict(draft.value) : false);
const disabled = computed(() => draft.value?.协议类型 === 'ss' && group(draft.value, 'SS').TLS === false);
onMounted(async () => { try { draft.value = snapshot(await store.load()); } catch (cause) { error.value = cause instanceof Error ? cause.message : '加载失败'; } });
function cancel() { if (store.data) draft.value = snapshot(store.data); error.value = ''; message.value = '已取消未保存的修改'; }
function resolve(action: 'chrome' | 'firefox' | 'disable') { if (draft.value) resolveEchConflict(draft.value, action); }
async function save() {
  if (!draft.value || busy.value) return;
  error.value = ''; message.value = '';
  if (conflict.value) { error.value = '请先解决 ECH 与浏览器指纹的冲突'; return; }
  if (draft.value.ECH && !String(group(draft.value, 'ECHConfig').DNS || '').trim()) { error.value = '请填写 EchConfig DNS 服务'; return; }
  busy.value = true;
  try {
    await store.save(prepareSettings({ECH: disabled.value ? false : draft.value.ECH, ECHConfig: snapshot(group(draft.value, 'ECHConfig')), Fingerprint: draft.value.Fingerprint}, navigator.userAgent));
    draft.value = snapshot(store.data!); message.value = 'ECH 设置已保存';
  } catch (cause) { error.value = cause instanceof Error ? cause.message : '保存失败'; } finally { busy.value = false; }
}
</script>
<template>
  <section class="management-page">
    <h1 class="page-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 8 4v5c0 5-8 9-8 9s-8-4-8-9V7l8-4Z"/><path d="m9 12 2 2 4-4"/></svg><span>Encrypted Client Hello</span></h1>

    <form v-if="draft" class="card" @submit.prevent="save">
      <fieldset :disabled="busy" class="ech-fields"><EchConfiguration :model="draft" :disabled="disabled" :show-title="false" />
      <p v-if="disabled" class="hint">当前 Shadowsocks 未启用 TLS，无法开启 ECH。</p>
      <div v-if="conflict" role="alert"><p>当前指纹 {{ draft.Fingerprint }} 不支持 ECH。</p><div class="actions"><button type="button" @click="resolve('chrome')">使用 Chrome 并启用 ECH</button><button type="button" @click="resolve('firefox')">使用 Firefox 并启用 ECH</button><button type="button" class="secondary" @click="resolve('disable')">关闭 ECH</button></div></div>
      </fieldset>
      <div class="actions"><button :disabled="busy">{{ busy ? '保存中…' : '保存设置' }}</button><button type="button" class="secondary" :disabled="busy" @click="cancel">取消修改</button></div>

    </form>
  </section>
</template>
<style scoped>.ech-fields { border: 0; margin: 0; padding: 0; min-width: 0; } .ech-fields :deep(.ech-configuration) { margin-top: 0; }</style>

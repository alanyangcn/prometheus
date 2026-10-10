<script setup lang="ts">
import { onBeforeUnmount, ref, useId, watch } from 'vue';
import { vGlassDialog } from '../features/appearance/glassDialog';
import { showToast, useToastMessage } from '../composables/useToast';
import QRCode from 'qrcode';
const props = defineProps<{ label: string; url: string; importUrl?: string; filename?: string }>();
const qr = ref(''); const opened = ref(false); const generating = ref(false);
const qrDialog = ref<HTMLDialogElement | null>(null); const titleId = useId();
let generation = 0;
onBeforeUnmount(() => { generation++; qrDialog.value?.close(); }); const error = useToastMessage('error'); const downloading = ref(false);
watch(() => props.url, () => { generation++; qr.value = ''; generating.value = false; qrDialog.value?.close(); opened.value = false; });
async function copy(event: Event) {
  error.value = '';
  const input = event.currentTarget as HTMLInputElement;
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(props.url);
    else { input.select(); if (!document.execCommand('copy')) throw new Error('复制失败'); }
    showToast('复制成功');
  } catch { input.select(); error.value = '复制失败，请手动选择链接复制'; }
}
async function showQr() {
  if (!props.url || generating.value) return;
  opened.value = true; qrDialog.value?.showModal();
  if (qr.value) return;
  const current = ++generation;
  generating.value = true;
  try {
    const image = await QRCode.toDataURL(props.url, { width: 320, margin: 2, errorCorrectionLevel: 'M' });
    if (current === generation) qr.value = image;
  } catch {
    if (current === generation) { error.value = '二维码生成失败，链接可能过长'; qrDialog.value?.close(); }
  } finally { if (current === generation) generating.value = false; }
}
async function download() {
  downloading.value = true; error.value = '';
  try {
    const response = await fetch(props.url); if (!response.ok) throw new Error(`下载失败 (${response.status})`);
    const url = URL.createObjectURL(await response.blob()); const anchor = document.createElement('a');
    anchor.href = url; anchor.download = props.filename || 'node.txt'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) { error.value = e instanceof Error ? e.message : '下载失败'; } finally { downloading.value = false; }
}
</script>
<template>
  <div class="field"><div class="share-label"><label>{{ label }}</label><slot name="label-action" /></div><input :value="url" readonly :aria-label="`${label}，点击复制`" title="点击复制链接" @click="copy" @keydown.enter.prevent="copy" @keydown.space.prevent="copy" />
    <div class="actions"><button type="button" class="secondary" aria-haspopup="dialog" :aria-expanded="opened" :disabled="!url" @click="showQr">二维码</button><a v-if="importUrl" :href="importUrl">导入客户端</a><button v-if="filename" type="button" class="secondary" :disabled="downloading" @click="download">下载配置</button></div>
    <Teleport to="body"><dialog ref="qrDialog" v-glass-dialog class="glass-dialog qr-dialog" :aria-labelledby="titleId" @close="opened = false" @click="event => { if (event.target === qrDialog) qrDialog?.close(); }">
      <div class="qr-heading"><h2 :id="titleId">{{ label }}二维码</h2><button type="button" class="secondary" aria-label="关闭二维码" @click="qrDialog?.close()">×</button></div>
      <div class="qr-content" :aria-busy="generating"><p v-if="generating" role="status">正在生成二维码…</p><img v-if="qr" :src="qr" :alt="`${label}二维码`" width="320" height="320" /></div>
      <div class="actions qr-actions"><a v-if="qr" class="qr-save" :href="qr" :download="`${label}.png`">保存二维码</a></div>
    </dialog></Teleport>

  </div>
</template>

<style scoped>
.field { min-width: 0; }
.share-label { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.share-label label { margin-bottom: 0 !important; }
.field input[readonly] { cursor: pointer; }
.qr-dialog { width: min(410px, calc(100vw - 32px)); }
.qr-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 20px; }
.qr-heading h2 { margin: 0; }
.qr-content { display: grid; place-items: center; min-height: 180px; }
.qr-content img { display: block; width: 100%; max-width: 320px; height: auto; border-radius: 16px; padding: 8px; background: white; }
.qr-actions { justify-content: center; }
.qr-save { display: inline-flex; align-items: center; justify-content: center; min-height: 42px; padding: 10px 22px; border-radius: 999px; background: #1879ed; color: #fff; font-size: 13px; text-decoration: none; }
.qr-save:hover { background: #086ae4; text-decoration: none; }
</style>

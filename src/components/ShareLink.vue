<script setup lang="ts">
import { onBeforeUnmount, ref, useId, watch } from 'vue';
import { vGlassDialog } from '../features/appearance/glassDialog';
import { showToast, useToastMessage } from '../composables/useToast';
import QRCode from 'qrcode';
const props = defineProps<{ label: string; url: string; importUrl?: string; filename?: string; copyButton?: boolean }>();
const linkInput = ref<HTMLInputElement | null>(null);
const qr = ref(''); const opened = ref(false); const generating = ref(false);
const qrDialog = ref<HTMLDialogElement | null>(null); const titleId = useId();
let generation = 0;
onBeforeUnmount(() => { generation++; qrDialog.value?.close(); }); const error = useToastMessage('error'); const downloading = ref(false);
watch(() => props.url, () => { generation++; qr.value = ''; generating.value = false; qrDialog.value?.close(); opened.value = false; });
async function copy() {
  error.value = '';
  const input = linkInput.value;
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(props.url);
    else { input?.select(); if (!document.execCommand('copy')) throw new Error('复制失败'); }
    showToast('复制成功');
  } catch { input?.select(); error.value = '复制失败，请手动选择链接复制'; }
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
  <div class="field"><div class="share-label"><label>{{ label }}</label><slot name="label-action" /></div><div :class="{ 'link-copy-row': copyButton }"><input ref="linkInput" :value="url" readonly :aria-label="`${label}，点击复制`" title="点击复制链接" @click="copy" @keydown.enter.prevent="copy" @keydown.space.prevent="copy" /><button v-if="copyButton" type="button" class="secondary link-copy-button" :aria-label="`复制${label}`" title="复制链接" :disabled="!url" @click="copy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="3" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg></button></div>
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
.link-copy-row { display: grid; grid-template-columns: minmax(0, 1fr) 40px; gap: 8px; align-items: stretch; }
.link-copy-row input[readonly] { height: 40px; min-width: 0; margin-bottom: 0; box-sizing: border-box; }
.link-copy-row .link-copy-button { width: 40px; height: 40px; min-height: 40px; padding: 0; border-radius: 12px; display: grid; place-items: center; box-sizing: border-box; }
.link-copy-button svg { width: 18px; height: 18px; }

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

<script setup lang="ts">
import { ref, watch } from 'vue';
import QRCode from 'qrcode';
const props = defineProps<{ label: string; url: string; importUrl?: string; filename?: string }>();
const qr = ref(''); const opened = ref(false); const message = ref(''); const error = ref(''); const downloading = ref(false);
watch(() => props.url, () => { qr.value = ''; opened.value = false; message.value = ''; });
async function copy() { try { await navigator.clipboard.writeText(props.url); message.value = '已复制'; } catch { error.value = '复制失败，请手动选择链接复制'; } }
async function showQr() {
  opened.value = !opened.value;
  if (!opened.value || qr.value) return;
  try { qr.value = await QRCode.toDataURL(props.url, { width: 320, margin: 2, errorCorrectionLevel: 'M' }); }
  catch { error.value = '二维码生成失败，链接可能过长'; }
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
  <div class="field"><label>{{ label }}</label><input :value="url" readonly :aria-label="label" />
    <div class="actions"><button type="button" @click="copy">复制</button><button type="button" class="secondary" :aria-expanded="opened" @click="showQr">二维码</button><a v-if="importUrl" :href="importUrl">导入客户端</a><button v-if="filename" type="button" class="secondary" :disabled="downloading" @click="download">下载配置</button></div>
    <div v-if="opened && qr"><img :src="qr" :alt="`${label}二维码`" width="320" height="320" /><a :href="qr" :download="`${label}.png`">保存二维码</a></div>
    <p v-if="message" role="status" class="success">{{ message }}</p><p v-if="error" role="alert" class="error">{{ error }}</p>
  </div>
</template>

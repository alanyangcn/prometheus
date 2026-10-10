<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useConfigStore } from '../stores/config';
import { attachLiquidGlass } from '../features/appearance/liquidGlass';
const emit = defineEmits<{ reset: [] }>();
const store = useConfigStore();
const dialog = ref<HTMLDialogElement | null>(null);
const busy = ref(false), error = ref('');
let removeGlass: (() => void) | undefined;
function open() { error.value = ''; if (dialog.value && !dialog.value.open) { dialog.value.showModal(); dialog.value.focus({ preventScroll: true }); } }
function cancel() { if (!busy.value) dialog.value?.close(); }
async function reset() {
  if (busy.value) return;
  busy.value = true; error.value = '';
  try { await store.reset(); dialog.value?.close(); emit('reset'); }
  catch (cause) { error.value = cause instanceof Error ? cause.message : '重置失败，请稍后重试'; }
  finally { busy.value = false; }
}
defineExpose({ open });
onMounted(() => { if (dialog.value) removeGlass = attachLiquidGlass(dialog.value); });
onUnmounted(() => { removeGlass?.(); dialog.value?.close(); });
</script>
<template>
  <dialog ref="dialog" class="reset-dialog" tabindex="-1" aria-labelledby="reset-title" aria-describedby="reset-description" :aria-busy="busy" @cancel="busy && $event.preventDefault()">
    <h2 id="reset-title">⚠️ 重置配置</h2>
    <p id="reset-description">重置配置将会初始化所有设置，包括订阅生成、节点信息、反代配置等。此操作不可撤销，请谨慎操作。</p>
    <p class="reset-question"><strong>确定是否完全重置配置？</strong></p>
    <p v-if="error" role="alert" class="reset-error">{{ error }}</p>
    <div class="reset-actions"><button type="button" class="confirm-reset" :disabled="busy" @click="reset">{{ busy ? '正在重置…' : '确定重置' }}</button><button type="button" class="secondary" :disabled="busy" @click="cancel">取消重置</button></div>
  </dialog>
</template>
<style scoped>
.reset-dialog { --glass-filter: blur(18px) saturate(1.35); width: min(440px, calc(100vw - 36px)); padding: 30px; position: fixed; isolation: isolate; border: 1px solid #ffffffb3; border-radius: 30px; background: transparent; color: #32425b; box-shadow: 0 24px 70px #14202d26; }
.reset-dialog:focus { outline: none; }
.reset-dialog::before { content: ''; position: absolute; inset: 0; z-index: -2; border-radius: inherit; background: linear-gradient(145deg,#ffffffcc,#ffffff99 55%,#ffffffb3); -webkit-backdrop-filter: var(--glass-filter); backdrop-filter: var(--glass-filter); box-shadow: inset 0 2px 2px #ffffffe6, inset 0 -1px 2px #ffffff80; }
.reset-dialog::after { content: ''; position: absolute; inset: 0; z-index: -1; border-radius: inherit; padding: 1px; pointer-events: none; background: linear-gradient(135deg,#fff,#ffffff10 35%,#95b2db50 52%,#ffffffcc 78%,#ffffff30); -webkit-mask: linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; }
.reset-dialog::backdrop { background: #17233b26; -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px); }
.reset-dialog h2 { font-size: 21px; font-weight: 600; letter-spacing: -.5px; margin: 0 0 18px; }
.reset-dialog p { font-size: 13px; line-height: 1.9; margin: 14px 0; color: #6d7c92; }
.reset-dialog .reset-question { color: #3e5069; margin-top: 20px; }
.reset-actions { display: flex; gap: 10px; margin-top: 26px; }
.reset-dialog button { min-height: 44px; padding: 11px 18px; border-radius: 999px; font-size: 13px; -webkit-tap-highlight-color: transparent; }
.reset-dialog button.confirm-reset { background: linear-gradient(180deg,#eb6a70,#d94e59); color: white; border: 1px solid #ffffff40; box-shadow: inset 0 1px 1px #ffffff66,0 4px 12px #c8434e20; }
.reset-dialog button.confirm-reset:hover { background: linear-gradient(180deg,#ed7a7f,#df5963); }
.reset-dialog button.secondary { background: #ffffff66; color: #60718c; border: 1px solid #ffffffb3; }
.reset-dialog button.secondary:hover { background: #ffffff99; }
.reset-dialog .reset-error { color: #aa4652; }
:global(:root[data-theme=dark] .reset-dialog) { color: #e5edf8; border-color: #ffffff26; }
:global(:root[data-theme=dark] .reset-dialog::before) { background: linear-gradient(145deg,#24374ae6,#182536d9 60%,#273149e6); box-shadow: inset 0 1px 2px #ffffff30; }
:global(:root[data-theme=dark] .reset-dialog::after) { opacity: .35; }
:global(:root[data-theme=dark] .reset-dialog p) { color: #a0b2cb; }
:global(:root[data-theme=dark] .reset-dialog .reset-question) { color: #d3deed; }
:global(:root[data-theme=dark] .reset-dialog button.secondary) { background: #ffffff0a; border-color: #ffffff20; color: #a8b9d4; }
:global(:root[data-theme=dark] .reset-dialog .reset-error) { color: #ffbdc5; }
@media (max-width: 480px) { .reset-dialog { padding: 25px; border-radius: 26px; } }
@media (prefers-reduced-transparency: reduce) { .reset-dialog::before { -webkit-backdrop-filter: none; backdrop-filter: none; background: #f1f5fc; } :global(:root[data-theme=dark] .reset-dialog::before) { background: #1c2b3c; } }
</style>

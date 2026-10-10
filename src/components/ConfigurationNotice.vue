<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { attachLiquidGlass } from '../features/appearance/liquidGlass';
import { useSessionStore } from '../stores/session';
const session = useSessionStore();
const dialog = ref<HTMLDialogElement | null>(null);
const checking = ref(false);
const error = ref('');
const missing = ref<string[]>([]);
const title = computed(() => missing.value.length > 1 ? '请先完成服务配置' : `需要设置 ${missing.value[0] || ''}`);
async function checkConfiguration() {
  checking.value = true;
  error.value = '';
  try {
    const state = await session.refresh();
    missing.value = [...(!state.configured ? ['ADMIN'] : []), ...(!state.storage ? ['KV'] : [])];
    await nextTick();
    if (missing.value.length && dialog.value && !dialog.value.open) {
      dialog.value.showModal();
      dialog.value.focus({ preventScroll: true });
    }
    if (!missing.value.length) dialog.value?.close();
    return missing.value.length === 0;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '无法读取配置状态，请稍后重试';
    return false;
  } finally { checking.value = false; }
}
let removeGlass: (() => void) | undefined;
defineExpose({ checkConfiguration });
onMounted(() => { if (dialog.value) removeGlass = attachLiquidGlass(dialog.value); });
onUnmounted(() => removeGlass?.());
</script>
<template>
  <p v-if="error" class="error" role="alert">{{ error }}</p>
  <dialog ref="dialog" class="configuration-dialog" tabindex="-1" autofocus aria-labelledby="configuration-title">
    <h2 id="configuration-title">{{ title }}</h2>
    <p v-if="missing.includes('ADMIN')">需要设置 <strong>ADMIN</strong> 参数，用作管理员密码。</p>
    <p v-if="missing.includes('KV')">需要设置 <strong>KV</strong>，绑定名称必须为 <code>KV</code>。</p>
    <p class="hint">配置完成后，点击“重新检查”确认配置状态。</p>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <div class="actions"><button type="button" :disabled="checking" @click="checkConfiguration">{{ checking ? '检查中…' : '重新检查' }}</button><button type="button" class="secondary" @click="dialog?.close()">知道了</button></div>
  </dialog>
</template>
<style scoped>
.configuration-dialog {
  --glass-tint: rgba(255,255,255,.46);
  --glass-filter: blur(14px) saturate(1.5);
  width: min(440px, calc(100vw - 36px));
  padding: 30px;
  isolation: isolate;
  border: 1px solid rgba(255,255,255,.7);
  border-radius: 32px;
  background: transparent;
  color: #202432;
  line-height: 1.7;
  box-shadow: 0 24px 70px rgba(20,28,45,.18), 0 4px 14px rgba(20,28,45,.08), inset 0 0 0 1px rgba(255,255,255,.3);
}
.configuration-dialog:focus { outline: none; }
.configuration-dialog::before {
  content: ''; position: absolute; inset: 0; z-index: -2; border-radius: inherit;
  background: linear-gradient(145deg, rgba(255,255,255,.35), transparent 45%, rgba(255,255,255,.16)), var(--glass-tint);
  -webkit-backdrop-filter: var(--glass-filter);
  backdrop-filter: var(--glass-filter);
  box-shadow: inset 0 2px 3px rgba(255,255,255,.8), inset 2px 0 4px rgba(255,255,255,.4), inset 0 -2px 3px rgba(255,255,255,.65), inset -1px 0 3px rgba(90,110,160,.2);
}
.configuration-dialog::after {
  content: ''; position: absolute; inset: 0; z-index: -1; border-radius: inherit; pointer-events: none;
  padding: 1.5px;
  background: linear-gradient(135deg, rgba(255,255,255,.98), rgba(255,255,255,.12) 28%, rgba(115,145,195,.23) 48%, rgba(255,255,255,.88) 72%, rgba(255,255,255,.15));
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
}
.configuration-dialog::backdrop { background: rgba(27,35,52,.14); }
.configuration-dialog h2 { margin: 0 0 18px; font-size: 22px; font-weight: 650; letter-spacing: -.6px; }
.configuration-dialog p { margin: 14px 0; }
.configuration-dialog strong, .configuration-dialog code { font-weight: 650; }
.configuration-dialog .hint { color: #596377; font-size: 13px; }
.configuration-dialog .actions { margin-top: 26px; gap: 10px; }
.configuration-dialog button {
  min-height: 44px; padding: 11px 20px; border: 1px solid rgba(255,255,255,.48); border-radius: 999px;
  background: linear-gradient(180deg, rgba(46,135,255,.95), rgba(0,101,230,.95)); color: #fff;
  box-shadow: inset 0 1px 1px rgba(255,255,255,.5), 0 3px 9px rgba(0,100,230,.16);
  font-size: 14px; font-weight: 550; -webkit-tap-highlight-color: transparent;
  transition: transform .16s ease, background .16s ease;
}
.configuration-dialog button:hover { background: #0877ef; }
.configuration-dialog button:active { transform: scale(.97); }
.configuration-dialog button.secondary {
  color: #25324b; background: rgba(255,255,255,.25); border-color: rgba(255,255,255,.65);
  -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
  box-shadow: inset 0 1px 1px rgba(255,255,255,.85), inset 0 -1px 1px rgba(255,255,255,.4), 0 2px 7px rgba(20,30,50,.05);
}
.configuration-dialog button.secondary:hover { background: rgba(255,255,255,.5); }
.configuration-dialog button:focus-visible { outline: 2px solid #2785ed; outline-offset: 3px; }
:global(:root[data-theme=dark] .configuration-dialog) { --glass-tint: rgba(24,30,43,.62); color: #f1f3fb; border-color: rgba(255,255,255,.27); box-shadow: 0 24px 70px rgba(0,0,0,.42); }
:global(:root[data-theme=dark] .configuration-dialog::before) { background: linear-gradient(145deg, rgba(255,255,255,.09), transparent 48%, rgba(255,255,255,.035)), var(--glass-tint); box-shadow: inset 0 1px 2px rgba(255,255,255,.4), inset 0 -1px 3px rgba(255,255,255,.2); }
:global(:root[data-theme=dark] .configuration-dialog .hint) { color: #bec8dc; }
:global(:root[data-theme=dark] .configuration-dialog button.secondary) { color: #e4e9f5; background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.2); box-shadow: inset 0 1px 1px rgba(255,255,255,.3); }
@media (max-width: 480px) { .configuration-dialog { padding: 25px; border-radius: 28px; } .configuration-dialog h2 { font-size: 20px; } }
@media (prefers-reduced-transparency: reduce) { .configuration-dialog { --glass-tint: #f5f6f8; --glass-filter: none; } :global(:root[data-theme=dark] .configuration-dialog) { --glass-tint: #202633; } }
@media (prefers-reduced-motion: reduce) { .configuration-dialog button { transition: none; } }
</style>

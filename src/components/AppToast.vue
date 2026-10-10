<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { toastMessage, toastType, toastId } from '../composables/useToast';
const element = ref<HTMLElement | null>(null);
watch([toastId, toastMessage], async () => {
  await nextTick();
  const toast = element.value;
  if (!toast) return;
  if (toastMessage.value) {
    if (typeof toast.showPopover === 'function') { if (toast.matches(':popover-open')) toast.hidePopover(); toast.showPopover(); }
  } else if (toast.matches(':popover-open')) toast.hidePopover();
}, { flush: 'post' });
onBeforeUnmount(() => { if (element.value?.matches(':popover-open')) element.value.hidePopover(); });
</script>
<template>
  <Teleport to="body"><div ref="element" popover="manual" class="app-toast" :class="[`toast-${toastType}`, { 'toast-visible': toastMessage }]" :role="toastType === 'error' ? 'alert' : 'status'" :aria-live="toastType === 'error' ? 'assertive' : 'polite'" aria-atomic="true"><svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path v-if="toastType === 'success'" d="m8 12 2.5 2.5L16 9" /><template v-else-if="toastType === 'error'"><path d="M12 7.5v5" /><circle cx="12" cy="16" r=".8" fill="currentColor" stroke="none" /></template><template v-else><path d="M12 11v5" /><circle cx="12" cy="7.5" r=".8" fill="currentColor" stroke="none" /></template></svg>{{ toastMessage }}</div></Teleport>
</template>
<style scoped>
.app-toast{position:fixed;inset:auto;z-index:10000;top:max(18px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);margin:0;width:max-content;max-width:calc(100vw - 32px);box-sizing:border-box;padding:13px 20px;border:1px solid #ffffffb3;border-radius:18px;background:#f5f8f0d9;color:#456652;box-shadow:0 8px 32px #253d5520;backdrop-filter:blur(20px) saturate(1.3);-webkit-backdrop-filter:blur(20px) saturate(1.3);font-size:13px;line-height:1.6;pointer-events:none;overflow-wrap:anywhere}.app-toast:popover-open{display:flex;align-items:center;gap:10px}.app-toast::backdrop{background:transparent;pointer-events:none}.toast-icon{width:22px;height:22px;flex-shrink:0}.toast-error{background:#fff2f1e6;color:#ad434b}.toast-info{background:#edf4ffe6;color:#416994}:global(:root[data-theme=dark] .app-toast){background:#23372fe6;border-color:#ffffff26;color:#b3d8bf}:global(:root[data-theme=dark] .toast-error){background:#432c34e6;color:#ffb2b8}:global(:root[data-theme=dark] .toast-info){background:#23344ce6;color:#b3d0fa}@supports not selector(:popover-open){.app-toast{display:none}.app-toast.toast-visible{display:flex;align-items:center;gap:10px}}@media(prefers-reduced-transparency:reduce){.app-toast{backdrop-filter:none;-webkit-backdrop-filter:none;background:#f2f6ef}.toast-error{background:#fff2f1}.toast-info{background:#edf4ff}:global(:root[data-theme=dark] .app-toast){background:#23372f}:global(:root[data-theme=dark] .toast-error){background:#432c34}:global(:root[data-theme=dark] .toast-info){background:#23344c}}
</style>

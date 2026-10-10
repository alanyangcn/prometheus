<script setup lang="ts">
import { toastMessage } from '../composables/useToast';
</script>
<template>
  <Teleport to="body"><Transition name="toast"><div v-if="toastMessage" class="app-toast" role="status" aria-live="polite"><span aria-hidden="true">✓</span>{{ toastMessage }}</div></Transition></Teleport>
</template>
<style scoped>
.app-toast { position: fixed; z-index: 10000; top: max(24px, env(safe-area-inset-top)); left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 10px; max-width: calc(100vw - 32px); padding: 13px 20px; border: 1px solid #ffffffb3; border-radius: 18px; background: #f5f8f0d9; color: #456652; box-shadow: 0 8px 32px #253d5520; backdrop-filter: blur(20px) saturate(1.3); -webkit-backdrop-filter: blur(20px) saturate(1.3); font-size: 13px; pointer-events: none; }
:global(:root[data-theme=dark] .app-toast) { background: #23372fe6; border-color: #ffffff26; color: #b3d8bf; }
.toast-enter-active, .toast-leave-active { transition: opacity .2s, translate .2s; }
.toast-enter-from, .toast-leave-to { opacity: 0; translate: 0 -8px; }
@media (prefers-reduced-motion: reduce) { .toast-enter-active, .toast-leave-active { transition: none; } }
</style>

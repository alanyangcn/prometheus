<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { useSessionStore } from '../stores/session';
import { vGlassDialog } from '../features/appearance/glassDialog';
const session = useSessionStore();
const props = defineProps<{ changed: boolean; busy?: boolean }>();
const dialog = ref<HTMLDialogElement | null>(null);
let settle: ((leave: boolean) => void) | undefined;
function finish(leave: boolean) { const resolve = settle; settle = undefined; dialog.value?.close(); resolve?.(leave); }
onBeforeRouteLeave(() => {
  if (!session.state.authenticated || !props.changed && !props.busy) return true;
  return new Promise<boolean>(resolve => { settle?.(false); settle = resolve; dialog.value?.showModal(); });
});
function beforeUnload(event: BeforeUnloadEvent) { if (props.changed || props.busy) { event.preventDefault(); event.returnValue = ''; } }
onMounted(() => window.addEventListener('beforeunload', beforeUnload));
onBeforeUnmount(() => { window.removeEventListener('beforeunload', beforeUnload); finish(false); });
</script>
<template>
  <Teleport to="body"><dialog ref="dialog" v-glass-dialog class="glass-dialog unsaved-dialog" aria-labelledby="unsaved-title" @cancel.prevent="finish(false)" @close="finish(false)">
    <h2 id="unsaved-title">{{ busy ? '正在保存设置' : '有尚未保存的修改' }}</h2>
    <p>{{ busy ? '请等待保存完成后再切换页面。' : '离开此页面会丢弃当前修改。你可以继续编辑，或放弃修改后离开。' }}</p>
    <div class="actions"><button type="button" @click="finish(false)">{{ busy ? '留在此页' : '继续编辑' }}</button><button v-if="!busy" type="button" class="secondary" @click="finish(true)">放弃修改并离开</button></div>
  </dialog></Teleport>
</template>
<style scoped>.unsaved-dialog { width:min(440px,calc(100vw - 32px)); }</style>

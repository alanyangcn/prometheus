<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { vGlassDialog } from '../features/appearance/glassDialog';
const dialog = ref<HTMLDialogElement | null>(null);
onBeforeUnmount(() => dialog.value?.close());
</script>
<template>
  <button type="button" class="secondary token-help-button question-help-button" title="如何修改订阅 TOKEN？" aria-label="如何修改订阅 TOKEN？" @click="dialog?.showModal()">?</button>
  <Teleport to="body">
    <dialog ref="dialog" v-glass-dialog class="glass-dialog token-help-dialog" aria-labelledby="token-help-title">
      <div class="token-help-heading"><h2 id="token-help-title">如何修改订阅 TOKEN？</h2><button type="button" class="secondary" aria-label="关闭 TOKEN 说明" @click="dialog?.close()">×</button></div>
      <div class="token-flow" aria-label="ADMIN 和 KEY 生成 UUID，UUID 与访问域名生成订阅 TOKEN"><span>ADMIN + KEY</span><span aria-hidden="true">→</span><span>UUID</span><span aria-hidden="true">→</span><strong>订阅 TOKEN</strong></div>
      <section class="card"><h3>方式一：动态关联</h3><p>未设置有效的 UUID 环境变量时，修改 <strong>ADMIN</strong> 或 <strong>KEY</strong>，系统会生成新的 UUID，并更新订阅 TOKEN。</p></section>
      <section class="card"><h3>方式二：手动固定</h3><p>设置符合 UUIDv4 格式的 <strong>UUID</strong> 环境变量，系统会使用指定 UUID 生成订阅 TOKEN。需要更换 TOKEN 时，修改这个 UUID。</p></section>
      <p class="hint">固定 UUID 后，修改 ADMIN 或 KEY 不会改变订阅 TOKEN。本项目的 TOKEN 还与访问域名有关，不同域名下的 TOKEN 可能不同。</p>
      <p class="hint">在 Cloudflare Worker 的变量与机密中修改上述参数；本地开发修改 .dev.vars 后重启服务。更新后，请重新复制订阅地址并更新客户端，原 TOKEN 将失效。</p>
      <div class="actions"><button type="button" class="secondary" @click="dialog?.close()">知道了</button></div>
    </dialog>
  </Teleport>
</template>
<style scoped>
.token-help-button{display:inline-grid;place-items:center;width:22px;height:22px;min-height:22px;padding:0;border-radius:50%;font-size:12px;line-height:1;-webkit-tap-highlight-color:transparent}.token-help-dialog{width:min(620px,calc(100vw - 32px))}.token-help-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:20px}.token-help-heading h2{margin:0}.token-flow{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:10px;font-size:12px;margin:24px 0}.token-flow span:not([aria-hidden]),.token-flow strong{padding:9px 12px;border-radius:12px;background:var(--dialog-field);border:1px solid var(--dialog-edge)}.token-flow strong{color:#3986e8}.token-help-dialog .card{margin-top:14px}.token-help-dialog .card h3{margin:0 0 8px}.token-help-dialog .card p{margin:0}
</style>

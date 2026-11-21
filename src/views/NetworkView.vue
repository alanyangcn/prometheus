<script setup lang="ts">
import NetworkDetails from '../features/tools/NetworkDetails.vue';
</script>
<template>
  <section class="management-page">
    <h1 class="page-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 6.5h14M5 17.5h14"/></svg><span>连接信息</span></h1>
    <p class="page-description">查看浏览器与 Worker 当前请求的信息；这些信息不代表代理客户端的连接状态。</p>
    <NetworkDetails />
  </section>
</template>

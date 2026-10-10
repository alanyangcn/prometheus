<script setup lang="ts">
import NetworkOverview from '../features/tools/NetworkOverview.vue';
import NetworkDetails from '../features/tools/NetworkDetails.vue';
</script>
<template>
  <section class="management-page">
    <h1 class="page-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 6.5h14M5 17.5h14"/></svg><span>网络信息</span></h1>
    <NetworkOverview />
    <NetworkDetails />
  </section>
</template>

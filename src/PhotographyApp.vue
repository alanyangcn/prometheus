<script setup lang="ts">
import PhotographyNavigation from './components/PhotographyNavigation.vue';
import HomeView from './views/HomeView.vue';
import { useTheme } from './composables/useTheme';
const { dark, toggleTheme } = useTheme();
</script>
<template>
  <div class="shell photography-shell">
    <PhotographyNavigation :dark="dark" @toggle-theme="toggleTheme" />
    <main class="photography-main"><HomeView /></main>
  </div>
</template>

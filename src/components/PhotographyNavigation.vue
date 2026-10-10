<script setup lang="ts">
defineProps<{ dark: boolean }>();
defineEmits<{ toggleTheme: [] }>();
</script>
<template>
  <header class="photo-navigation">
    <a class="photo-wordmark" href="#" aria-label="Still 摄影随记首页">Still<span class="wordmark-dot">.</span><span class="wordmark-caption">摄影随记</span></a>
    <nav aria-label="摄影导航">
      <a href="#collection">选片</a>
      <a href="#about">关于</a>
      <span class="navigation-divider" aria-hidden="true" />
      <button type="button" class="photo-theme" :aria-label="dark ? '切换浅色模式' : '切换深色模式'" :title="dark ? '切换浅色模式' : '切换深色模式'" :aria-pressed="dark" @click="$emit('toggleTheme')">
        <svg v-if="dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.9 13.1A9 9 0 0 1 10.9 3.1 9 9 0 1 0 20.9 13.1Z" /></svg>
      </button>
    </nav>
  </header>
</template>
<style scoped>
.photo-navigation { display: flex; justify-content: space-between; align-items: center; flex-wrap: nowrap; gap: 16px; padding: 20px 0; border: 0; }
.photo-wordmark { display: inline-flex; align-items: baseline; white-space: nowrap; color: #293329; font-family: Georgia, serif; font-size: 34px; font-weight: 400; letter-spacing: -2px; line-height: 1; -webkit-tap-highlight-color: transparent; }
.photo-wordmark:hover { text-decoration: none; }
.wordmark-dot { color: #899b86; }
.wordmark-caption { margin-left: 16px; font-family: system-ui, sans-serif; font-size: 10px; font-weight: 400; letter-spacing: .15em; color: #929a8d; }
nav { display: flex; align-items: center; gap: 26px; }
nav > a { font-size: 12px; color: #727c6e; letter-spacing: .06em; padding: 8px 0; -webkit-tap-highlight-color: transparent; }
nav > a:hover { color: #293329; text-decoration: none; }
.navigation-divider { height: 14px; width: 1px; background: #dfe4da; }
.photo-theme { display: grid; place-items: center; width: 36px; height: 36px; padding: 8px; border-radius: 50%; background: transparent; color: #727c6e; -webkit-tap-highlight-color: transparent; }
.photo-theme:hover { background: #879b8614; }
.photo-theme svg { width: 19px; height: 19px; }
:global(:root[data-theme=dark] .photo-wordmark) { color: #e0e7d9; }
:global(:root[data-theme=dark] nav > a) , :global(:root[data-theme=dark] .photo-theme) { color: #b1bda8; }
:global(:root[data-theme=dark] .navigation-divider) { background: #ffffff25; }
@media (max-width: 600px) { .photo-navigation { padding: 14px 0; } .photo-wordmark { font-size: 30px; } .wordmark-caption { display: none; } nav { gap: 18px; } }
</style>

<script setup lang="ts">
defineProps<{ loading?: boolean; error?: string }>();
defineEmits<{ retry: [] }>();
</script>
<template>
  <div v-if="loading || error" class="page-state card" :role="error ? 'alert' : 'status'" :aria-busy="loading">
    <span v-if="loading" class="state-spinner" aria-hidden="true" />
    <h2>{{ loading ? '正在加载' : '暂时无法加载' }}</h2>
    <p>{{ loading ? '正在读取配置，请稍候。' : error }}</p>
    <button v-if="!loading" type="button" class="secondary" @click="$emit('retry')">重新加载</button>
  </div>
</template>

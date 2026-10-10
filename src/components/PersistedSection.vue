<script setup lang="ts">
import { ref } from 'vue';
import { readPreference, writePreference } from '../features/configuration/preferences';
const props = defineProps<{ id: string; title: string; defaultOpen?: boolean }>();
const open = ref(readPreference(localStorage, `section-${props.id}`, props.defaultOpen ? 'open' : 'closed') === 'open');
function toggle(event: Event) { open.value = (event.target as HTMLDetailsElement).open; writePreference(localStorage, `section-${props.id}`, open.value ? 'open' : 'closed'); }
</script>
<template><details :open="open" class="config-group" @toggle="toggle"><summary>{{ title }}</summary><slot /></details></template>

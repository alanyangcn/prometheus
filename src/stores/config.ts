import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '../api/client';
import type { Configuration } from '../../shared/config';
export const useConfigStore = defineStore('config', () => {
  const data = ref<Configuration | null>(null);
  async function load() { data.value = await api<Configuration>('/api/config'); return data.value; }
  async function save(value: Configuration) { await api('/api/config', value); await load(); }
  async function reset() { data.value = await api<Configuration>('/api/config/reset', {}); }
  return { data, load, save, reset };
});

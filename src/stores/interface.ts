import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { readPreference, writePreference } from '../features/configuration/preferences';
export const useInterfaceStore = defineStore('interface', () => {
  const saved = readPreference(localStorage, 'mode', 'simple');
  const mode = ref<'simple' | 'expert'>(saved === 'expert' ? 'expert' : 'simple');
  watch(mode, value => writePreference(localStorage, 'mode', value));
  function toggleMode() { mode.value = mode.value === 'simple' ? 'expert' : 'simple'; }
  return { mode, toggleMode };
});

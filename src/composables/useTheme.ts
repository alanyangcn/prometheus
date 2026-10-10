import { ref, onMounted, onUnmounted } from 'vue';

export function useTheme() {
const dark = ref(false);
const themeQuery = window.matchMedia('(prefers-color-scheme: dark)');
function savedTheme() { try { return localStorage.getItem('prometheus-theme'); } catch { return null; } }
function applyTheme(value: boolean) {
  dark.value = value;
  document.documentElement.dataset.theme = value ? 'dark' : 'light';
}
function followSystem(event: MediaQueryListEvent) { if (!savedTheme()) applyTheme(event.matches); }
function toggleTheme() {
  applyTheme(!dark.value);
  try { localStorage.setItem('prometheus-theme', dark.value ? 'dark' : 'light'); } catch { /* Storage may be disabled. */ }
}
onMounted(() => {
  const saved = savedTheme();
  applyTheme(saved ? saved === 'dark' : themeQuery.matches);
  themeQuery.addEventListener('change', followSystem);
});
onUnmounted(() => themeQuery.removeEventListener('change', followSystem));

return { dark, toggleTheme };
}

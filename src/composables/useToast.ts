import { customRef, ref } from 'vue';
export type ToastType = 'success' | 'error' | 'info';
export const toastMessage = ref('');
export const toastType = ref<ToastType>('success');
export const toastId = ref(0);
let timer: ReturnType<typeof setTimeout> | undefined;
const queue: { message: string; type: ToastType }[] = [];
function next() {
  const item = queue.shift();
  if (!item) { toastMessage.value = ''; timer = undefined; return; }
  toastType.value = item.type; toastMessage.value = item.message; toastId.value++;
  timer = setTimeout(next, item.type === 'error' ? 4500 : 2800);
}
export function showToast(message: string, type: ToastType = 'success') {
  if (!message.trim()) return;
  queue.push({ message, type });
  if (!timer) next();
}
// Preserve action state used for validation while routing its feedback to toast.
// Unlike watching a ref, repeated identical failures still notify on every attempt.
export function useToastMessage(type: ToastType = 'success') {
  let value = '';
  return customRef<string>((track, trigger) => ({
    get() { track(); return value; },
    set(message) { value = message; trigger(); if (message) showToast(message, type); },
  }));
}

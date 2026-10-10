import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { showToast, toastId, toastMessage, toastType, useToastMessage } from '../src/composables/useToast';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.runAllTimers(); vi.useRealTimers(); });

it('queues feedback in order and gives errors longer reading time', () => {
  showToast('保存成功'); showToast('保存失败', 'error'); showToast('提醒', 'info');
  expect(toastMessage.value).toBe('保存成功');
  expect(toastType.value).toBe('success');
  vi.advanceTimersByTime(2800);
  expect(toastMessage.value).toBe('保存失败');
  expect(toastType.value).toBe('error');
  vi.advanceTimersByTime(4499);
  expect(toastMessage.value).toBe('保存失败');
  vi.advanceTimersByTime(1);
  expect(toastMessage.value).toBe('提醒');
  expect(toastType.value).toBe('info');
  vi.advanceTimersByTime(2800);
  expect(toastMessage.value).toBe('');
});
it('notifies repeated identical failures without displaying cleared action state', () => {
  const error = useToastMessage('error'); const id = toastId.value;
  error.value = '失败'; error.value = ''; error.value = '失败';
  expect(error.value).toBe('失败');
  expect(toastId.value).toBe(id + 1);
  vi.advanceTimersByTime(4500);
  expect(toastMessage.value).toBe('失败');
  expect(toastId.value).toBe(id + 2);
  vi.advanceTimersByTime(4500);
  expect(toastMessage.value).toBe('');
});
it('ignores blank messages and starts again after draining the queue', () => {
  const id = toastId.value;
  showToast('  '); expect(toastId.value).toBe(id);
  showToast('第一次'); vi.advanceTimersByTime(2800);
  showToast('第二次'); expect(toastMessage.value).toBe('第二次');
  expect(toastId.value).toBe(id + 2);
});

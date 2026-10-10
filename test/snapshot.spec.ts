import { it, expect } from 'vitest';
import { reactive } from 'vue';
import { snapshot } from '../src/stores/snapshot';
it('creates an editable independent draft from a reactive configuration', () => {
  const source = reactive({ 协议类型: 'vless', SS: { TLS: true } });
  const draft = snapshot(source);
  (draft.SS as { TLS: boolean }).TLS = false;
  expect(source.SS.TLS).toBe(true);
  expect(draft.协议类型).toBe('vless');
});

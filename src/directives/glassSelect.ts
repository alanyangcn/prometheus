import type { ObjectDirective } from 'vue';

let sequence = 0;
const instances = new WeakMap<HTMLSelectElement, { update(): void; destroy(): void }>();

function enhance(select: HTMLSelectElement) {
  // Older browsers and listboxes keep the native picker.
  if (!('showPopover' in HTMLElement.prototype) || select.multiple || select.size > 1) return;
  const popup = document.createElement('div');
  popup.className = 'glass-select-options';
  popup.id = `glass-select-options-${++sequence}`;
  popup.setAttribute('popover', 'auto');
  popup.setAttribute('role', 'listbox');
  // Keep dialog pickers inside the modal's interactive subtree.
  (select.closest('dialog') || document.body).append(popup);
  select.setAttribute('aria-controls', popup.id);
  select.setAttribute('aria-expanded', 'false');
  let active = -1, search = '', searchTime = 0;
  let buttons: HTMLElement[] = [];
  const opened = () => popup.matches(':popover-open');
  const disabled = (index: number) => {
    const option = select.options[index];
    return !option || option.disabled || (option.parentElement instanceof HTMLOptGroupElement && option.parentElement.disabled);
  };
  function close() { if (opened()) popup.hidePopover(); select.setAttribute('aria-expanded', 'false'); select.removeAttribute('aria-activedescendant'); }
  function position() {
    if (!opened()) return;
    const rect = select.getBoundingClientRect();
    const viewport = window.visualViewport;
    const leftEdge = viewport?.offsetLeft || 0, topEdge = viewport?.offsetTop || 0;
    const width = viewport?.width || innerWidth, height = viewport?.height || innerHeight;
    const below = topEdge + height - rect.bottom - 14, above = rect.top - topEdge - 14;
    const useAbove = below < 180 && above > below;
    const maxHeight = Math.max(60, Math.min(320, useAbove ? above : below));
    const popupWidth = Math.min(Math.max(rect.width, 160), width - 24);
    popup.style.width = `${popupWidth}px`;
    popup.style.maxHeight = `${maxHeight}px`;
    popup.style.left = `${Math.max(leftEdge + 12, Math.min(rect.left, leftEdge + width - popupWidth - 12))}px`;
    popup.style.top = `${useAbove ? Math.max(topEdge + 12, rect.top - popup.getBoundingClientRect().height - 6) : rect.bottom + 6}px`;
  }
  function highlight(index: number) {
    active = index;
    buttons.forEach((button, i) => button.classList.toggle('highlighted', i === active));
    if (buttons[active]) { select.setAttribute('aria-activedescendant', buttons[active].id); buttons[active].scrollIntoView({ block: 'nearest' }); }
  }
  function choose(index: number) {
    if (disabled(index) || select.matches(':disabled')) return;
    select.selectedIndex = index;
    close();
    // Keep Vue's existing v-model, numeric/object option values and @change handlers.
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
    select.focus({ preventScroll: true });
  }
  function render() {
    popup.replaceChildren(); buttons = [];
    const label = select.getAttribute('aria-label') || select.labels?.[0]?.textContent?.trim() || '选择选项';
    popup.setAttribute('aria-label', label);
    let previousGroup: Element | null = null;
    Array.from(select.options).forEach((option, index) => {
      const group = option.parentElement;
      if (group instanceof HTMLOptGroupElement && group !== previousGroup) {
        const title = document.createElement('div'); title.className = 'glass-select-group'; title.textContent = group.label; popup.append(title);
      }
      previousGroup = group;
      const row = document.createElement('div');
      row.className = 'glass-select-option'; row.id = `${popup.id}-${index}`;
      row.setAttribute('role', 'option'); row.setAttribute('aria-selected', String(option.selected)); row.setAttribute('aria-disabled', String(disabled(index)));
      row.hidden = option.hidden || (group instanceof HTMLOptGroupElement && group.hidden);
      const text = document.createElement('span'); text.textContent = option.label;
      const check = document.createElement('span'); check.className = 'glass-select-check'; check.textContent = '✓'; check.setAttribute('aria-hidden', 'true');
      row.append(text, check);
      row.addEventListener('pointerdown', event => event.preventDefault());
      row.addEventListener('pointermove', () => { if (!disabled(index)) { active = index; buttons.forEach((button, i) => button.classList.toggle('highlighted', i === index)); select.setAttribute('aria-activedescendant', row.id); } });
      row.addEventListener('click', () => choose(index));
      popup.append(row); buttons.push(row);
    });
  }
  function open() {
    if (select.matches(':disabled')) return;
    render(); popup.showPopover(); select.setAttribute('aria-expanded', 'true');
    position(); highlight(select.selectedIndex); position();
  }
  function move(direction: number, edge = false) {
    const enabled = Array.from(select.options).map((_, i) => i).filter(i => !disabled(i) && !buttons[i]?.hidden);
    if (!enabled.length) return;
    const index = enabled.indexOf(active);
    highlight(edge ? (direction > 0 ? enabled[enabled.length - 1] : enabled[0]) : enabled[Math.max(0, Math.min(enabled.length - 1, index + direction))]);
  }
  function pointerDown(event: PointerEvent) { if (event.button !== 0 || select.matches(':disabled')) return; event.preventDefault(); select.focus({ preventScroll: true }); }
  function click(event: MouseEvent) { event.preventDefault(); if (opened()) close(); else open(); }
  function keydown(event: KeyboardEvent) {
    if (select.matches(':disabled')) return;
    if (event.key === 'Tab') { close(); return; }
    if (event.key === 'Escape') { if (opened()) { event.preventDefault(); event.stopPropagation(); close(); } return; }
    if (['Enter', ' ', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      if (!opened()) { open(); return; }
      if (event.key === 'Enter' || event.key === ' ') choose(active);
      else move(event.key === 'ArrowDown' || event.key === 'End' ? 1 : -1, event.key === 'Home' || event.key === 'End');
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault(); if (!opened()) open();
      const now = Date.now(); search = now - searchTime > 700 ? event.key : search + event.key; searchTime = now;
      const index = Array.from(select.options).findIndex((option, i) => !disabled(i) && !buttons[i]?.hidden && option.label.toLocaleLowerCase().startsWith(search.toLocaleLowerCase()));
      if (index >= 0) highlight(index);
    }
  }
  function toggle() { if (!opened()) { select.setAttribute('aria-expanded', 'false'); select.removeAttribute('aria-activedescendant'); } }
  function scroll(event: Event) { if (!popup.contains(event.target as Node)) position(); }
  function update() { if (!select.isConnected || select.matches(':disabled')) close(); else if (opened()) { render(); position(); highlight(select.selectedIndex); } }
  const observer = new MutationObserver(update);
  observer.observe(select, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['disabled', 'label', 'value', 'hidden'] });
  select.addEventListener('pointerdown', pointerDown); select.addEventListener('click', click); select.addEventListener('keydown', keydown); select.addEventListener('blur', close);
  popup.addEventListener('toggle', toggle);
  window.addEventListener('resize', position); window.addEventListener('scroll', scroll, true);
  window.visualViewport?.addEventListener('resize', position);
  return { update, destroy() {
    close(); observer.disconnect(); popup.remove();
    select.removeEventListener('pointerdown', pointerDown); select.removeEventListener('click', click); select.removeEventListener('keydown', keydown); select.removeEventListener('blur', close);
    window.removeEventListener('resize', position); window.removeEventListener('scroll', scroll, true); window.visualViewport?.removeEventListener('resize', position);
    select.removeAttribute('aria-controls'); select.removeAttribute('aria-expanded');
  } };
}
export const glassSelect: ObjectDirective<HTMLSelectElement> = {
  mounted(select) { const instance = enhance(select); if (instance) instances.set(select, instance); },
  updated(select) { instances.get(select)?.update(); },
  beforeUnmount(select) { instances.get(select)?.destroy(); instances.delete(select); },
};

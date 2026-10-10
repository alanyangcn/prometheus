import type { ObjectDirective } from 'vue';
import { attachLiquidGlass } from './liquidGlass';

const cleanups = new WeakMap<HTMLDialogElement, () => void>();

// Dialogs are teleported outside the management shell. Share both the surface
// styles and the existing refraction effect, attaching only while visible.
export const vGlassDialog: ObjectDirective<HTMLDialogElement> = {
  mounted(element) {
    let detach: (() => void) | undefined;
    const transparency = matchMedia('(prefers-reduced-transparency: reduce)');
    const update = () => {
      if (element.open && !transparency.matches) detach ??= attachLiquidGlass(element);
      else { detach?.(); detach = undefined; }
    };
    const observer = new MutationObserver(update);
    observer.observe(element, { attributes: true, attributeFilter: ['open'] });
    transparency.addEventListener('change', update);
    update();
    cleanups.set(element, () => {
      observer.disconnect();
      transparency.removeEventListener('change', update);
      detach?.();
    });
  },
  beforeUnmount(element) { cleanups.get(element)?.(); cleanups.delete(element); },
};

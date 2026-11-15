// Original rim displacement implementation; technique reference:
// https://github.com/deepika-builds/liquid-glass (canvas map + SVG backdrop filter).
function mountLiquidGlass(element: HTMLElement): () => void {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:fixed;width:0;height:0;pointer-events:none';
  const filter = document.createElementNS(ns, 'filter');
  const id = `glass-${crypto.randomUUID()}`;
  filter.id = id;
  filter.setAttribute('color-interpolation-filters', 'sRGB');
  filter.setAttribute('x', '-15%'); filter.setAttribute('y', '-15%');
  filter.setAttribute('width', '130%'); filter.setAttribute('height', '130%');
  const image = document.createElementNS(ns, 'feImage');
  image.setAttribute('result', 'rim'); image.setAttribute('preserveAspectRatio', 'none');
  image.setAttribute('x', '0'); image.setAttribute('y', '0');
  image.setAttribute('width', '100%'); image.setAttribute('height', '100%');
  const displacement = document.createElementNS(ns, 'feDisplacementMap');
  displacement.setAttribute('in', 'SourceGraphic'); displacement.setAttribute('in2', 'rim');
  displacement.setAttribute('scale', '38');
  displacement.setAttribute('xChannelSelector', 'R'); displacement.setAttribute('yChannelSelector', 'G');
  filter.append(image, displacement); svg.append(filter); document.body.append(svg);
  element.style.setProperty('--glass-filter', `url(#${id}) blur(2px) saturate(1.35)`);
  let frame = 0, lastWidth = 0, lastHeight = 0;
  const update = () => {
    const box = element.getBoundingClientRect(); if (!box.width || !box.height) return;
    const w = Math.ceil(box.width), h = Math.ceil(box.height);
    if (w === lastWidth && h === lastHeight) return;
    lastWidth = w; lastHeight = h;
    const radius = parseFloat(getComputedStyle(element).borderTopLeftRadius) || 30;
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    const context = canvas.getContext('2d'); if (!context) return;
    const pixels = context.createImageData(w, h);
    const data = pixels.data;
    const halfW = w / 2, halfH = h / 2, innerW = halfW - radius, innerH = halfH - radius, band = 18;
    const distance = (x: number, y: number) => {
      const qx = Math.abs(x - halfW) - innerW;
      const qy = Math.abs(y - halfH) - innerH;
      return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
    };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const d = distance(x, y);
      if (d <= 0 && d > -band) {
        const strength = Math.sin(Math.PI * -d / band) * 115;
        const nx = (distance(x + 1, y) - distance(x - 1, y)) / 2;
        const ny = (distance(x, y + 1) - distance(x, y - 1)) / 2;
        data[i] = Math.round(128 - nx * strength);
        data[i + 1] = Math.round(128 - ny * strength);
      } else {
        data[i] = 128;
        data[i + 1] = 128;
      }
      data[i + 2] = 128; data[i + 3] = 255;
    }
    context.putImageData(pixels, 0, 0); image.setAttribute('href', canvas.toDataURL());
  };
  const observer = new ResizeObserver(() => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); });
  observer.observe(element); update();
  return () => { observer.disconnect(); cancelAnimationFrame(frame); svg.remove(); element.style.removeProperty('--glass-filter'); };
}

export function attachLiquidGlass(element: HTMLElement): () => void {
  // SVG backdrop refraction currently renders reliably in Chromium.
  if (!/Chrome|Chromium|Edg\//.test(navigator.userAgent) || typeof globalThis.crypto?.randomUUID !== 'function') return () => {};
  const transparency = typeof globalThis.matchMedia === 'function' ? matchMedia('(prefers-reduced-transparency: reduce)') : null;
  let detach: (() => void) | undefined;
  const sync = () => {
    if (transparency?.matches) { detach?.(); detach = undefined; }
    else detach ??= mountLiquidGlass(element);
  };
  transparency?.addEventListener('change', sync);
  sync();
  return () => { transparency?.removeEventListener('change', sync); detach?.(); };
}

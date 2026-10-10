// Isolates directory requests so stale completions cannot update a new selection.
export class RequestScope {
  generation = 0;
  private controllers = new Set<AbortController>();
  cancel() { this.generation++; for (const controller of this.controllers) controller.abort(); this.controllers.clear(); }
  request(timeout = 12000, parent?: AbortSignal, expected = this.generation) {
    const controller = new AbortController(), abort = () => controller.abort();
    this.controllers.add(controller);
    const timer = setTimeout(abort, timeout);
    const close = () => { clearTimeout(timer); parent?.removeEventListener('abort',abort); this.controllers.delete(controller); };
    controller.signal.addEventListener('abort',close,{once:true});
    parent?.addEventListener('abort',abort,{once:true});
    if (parent?.aborted || expected !== this.generation) abort();
    return { signal: controller.signal, current: () => !controller.signal.aborted && expected === this.generation, matches: () => expected === this.generation, close };
  }
}

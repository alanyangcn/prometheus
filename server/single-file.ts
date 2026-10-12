import worker from './index';
import { createEmbeddedAssets, type EmbeddedKey, type EmbeddedManifest } from './assets/embedded';
import type { WorkerEnv } from './env';

export function createSingleFileWorker(manifest: EmbeddedManifest, key?: EmbeddedKey) {
  const assets = createEmbeddedAssets(manifest, key);
  return {
    fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
      // The application only uses Fetcher's fetch method. Do not mutate shared bindings.
      return worker.fetch(request, { ...env, ASSETS: assets as Fetcher }, ctx);
    },
  };
}

import JavaScriptObfuscator from 'javascript-obfuscator';
import type { Plugin } from 'vite';

/** Transform browser bundles before Vite computes their final content hashes. */
export function obfuscateClient(): Plugin {
  return {
    name: 'prometheus-client-obfuscation',
    apply: 'build',
    enforce: 'post',
    renderChunk(code) {
      if (this.environment.name !== 'client') return null;
      const result = JavaScriptObfuscator.obfuscate(code, {
        target: 'browser-no-eval',
        seed: 20261010,
        compact: true,
        identifierNamesGenerator: 'hexadecimal',
        renameGlobals: false,
        renameProperties: false,
        stringArray: true,
        stringArrayThreshold: 0.5,
        stringArrayEncoding: [],
        controlFlowFlattening: false,
        deadCodeInjection: false,
        debugProtection: false,
        selfDefending: false,
        sourceMap: false,
      });
      return { code: result.getObfuscatedCode(), map: null };
    },
  };
}

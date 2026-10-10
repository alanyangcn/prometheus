import type { WorkerEnv } from './env';

export interface ParsedProtocol {
  hasError: boolean;
  message?: string;
  hostname?: string;
  port?: number;
  isUDP?: boolean;
  rawClientData?: Uint8Array;
  version?: number;
}
export interface ProxyAddress {
  hostname: string;
  port: number;
  username?: string;
  password?: string;
}
export interface RuntimeDependencies {
  socketConnect?: typeof import('cloudflare:sockets').connect;
  serveApp?: (request: Request, path: string) => Promise<Response>;
}
// The dynamic registry is internal to migrated JS algorithms. Public boundaries below
// have explicit contracts; it is created afresh for every request.
export interface TunnelRuntime extends RuntimeDependencies {
  [name: string]: any;
  worker: { fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> };
  parseVless(data: Uint8Array, uuid: string): ParsedProtocol;
  parseTrojan(data: Uint8Array, password: string): ParsedProtocol;
  parseProxyAddress(address: string, port?: number): ProxyAddress;
  proxyDefaultPort(type: string): number;
  encodeSecret(value: string, secret: string): string;
  decodeSecret(value: string, secret: string): string;
  hashIdentity(value: string): Promise<string>;
}

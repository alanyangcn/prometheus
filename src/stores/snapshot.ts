import type { Configuration } from '../../shared/config';
export function snapshot(value: Configuration): Configuration {
  // Configuration is JSON data; serialization unwraps Vue proxies at every depth.
  return JSON.parse(JSON.stringify(value)) as Configuration;
}

import type { Configuration } from '../../../shared/config';
import { snapshot } from '../../stores/snapshot';
import { echConflict, group, prepareSettings } from './settings';

const keys = ['PATH', 'HOSTS', '协议类型', '传输协议', 'SS', 'Fingerprint', 'gRPC模式', 'gRPCUserAgent', '跳过证书验证', 'ALPN', '随机路径', '启用0RTT', 'TLS分片', 'ECH', 'ECHConfig'];

/** Independent editable snapshot; excludes identity and other settings sections. */
export function nodeSettings(config: Configuration): Configuration {
  const result: Configuration = {};
  for (const key of keys) if (config[key] !== undefined) result[key] = config[key];
  const subscription = config.优选订阅生成;
  if (subscription && typeof subscription === 'object' && !Array.isArray(subscription)) {
    result.优选订阅生成 = { SUBNAME: subscription.SUBNAME };
  }
  return snapshot(result);
}

export function prepareNodeSettings(config: Configuration, userAgent: string): Configuration {
  const fields = nodeSettings(config);
  const subscription = fields.优选订阅生成;
  delete fields.优选订阅生成;
  const result = prepareSettings(fields, userAgent);
  if (result.ECH) {
    if (!String(group(result, 'ECHConfig').DNS || '').trim()) throw new Error('请填写 ECH DNS 服务');
    if (echConflict(result)) throw new Error('请先解决 ECH 与浏览器指纹的冲突');
  }
  if (subscription) result.优选订阅生成 = subscription;
  return result;
}

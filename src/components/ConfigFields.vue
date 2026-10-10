<script setup lang="ts">
import type { Configuration, JsonValue } from '../../shared/config';
defineOptions({ name: 'ConfigFields' });
const props = defineProps<{ model: Configuration; prefix?: string; exclude?: string[]; disabled?: string[] }>();
const choices: Record<string, string[]> = { '协议类型': ['vless', 'trojan', 'ss'], '传输协议': ['ws', 'grpc', 'xhttp'], 'gRPC模式': ['gun', 'multi'], '加密方式': ['aes-128-gcm', 'aes-256-gcm'], 'Fingerprint': ['chrome', 'firefox', 'safari', 'ios', 'android', 'edge', '360', 'qq', 'random', 'randomized'], 'TLS分片': ['', 'Shadowrocket', 'Happ'], 'ALPN': ['', 'h3', 'h2', 'http/1.1', 'h3,h2', 'h2,http/1.1', 'h3,h2,http/1.1'] };
const readonly = new Set(['TIME', 'HOST', 'UUID', 'LINK', '完整节点路径', '加载时间', 'TOKEN', 'BotToken', 'ChatID']);
function isObject(value: JsonValue): value is Configuration { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function update(key: string, event: Event) {
  const input = event.target as HTMLInputElement;
  const current = props.model[key];
  props.model[key] = typeof current === 'boolean' ? input.checked
    : typeof current === 'number' ? Number(input.value)
    : Array.isArray(current) ? input.value.split('\n').map(x => x.trim()).filter(Boolean)
    : current === null && input.value === '' ? null : input.value;
}
</script>
<template>
  <template v-for="(value, key) in Object.fromEntries(Object.entries(model).filter(([key]) => !exclude?.includes(key)))" :key="key">
    <fieldset v-if="isObject(value) && key !== 'CF'" class="config-group">
      <legend>{{ key }}</legend>
      <ConfigFields :model="value" :prefix="`${prefix || 'config'}-${key}`" />
    </fieldset>
    <div v-else-if="key !== 'CF' && !isObject(value)" class="field">
      <label :for="`${prefix || 'config'}-${key}`">{{ key }}</label>
      <select v-if="choices[key]" :id="`${prefix || 'config'}-${key}`" :value="value ?? ''" :disabled="disabled?.includes(key)" @change="update(key, $event)"><option v-for="option in choices[key]" :key="option" :value="option">{{ option || '关闭' }}</option></select>
      <input v-else-if="typeof value === 'boolean'" :id="`${prefix || 'config'}-${key}`" type="checkbox" :checked="value" :disabled="disabled?.includes(key)" @change="update(key, $event)" />
      <textarea v-else-if="Array.isArray(value)" :id="`${prefix || 'config'}-${key}`" :value="value.join('\n')" :disabled="readonly.has(key)" rows="3" @input="update(key, $event)" />
      <input v-else :id="`${prefix || 'config'}-${key}`" :type="typeof value === 'number' ? 'number' : 'text'" :value="value ?? ''" :disabled="readonly.has(key)" @input="update(key, $event)" />
    </div>
  </template>
</template>

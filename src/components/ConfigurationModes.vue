<script setup lang="ts">
import { computed } from 'vue';
import type { Configuration } from '../../shared/config';
import { group, setProxyMode, type ProxyMode } from '../features/configuration/settings';
import { ref } from 'vue';
import { api } from '../api/client';
import PersistedSection from './PersistedSection.vue';
import ConfigFields from './ConfigFields.vue';
const placeholder = '{{IP:PORT}}';
const props = defineProps<{ model: Configuration; expert?: boolean }>();
const reverse = computed(() => group(props.model, '反代'));
const proxy = computed(() => group(reverse.value, 'SOCKS5'));
const proxyMode = computed({ get: () => String(proxy.value.启用 || 'off') as ProxyMode, set: (value: ProxyMode) => setProxyMode(props.model, value) });
const presets = ref<{ label: string; templates: Configuration; message?: string }[]>([]);
const converterPresets = ref<{ label: string; options: { label: string; value: string }[] }[]>([]);
const presetError = ref(''); const presetMessage = ref(''); const presetsBusy = ref(false);
async function loadPresets(kind: 'path' | 'converter') {
  presetsBusy.value = true; presetError.value = '';
  try {
    if (kind === 'path') presets.value = await api('/api/tools/path-presets', {});
    else converterPresets.value = await api('/api/tools/converter-presets', {});
  } catch (e) { presetError.value = e instanceof Error ? e.message : '读取预设失败'; } finally { presetsBusy.value = false; }
}
function applyPreset(event: Event) {
  const value = (event.target as HTMLSelectElement).value; if (value === '') return;
  const selected = presets.value[Number(value)]; if (!selected) return;
  const existing = group(reverse.value, '路径模板');
  for (const [key, value] of Object.entries(selected.templates)) existing[key] = JSON.parse(JSON.stringify(value));
  presetMessage.value = selected.message || '已应用模板，请保存设置';
}
</script>
<template>
  <PersistedSection v-if="expert" id="proxy" title="上游代理">
    <div class="field"><label for="proxy-mode">账号代理模式</label><select id="proxy-mode" v-model="proxyMode"><option value="off">关闭账号代理 / PROXYIP 回退</option><option v-for="kind in ['socks5', 'http', 'https', 'turn', 'sstp']" :key="kind" :value="kind">{{ kind.toUpperCase() }}</option></select></div>
    <div class="field"><label for="proxy-ip">PROXYIP（auto 自动选择）</label><input id="proxy-ip" v-model="reverse.PROXYIP" placeholder="auto" /></div>
    <template v-if="proxyMode !== 'off'"><div class="field"><label for="proxy-account">代理账号地址</label><input id="proxy-account" v-model="proxy.账号" placeholder="user:password@host:port" required autocomplete="off" /></div><div class="field"><label for="proxy-global">全局代理</label><input id="proxy-global" v-model="proxy.全局" type="checkbox" /></div>
      <p class="hint">关闭全局代理时，仅匹配白名单的目标使用账号代理。</p>
      <ConfigFields :model="proxy" :exclude="['启用', '账号', '全局']" prefix="proxy" />
    </template>
    <details><summary>代理路径模板</summary><button type="button" class="secondary" :disabled="presetsBusy" @click="loadPresets('path')">读取模板预设</button><select v-if="presets.length" aria-label="路径模板预设" @change="applyPreset"><option value="">选择预设</option><option v-for="(preset, index) in presets" :key="preset.label" :value="index">{{ preset.label }}</option></select><p class="hint">使用 <code v-text="placeholder" /> 替换代理地址。保存时去掉开头的 /。</p><ConfigFields :model="group(reverse, '路径模板')" prefix="template" /></details>
  </PersistedSection>
  <PersistedSection v-if="expert" id="conversion" title="订阅转换配置"><button type="button" class="secondary" :disabled="presetsBusy" @click="loadPresets('converter')">读取转换配置预设</button><select v-if="converterPresets.length" v-model="group(model, '订阅转换配置').SUBCONFIG" aria-label="订阅转换配置预设"><option value="">选择转换配置</option><optgroup v-for="preset in converterPresets" :key="preset.label" :label="preset.label"><option v-for="option in preset.options" :key="option.value" :value="option.value">{{ option.label }}</option></optgroup></select><ConfigFields :model="group(model, '订阅转换配置')" prefix="conversion" /></PersistedSection>
  <p v-if="presetError" role="alert" class="error">{{ presetError }}</p><p v-if="presetMessage" role="status" class="success">{{ presetMessage }}</p>
</template>

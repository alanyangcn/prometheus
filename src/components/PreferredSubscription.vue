<script setup lang="ts">
import { computed } from 'vue';
import type { Configuration } from '../../shared/config';
import { group, subscriptionMode, setSubscriptionMode, type SubscriptionMode } from '../features/configuration/settings';
const props = defineProps<{ model: Configuration }>();
const sub = computed(() => group(props.model, '优选订阅生成'));
const library = computed(() => group(sub.value, '本地IP库'));
const mode = computed({ get: () => subscriptionMode(props.model), set: (mode: SubscriptionMode) => setSubscriptionMode(props.model, mode) });
const subFields = computed(() => Object.fromEntries(Object.entries(sub.value).filter(([key]) => !['local', '本地IP库', 'SUB', 'SUBNAME'].includes(key))));
</script>
<template>
    <div class="field"><label for="subscription-mode">地址来源</label><select id="subscription-mode" v-model="mode"><option value="random">随机优选</option><option value="custom">自定义地址库</option><option value="generator">外部订阅生成器</option></select></div>
    <template v-if="mode === 'random'"><div class="field"><label for="random-count">随机数量</label><input id="random-count" v-model.number="library.随机数量" type="number" min="1" required /></div></template>
    <div v-if="mode !== 'generator'" class="field"><label for="preferred-port">指定端口（-1 自动）</label><input id="preferred-port" v-model.number="library.指定端口" type="number" min="-1" max="65535" /></div>
    <p v-if="mode === 'custom'" class="hint">从地址库读取自定义地址。<RouterLink to="/Illumination/addresses">编辑或上传地址库</RouterLink></p>
    <div v-if="mode === 'generator'" class="field"><label for="generator-url">优选订阅生成器地址</label><input id="generator-url" v-model="sub.SUB" placeholder="generator.example.com" required /></div>
    <div v-for="(_, key) in subFields" :key="key" class="field"><label :for="`subscription-${key}`">{{ key }}</label><input :id="`subscription-${key}`" v-model="sub[key]" :disabled="key === 'TOKEN'" :type="typeof sub[key] === 'number' ? 'number' : 'text'" /></div>
</template>

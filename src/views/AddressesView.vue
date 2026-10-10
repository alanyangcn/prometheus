<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../api/client';
const text = ref(''); const source = ref(''); const error = ref(''); const message = ref(''); const busy = ref(false);
onMounted(async () => { try { text.value = (await api<{ text: string }>('/api/addresses')).text; } catch (e) { error.value = e instanceof Error ? e.message : '加载失败'; } });
async function save() {
  busy.value = true; error.value = ''; message.value = '';
  try { await api('/api/addresses', { text: text.value }); message.value = '地址库已保存'; }
  catch (e) { error.value = e instanceof Error ? e.message : '保存失败'; }
  finally { busy.value = false; }
}
async function check() {
  busy.value = true; error.value = '';
  try {
    const result = await api<{ data: string[] }>(`/admin/getADDAPI?url=${encodeURIComponent(source.value)}`);
    if (!result.data.length) throw new Error('此来源未返回可用地址');
    text.value = [...new Set([...text.value.split('\n').filter(Boolean), ...result.data])].join('\n');
    message.value = '已导入，请保存地址库';
  } catch (e) { error.value = e instanceof Error ? e.message : '导入失败'; }
  finally { busy.value = false; }
}
function download() {
  const url = URL.createObjectURL(new Blob([text.value], { type: 'text/plain;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'prometheus-addresses.txt'; anchor.click(); URL.revokeObjectURL(url);
}
</script>
<template>
  <h1>地址库</h1><p class="intro">每行一个地址，可附加端口与备注，例如 example.com:443#节点名称。也可填写订阅源或其他节点链接。</p>
  <section class="card"><label for="addresses">自定义地址</label><textarea id="addresses" v-model="text" rows="14" spellcheck="false" />
    <div class="actions"><button :disabled="busy" @click="save">保存地址库</button><button class="secondary" @click="download">导出文本</button></div>
  </section>
  <section class="card"><label for="source">优选 API 地址</label><input id="source" v-model="source" type="url" placeholder="https://…" /><button :disabled="busy || !source" @click="check">验证并导入</button></section>
  <p v-if="error" role="alert" class="error">{{ error }}</p><p v-if="message" role="status" class="success">{{ message }}</p>
</template>

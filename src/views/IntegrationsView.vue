<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../api/client';
const enabled = ref(false);
const telegram = ref({ BotToken: '', ChatID: '' });
const cloudflare = ref({ Email: '', GlobalAPIKey: '', AccountID: '', APIToken: '', UsageAPI: '' });
const error = ref(''); const message = ref(''); const busy = ref(false);
async function save(type: string, data: unknown) {
  busy.value = true; error.value = ''; message.value = '';
  try {
    await api(`/api/integrations/${type}`, data); message.value = '集成设置已保存';
    if (type === 'telegram') telegram.value = { BotToken: '', ChatID: '' };
    else cloudflare.value = { Email: '', GlobalAPIKey: '', AccountID: '', APIToken: '', UsageAPI: '' };
  } catch (e) { error.value = e instanceof Error ? e.message : '保存失败'; }
  finally { busy.value = false; }
}
async function check(type: string, send = false) {
  busy.value = true; error.value = ''; message.value = '';
  try { const result = await api<Record<string, unknown>>(`/api/tools/${type === 'telegram' ? (send ? 'telegram-send-test' : 'telegram-check') : 'cloudflare-check'}`, type === 'telegram' ? telegram.value : cloudflare.value); message.value = String(result.message || JSON.stringify(result)); }
  catch (e) { error.value = e instanceof Error ? e.message : '检测失败'; } finally { busy.value = false; }
}
async function saveEnabled() { busy.value = true; error.value = ''; message.value = ''; try { await api('/api/config', { TG: { 启用: enabled.value } }); message.value = enabled.value ? 'Telegram 日志通知已启用' : 'Telegram 日志通知已关闭'; } catch (e) { error.value = e instanceof Error ? e.message : '保存失败'; } finally { busy.value = false; } }
onMounted(async () => { try { const config = await api<{TG?: {启用?: boolean}}>('/api/config'); enabled.value = config.TG?.启用 === true; } catch (e) { error.value = e instanceof Error ? e.message : '加载失败'; } });
async function clear(type: string) { if (window.confirm('清除这项集成的凭据？')) await save(type, { init: true }); }
</script>
<template>
  <h1>外部集成</h1><p class="intro">凭据保存在服务端，保存后清空输入框。空输入框的检测使用已保存凭据，Telegram 验证仅查询 Bot 身份。Telegram 日志通知开关在下方保存。</p>
  <form class="card" @submit.prevent="save('telegram', telegram)"><h2>Telegram</h2>
    <label for="telegram-enabled"><input id="telegram-enabled" v-model="enabled" type="checkbox" />启用 Telegram 日志通知</label><button type="button" class="secondary" :disabled="busy" @click="saveEnabled">保存通知开关</button><label for="bot-token">Bot Token</label><input id="bot-token" v-model="telegram.BotToken" type="password" autocomplete="off" />
    <label for="chat-id">Chat ID</label><input id="chat-id" v-model="telegram.ChatID" />
    <div class="actions"><button :disabled="busy">保存</button><button type="button" class="secondary" :disabled="busy" @click="clear('telegram')">清除凭据</button><button type="button" class="secondary" :disabled="busy" @click="check('telegram')">验证 Bot</button><button type="button" class="secondary" :disabled="busy" @click="check('telegram', true)">发送测试通知</button></div>
  </form>
  <form class="card" @submit.prevent="save('cloudflare', cloudflare)"><h2>Cloudflare 请求用量</h2>
    <p class="hint">填写 AccountID + APIToken、Email + GlobalAPIKey，或一个 HTTPS UsageAPI。</p>
    <div v-for="(_, key) in cloudflare" :key="key"><label :for="key">{{ key }}</label><input :id="key" v-model="cloudflare[key]" :type="['APIToken', 'GlobalAPIKey'].includes(key) ? 'password' : 'text'" autocomplete="off" /></div>
    <div class="actions"><button :disabled="busy">保存</button><button type="button" class="secondary" :disabled="busy" @click="clear('cloudflare')">清除凭据</button><button type="button" class="secondary" :disabled="busy" @click="check('cloudflare')">检查请求用量</button></div>
  </form>
  <p v-if="error" role="alert" class="error">{{ error }}</p><p v-if="message" role="status" class="success">{{ message }}</p>
</template>

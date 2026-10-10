<script setup lang="ts">
import { ref } from 'vue';
import { api } from '../api/client';
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
async function clear(type: string) { if (window.confirm('清除这项集成的凭据？')) await save(type, { init: true }); }
</script>
<template>
  <h1>外部集成</h1><p class="intro">凭据保存在服务端，保存后清空输入框。Telegram 通知还需在节点设置中启用。</p>
  <form class="card" @submit.prevent="save('telegram', telegram)"><h2>Telegram</h2>
    <label for="bot-token">Bot Token</label><input id="bot-token" v-model="telegram.BotToken" type="password" autocomplete="off" />
    <label for="chat-id">Chat ID</label><input id="chat-id" v-model="telegram.ChatID" />
    <div class="actions"><button :disabled="busy">保存</button><button type="button" class="secondary" :disabled="busy" @click="clear('telegram')">清除凭据</button></div>
  </form>
  <form class="card" @submit.prevent="save('cloudflare', cloudflare)"><h2>Cloudflare 请求用量</h2>
    <p class="hint">填写 AccountID + APIToken、Email + GlobalAPIKey，或一个 HTTPS UsageAPI。</p>
    <div v-for="(_, key) in cloudflare" :key="key"><label :for="key">{{ key }}</label><input :id="key" v-model="cloudflare[key]" :type="['APIToken', 'GlobalAPIKey'].includes(key) ? 'password' : 'text'" autocomplete="off" /></div>
    <div class="actions"><button :disabled="busy">保存</button><button type="button" class="secondary" :disabled="busy" @click="clear('cloudflare')">清除凭据</button></div>
  </form>
  <p v-if="error" role="alert" class="error">{{ error }}</p><p v-if="message" role="status" class="success">{{ message }}</p>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import type { Configuration } from '../../shared/config';
import { group } from '../features/configuration/settings';
import { showToast } from '../composables/useToast';
const props = defineProps<{model: Configuration; disabled?: boolean; showTitle?: boolean}>();
const config = computed(() => group(props.model, 'ECHConfig'));
const dnsOptions = [
  ['udp://208.67.220.220:443','OpenDNS'], ['udp://149.112.112.112:9953','Quad9'],
  ['udp://45.90.28.0:5353','NextDNS'], ['udp://188.166.206.224:5003','Tiarap'],
  ['https://doh.applied-privacy.net/query','Applied Privacy DoH'], ['https://odvr.nic.cz/doh','CZ.NIC DoH'],
  ['https://dns.alidns.com/dns-query','阿里 DoH'], ['https://sm2.doh.pub/dns-query','腾讯国密 DoH'],
  ['https://doh.360.cn/dns-query','360 DoH'], ['https://doh.onedns.net/dns-query','OneDNS DoH'],
];
const domains = ['cloudflare-ech.com','crypto.cloudflare.com','encryptedsni.com','icook.hk','cm.edu.kg','godotengine.org','www.britannica.com','www.prometheus.io','www.kyocera.com','celestia.org','lido.fi'];
const dnsChoice = ref(''), domainChoice = ref('');
const optionLabels: Record<string,string> = {"udp://208.67.220.220:443": "udp://208.67.220.220:443（OpenDNS）", "udp://149.112.112.112:9953": "udp://149.112.112.112:9953（Quad9）", "udp://45.90.28.0:5353": "udp://45.90.28.0:5353（NextDNS）", "udp://188.166.206.224:5003": "udp://188.166.206.224:5003（Tiarap）", "https://doh.applied-privacy.net/query": "https://doh.applied-privacy.net/query（Applied Privacy DoH）", "https://odvr.nic.cz/doh": "https://odvr.nic.cz/doh（CZ.NIC DoH）", "https://dns.alidns.com/dns-query": "https://dns.alidns.com/dns-query（阿里 DoH：国内DNS需搭配设置ECH解析域名，是否可用需自行验证）（推荐）", "https://sm2.doh.pub/dns-query": "https://sm2.doh.pub/dns-query（腾讯国密 DoH：国内DNS需搭配设置ECH解析域名，是否可用需自行验证）", "https://doh.360.cn/dns-query": "https://doh.360.cn/dns-query（360 DoH：国内DNS需搭配设置ECH解析域名，是否可用需自行验证）", "https://doh.onedns.net/dns-query": "https://doh.onedns.net/dns-query（OneDNS DoH：国内DNS需搭配设置ECH解析域名，是否可用需自行验证）", "custom": "自定义", "__AUTO__": "自动获取（使用节点的伪装域名解析 EchConfig）", "cloudflare-ech.com": "cloudflare-ech.com（Cloudflare ECH域名）（推荐）", "crypto.cloudflare.com": "crypto.cloudflare.com（Cloudflare密码学服务）", "encryptedsni.com": "encryptedsni.com（Cloudflare加密SNI）", "icook.hk": "icook.hk（愛料理 HK）", "cm.edu.kg": "cm.edu.kg（CM科技大学）", "godotengine.org": "godotengine.org（Godot 开源游戏引擎）", "www.britannica.com": "www.britannica.com（大英百科全书）", "www.prometheus.io": "www.prometheus.io（Prometheus 监控系统）", "www.kyocera.com": "www.kyocera.com（Kyocera 集团官网）", "celestia.org": "celestia.org（Celestia 模块化区块链）", "lido.fi": "lido.fi（Lido 流动质押）"};
const helpDialog = ref<HTMLDialogElement | null>(null);
const helpTab = ref(0);
function openHelp() { helpTab.value = 0; helpDialog.value?.showModal(); }
onBeforeUnmount(() => helpDialog.value?.close());
watch(() => props.model, () => {
  dnsChoice.value = dnsOptions.some(([url]) => url === config.value.DNS) ? String(config.value.DNS) : 'custom';
  domainChoice.value = !config.value.SNI ? '__AUTO__' : domains.includes(String(config.value.SNI)) ? String(config.value.SNI) : 'custom';
}, {immediate: true});
function domesticDNS() { return dnsOptions.slice(6).some(([url]) => url === config.value.DNS); }
function reconcileDomain() {
  if (!config.value.SNI && domesticDNS()) {
    config.value.SNI = 'cloudflare-ech.com'; domainChoice.value = 'cloudflare-ech.com';
    showToast('国内 DNS 已搭配 cloudflare-ech.com 解析域名');
  }
}
function changeDNS() { config.value.DNS = dnsChoice.value === 'custom' ? '' : dnsChoice.value; reconcileDomain(); }
function changeDomain() { config.value.SNI = domainChoice.value === '__AUTO__' ? null : domainChoice.value === 'custom' ? '' : domainChoice.value; if (domainChoice.value === '__AUTO__') reconcileDomain(); }
</script>
<template>
  <section class="ech-configuration">
    <h2 v-if="showTitle !== false">Encrypted Client Hello</h2>
    <div class="field"><label for="ech-enabled">ECH 设置</label><div class="ech-toggle"><input id="ech-enabled" v-model="model.ECH" type="checkbox" :disabled="disabled" /><label for="ech-enabled">启用</label></div></div>
      <div v-if="config.DNS !== undefined" class="field"><label for="ech-dns">EchConfig DNS 服务</label><select id="ech-dns" v-model="dnsChoice" @change="changeDNS"><option v-for="[url, name] in dnsOptions" :key="url" :value="url">{{ optionLabels[url] || name }}</option><option value="custom">自定义</option></select><input v-if="dnsChoice === 'custom'" v-model="config.DNS" aria-label="自定义 ECH DNS 服务" placeholder="udp://… 或 https://…" :required="model.ECH === true" @change="reconcileDomain" /></div>
      <div v-if="config.SNI !== undefined" class="field"><label for="ech-domain">EchConfig 解析域名</label><select id="ech-domain" v-model="domainChoice" @change="changeDomain"><option value="__AUTO__">自动获取（使用节点伪装域名）</option><option v-for="domain in domains" :key="domain" :value="domain">{{ optionLabels[domain] || domain }}</option><option value="custom">自定义</option></select><input v-if="domainChoice === 'custom'" v-model="config.SNI" aria-label="自定义 ECH 解析域名" placeholder="cloudflare-ech.com" :required="model.ECH === true" /></div>
      <p class="hint">解析域名用于获取 EchConfig。选择国内 DNS 时，自动解析将改为 cloudflare-ech.com；实际可用性取决于客户端和 DNS 服务。</p>
    <button type="button" class="secondary ech-help-button" @click="openHelp">为什么需要 ECH？ECH 又是什么？</button>
    <Teleport to="body"><dialog ref="helpDialog" class="ech-help-dialog" aria-labelledby="ech-help-title" @click="event => { if (event.target === helpDialog) helpDialog?.close(); }">
      <div class="ech-help-heading"><h2 id="ech-help-title">Encrypted Client Hello</h2><button type="button" class="secondary" aria-label="关闭 ECH 帮助" @click="helpDialog?.close()">×</button></div>
      <div class="ech-help-tabs" role="tablist" aria-label="ECH 帮助"><button v-for="(title, index) in ['什么是 ECH？','如何使用？','如何确认生效？']" :id="`ech-help-tab-${index}`" :key="title" type="button" class="secondary" role="tab" :aria-selected="helpTab === index" aria-controls="ech-help-content" :class="{ active: helpTab === index }" @click="helpTab = index">{{ title }}</button></div>
      <div id="ech-help-content" role="tabpanel" :aria-labelledby="`ech-help-tab-${helpTab}`">
        <template v-if="helpTab === 0"><h3>保护 TLS 握手中的域名信息</h3><p>普通 TLS 已加密通信内容，但 ClientHello 中的 SNI 可能暴露连接的域名。ECH 对内部 ClientHello 加密，减少真实域名在握手阶段的暴露。</p><p>Cloudflare 的外层域名通常为 cloudflare-ech.com。ECH 不隐藏连接的 IP，也不保证所有网络环境下都能连接。</p><a href="https://blog.cloudflare.com/zh-cn/announcing-encrypted-client-hello/" target="_blank" rel="noopener noreferrer">Cloudflare 官方 ECH 说明</a></template>
        <template v-else-if="helpTab === 1"><h3>配置与更新订阅</h3><ol><li>使用支持 ECH 的客户端和内核，例如 v2rayN、v2rayNG、Mihomo 或 sing-box 的兼容版本。</li><li>启用 ECH，选择 EchConfig DNS 服务和解析域名。</li><li>使用兼容指纹 Chrome 或 Firefox；冲突时通过页面提示选择处理方式。</li><li>保存设置后，在客户端更新订阅并重新连接。</li></ol><p>国内 DNS 配合自动解析可能无法取得 EchConfig。本页面会将该组合调整为 cloudflare-ech.com，也可选择国际 DNS 或自定义服务。解析域名用于获取配置，不等同于节点 HOST。</p><p>此处 UDP DNS 地址由客户端使用，Worker 不会因此提供通用 UDP 转发。</p></template>
        <template v-else><h3>检查客户端的实际握手</h3><p>先确认更新后的节点包含 ECH 参数，再查看客户端日志是否成功取得 EchConfig、协商 ECH，以及是否出现回退或握手失败。</p><p>需要进一步确认时，可在本机抓取实际节点连接的 TLS 握手，检查 ECH 扩展及外层 SNI。仅凭网页测速成功或设置开关选中，不能确认节点已使用 ECH。</p><p>浏览器的 ECH 检测只反映浏览器连接，不能直接证明代理客户端的节点握手。</p></template>
      </div>
      <button type="button" class="secondary ech-help-close" @click="helpDialog?.close()">关闭</button>
    </dialog></Teleport>
  </section>
</template>
<style scoped>
.ech-configuration { margin: 24px 0; }
.ech-configuration h2 { font-size: 15px; margin-bottom: 18px; }
.ech-toggle { display: flex; align-items: center; gap: 9px; } .ech-toggle label { margin: 0; }
.ech-help-button { margin-top: 16px; }
.ech-help-dialog { width: min(680px, calc(100vw - 32px)); max-height: 85dvh; padding: 24px; border: 1px solid #ffffffb3; border-radius: 24px; color: #425773; background: #f0f5fbef; box-shadow: 0 20px 80px #20365430; backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); }
.ech-help-dialog::backdrop { background: #18263f50; backdrop-filter: blur(5px); }
.ech-help-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; } .ech-help-heading h2 { font-size: 18px; }
.ech-help-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0; } .ech-help-tabs button { font-size: 12px; padding: 10px; } .ech-help-tabs button.active { background: #528bc720; color: #3977b9; }
.ech-help-dialog p, .ech-help-dialog li { font-size: 13px; line-height: 1.85; } .ech-help-dialog h3 { font-size: 15px; } .ech-help-close { margin-top: 18px; }
:global(:root[data-theme=dark] .ech-help-dialog) { color: #b1c1d8; background: #1c2b3cef; border-color: #ffffff20; }
:global(:root[data-theme=dark] .ech-help-tabs button.active) { color: #8ab5e8; background: #8ab5e820; }
</style>

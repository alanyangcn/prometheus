// Browser network diagnostics migrated from cmliu/edgetunnel admin (GPL-2.0).
export interface NetworkProbe { name: string; group: string; url: string; kind: 'trace' | 'json' | 'jsonp' }
export interface NetworkResult { name: string; group: string; success: boolean; ip?: string; location?: string; version?: 'v4' | 'v6'; asn?: string; organization?: string; duration: number; error?: string }
export const networkSources: NetworkProbe[] = [
  ...['api.cloudflare-cn.com','www.cf-ns.com','www.cf-ns.net','www.cf-ns.tech'].map((host,index) => ({name:`国内 ${index+1}`,group:'国内出口',url:`https://${host}/cdn-cgi/trace`,kind:'trace' as const})),
  {name:'ipapi.is',group:'海外出口',url:'https://api.ipapi.is',kind:'json'},
  {name:'cmliussss',group:'海外出口',url:'https://api.cmliussss.net/api/ipinfo',kind:'json'},
  {name:'Cloudflare IPv4',group:'Cloudflare 出口',url:'https://ipv4.090227.xyz/',kind:'json'},
  {name:'Cloudflare IPv6',group:'Cloudflare 出口',url:'https://ipv6.090227.xyz/',kind:'json'},
  {name:'X.com',group:'墙外测试',url:'https://help.x.com/cdn-cgi/trace',kind:'trace'},
  {name:'Google',group:'墙外测试',url:'https://jsonp-ip.appspot.com/',kind:'jsonp'},
];
export const latencySites = [
  {name:'字节抖音',region:'国内',url:'https://lf3-zlink-tos.ugurl.cn/obj/zebra-public/resource_lmmizj_1632398893.png'},
  {name:'Bilibili',region:'国内',url:'https://i0.hdslb.com/bfs/face/member/noface.jpg@24w_24h_1c'},
  {name:'腾讯微信',region:'国内',url:'https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico'},
  {name:'阿里淘宝',region:'国内',url:'https://img.alicdn.com/imgextra/i2/O1CN01qnQCrN1VkzAWiU4Hs_!!6000000002692-2-tps-33-33.png'},
  {name:'GitHub',region:'国际',url:'https://github.github.io/janky/images/bg_hr.png'},
  {name:'Telegram.DC5',region:'国际',url:'https://flora.web.telegram.org/'},
  {name:'X.com',region:'国际',url:'https://abs.twimg.com/favicons/twitter.3.ico'},
  {name:'YouTube',region:'国际',url:'https://www.youtube.com/favicon.ico'},
];
export function ipVersion(ip: string): 'v4' | 'v6' | undefined {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip) && ip.split('.').every(part => Number(part) <= 255)) return ip === '0.0.0.0' ? undefined : 'v4';
  if (ip.includes(':')) { try { new URL(`https://[${ip.replace(/^\[|\]$/g,'')}]/`); return 'v6'; } catch { return; } }
}
function requestSignal(parent: AbortSignal): {signal: AbortSignal; cleanup: () => void} {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (parent.aborted) abort(); else parent.addEventListener('abort',abort,{once:true});
  const timer = setTimeout(abort,8000);
  return {signal:controller.signal,cleanup:() => { clearTimeout(timer); parent.removeEventListener('abort',abort); }};
}
let callbackSequence = 0;
async function jsonp(url: string, signal: AbortSignal): Promise<Record<string, unknown>> {
  return new Promise((resolve,reject) => {
    const callback = `prometheusProbe_${`${Date.now()}_${++callbackSequence}`}`, script = document.createElement('script');
    const scope = window as unknown as Record<string, unknown>;
    const cleanup = () => { script.remove(); delete scope[callback]; signal.removeEventListener('abort',abort); };
    const abort = () => { cleanup(); reject(new Error('检测已停止或超时')); };
    scope[callback] = (data: Record<string,unknown>) => { cleanup(); resolve(data); };
    script.onerror = () => { cleanup(); reject(new Error('网络请求失败')); };
    signal.addEventListener('abort',abort,{once:true});
    if (signal.aborted) { abort(); return; }
    script.referrerPolicy = 'no-referrer'; script.src = `${url}?callback=${callback}&_t=${Date.now()}`; document.head.appendChild(script);
  });
}
export async function probeNetwork(source: NetworkProbe, parent: AbortSignal, request: typeof fetch = fetch, now = () => performance.now()): Promise<NetworkResult> {
  const {signal,cleanup} = requestSignal(parent), start = now();
  try {
    let data: Record<string,unknown>;
    if (source.kind === 'jsonp') data = await jsonp(source.url,signal);
    else {
      const response = await request(`${source.url}${source.url.includes('?') ? '&' : '?'}_t=${Date.now()}`,{signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      data = source.kind === 'trace' ? Object.fromEntries((await response.text()).split('\n').filter(line => line.includes('=')).map(line => [line.slice(0,line.indexOf('=')),line.slice(line.indexOf('=')+1)])) : await response.json() as Record<string,unknown>;
    }
    const ip = String(data.ip || ''), version = ipVersion(ip);
    if (!version) throw new Error('无有效出口 IP');
    const location = data.location && typeof data.location === 'object' ? data.location as Record<string, unknown> : {};
    const network = data.asn && typeof data.asn === 'object' ? data.asn as Record<string, unknown> : {};
    const country = data.loc || data.country_code || location.country_code || location.country || data.country || data.cc;
    const organization = data.org || data.asn_org || data.as_name || network.org;
    const asn = network.asn || data.asn_num || (typeof data.asn !== 'object' ? data.asn : undefined);
    return {name:source.name,group:source.group,success:true,ip,version,location:[country, organization].filter(value => typeof value === 'string').join(' '),...(organization ? {organization:String(organization)} : {}),...(asn ? {asn:String(asn).replace(/^AS/i,'')} : {}),duration:Math.round(now()-start)};
  } catch (e) { return {name:source.name,group:source.group,success:false,duration:Math.round(now()-start),error:parent.aborted ? '已停止' : e instanceof Error ? e.message : '检测失败'}; }
  finally {cleanup();}
}
export async function measureLatency(url: string, parent: AbortSignal, request: typeof fetch = fetch, now = () => performance.now()): Promise<number | null> {
  const {signal,cleanup} = requestSignal(parent), start = now();
  try { await request(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`,{method:'HEAD',cache:'no-cache',mode:'no-cors',credentials:'omit',referrerPolicy:'no-referrer',signal}); return Math.round(now()-start); } catch { return null; } finally { cleanup(); }
}
export async function latencyLoop(url: string, count: number, parent: AbortSignal, sample: (value: number | null) => void, measure = measureLatency, interval = 1000): Promise<void> {
  for (let index = 0; index < count && !parent.aborted; index++) {
    const value = await measure(url,parent); if (parent.aborted) return; sample(value);
    if (index+1 < count) await new Promise<void>(resolve => { const finish = () => { clearTimeout(timer); parent.removeEventListener('abort',finish); resolve(); }; const timer = setTimeout(finish,interval); parent.addEventListener('abort',finish,{once:true}); if (parent.aborted) finish(); });
  }
}

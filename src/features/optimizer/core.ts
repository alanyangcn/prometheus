// Browser BestCF workflow adapted from cmliu/edgetunnel (GPL-2.0).
export interface Candidate { address: string; ip: string; family: 'ipv4'|'ipv6'|'domain'; port: number }
export interface Result extends Candidate { latency?: number; speed?: number; country: string; colo: string; type: string; status: 'ok'|'failed'|'cancelled'; error?: string }
export interface Dependencies { fetch: typeof fetch; now: () => number }
export const libraries = [
  { label: 'CF 官方 IPv4', url: 'https://cf.090227.xyz/ips-v4' },
  { label: 'CF 官方 IPv6', url: 'https://cf.090227.xyz/ips-v6' },
  { label: 'CM IPv4', url: 'https://raw.githubusercontent.com/cmliu/cmliu/main/CF-CIDR.txt' },
  ...['13335','209242'].flatMap(asn => ['ipv4','ipv6'].map(family => ({label:`AS${asn} ${family}`,url:`https://raw.githubusercontent.com/ipverse/asn-ip/master/as/${asn}/${family}-aggregated.txt` }))),
];
function ipNumber(ip: string): {value: bigint; bits: number} | null {
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) { const parts=ip.split('.').map(Number); if(parts.some(x=>x>255)) return null; return {value:parts.reduce((n,x)=>(n<<8n)+BigInt(x),0n),bits:32}; }
  if (!ip.includes(':') || /[^a-f\d:]/i.test(ip)) return null;
  const halves=ip.split('::'); if(halves.length>2) return null;
  const left=halves[0] ? halves[0].split(':'):[]; const right=halves[1] ? halves[1].split(':'):[];
  const groups=halves.length===2 ? [...left,...Array(Math.max(0,8-left.length-right.length)).fill('0'),...right]:left;
  if(groups.length!==8 || (halves.length===2 && left.length+right.length>=8) || groups.some(g=>! /^[a-f\d]{1,4}$/i.test(g))) return null;
  return {value:groups.reduce((n,g)=>(n<<16n)+BigInt(`0x${g}`),0n),bits:128};
}
function numberIp(n: bigint,bits: number) { return bits===32 ? [24,16,8,0].map(s=>String(Number((n>>BigInt(s))&255n))).join('.') : Array.from({length:8},(_,i)=>((n>>BigInt(112-i*16))&65535n).toString(16)).join(':'); }
export function candidates(text: string, limit=512, port=443): Candidate[] {
  if(!Number.isInteger(limit)||limit<1||limit>4096||!Number.isInteger(port)||port<0||port>65535) throw Error('数量或端口无效');
  const output=new Map<string,Candidate>(); const tls=[443,2053,2083,2087,2096,8443];
  const add=(ip:string,p=port)=>{ const parsed=ipNumber(ip); if(!parsed && (/^[\d.]+$/.test(ip) || !/^(?=.{1,253}$)[a-z\d](?:[a-z\d.-]*[a-z\d])?$/i.test(ip))) throw Error(`地址无效: ${ip}`); const actual=p||tls[output.size%tls.length]; if(actual<1||actual>65535) throw Error('端口无效'); const family=parsed?.bits===128?'ipv6':parsed?'ipv4':'domain'; const address=`${family==='ipv6'?`[${ip}]`:ip}:${actual}`; output.set(address,{ip,port:actual,family,address}); };
  for(const raw of text.split(/[\r\n,]+/)) {
    const line=raw.split('#')[0].trim(); if(!line||output.size>=limit) continue;
    const range=line.includes('/')?line.split('/'):line.includes('-')&&ipNumber(line.split('-')[0])?line.split('-'):null;
    if(range) { const a=ipNumber(range[0]); if(!a) throw Error(`范围无效: ${line}`); let start=a.value,end:bigint;
      if(line.includes('/')){ const prefix=Number(range[1]); if(!/^\d+$/.test(range[1])||prefix<0||prefix>a.bits) throw Error('CIDR 无效'); const size=1n<<BigInt(a.bits-prefix); start=(start/size)*size; end=start+size-1n; }
      else {const b=ipNumber(range[1]); if(!b||b.bits!==a.bits||b.value<start) throw Error('IP 区间无效'); end=b.value;}
      const remaining=limit-output.size; const count=Number(end-start+1n < BigInt(remaining)?end-start+1n:BigInt(remaining));
      for(let i=0;i<count;i++) add(numberIp(start+(end-start+1n)*BigInt(i)/BigInt(count),a.bits));
    } else {const match=line.match(/^\[([^\]]+)\](?::(\d+))?$|^([^:]+):(\d+)$/); add(match?(match[1]||match[3]):line,match?Number(match[2]||match[4]||port):port);}
  } return [...output.values()];
}
export function probeUrl(c: Candidate, host: string, path: string) {
  if(!/^[a-z\d.-]+$/i.test(host)) throw Error('探测域名无效');
  const label=c.family==='ipv4'?c.ip.split('.').map(x=>Number(x).toString(16).padStart(2,'0')).join('').toUpperCase():c.ip.replace(/:/g,'-');
  return c.family==='domain'?`https://${c.ip}:${c.port}/${path}`:`https://${label}.${host}:${c.port}/${path}`;
}
async function scoped<T>(signal:AbortSignal,timeout:number,task:(signal:AbortSignal)=>Promise<T>):Promise<T>{
  const controller=new AbortController(); const abort=()=>controller.abort(signal.reason); signal.addEventListener('abort',abort,{once:true}); if(signal.aborted) abort();
  let timer:ReturnType<typeof setTimeout>|undefined;
  const stopped=new Promise<never>((_,reject)=>{ controller.signal.addEventListener('abort',()=>reject(new Error(signal.aborted?'已取消':'探测超时')),{once:true}); if(controller.signal.aborted) reject(new Error('已取消')); timer=setTimeout(()=>controller.abort(),timeout); });
  try{return await Promise.race([task(controller.signal),stopped]);} finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
}
function readable(response:Response){if(response.type==='opaque'||!response.ok) throw Error(`不可读取的探测响应 HTTP ${response.status}（CORS / TLS / 网络限制）`);}
export async function latency(c:Candidate,host:string,timeout:number,signal:AbortSignal,deps:Dependencies,baseline:NetworkInfo[]=[],locations:Location[]=[]):Promise<Result>{
  const url=probeUrl(c,host,'ip.json'); let error:unknown;
  for(let i=0;i<3;i++){if(signal.aborted) throw Error('已取消'); try {await scoped(signal,timeout*2,async s=>readable(await deps.fetch(url,{method:'OPTIONS',cache:'no-store',signal:s})));error=undefined;break;}catch(e){error=e;}}
  if(error) throw error;
  return scoped(signal,timeout,async s=>{const start=deps.now();const response=await deps.fetch(url,{cache:'no-store',signal:s}); readable(response);const data:unknown=await response.json();if(!data||typeof data!=='object'||!('ip' in data)||typeof data.ip!=='string')throw Error('探测服务未返回有效 IP 元数据');const meta=data as Record<string,unknown>; const elapsed=Math.max(1,Math.round(deps.now()-start));if(elapsed>timeout)throw Error('探测超时');return {...c,latency:elapsed,status:'ok',country:preferredType(meta,baseline)==='优选反代'?String(meta.country||'未知'):locationCountry(String(meta.colo||''),locations),colo:String(meta.colo||'未知'),type:preferredType(meta,baseline)};});
}
export async function speed(c:Candidate,host:string,signal:AbortSignal,deps:Dependencies,onProgress:(mbps:number)=>void=()=>{},duration=10000):Promise<number>{
  let bytes=0; const started=deps.now();const rate=()=>bytes*8/Math.max(1,deps.now()-started)/1000;
  try {await scoped(signal,duration,async s=>{const response=await deps.fetch(`${probeUrl(c,host,'__down')}?bytes=20000000`,{signal:s,cache:'no-store'});readable(response);if(!response.body)throw Error('下载响应无数据流');const reader=response.body.getReader();const abort=()=>{void reader.cancel().catch(()=>{});};s.addEventListener('abort',abort,{once:true});try{while(!s.aborted){const item=await reader.read();if(item.done)break;bytes+=item.value.byteLength;onProgress(rate());}}finally{s.removeEventListener('abort',abort);reader.releaseLock();}});}catch(e){if(signal.aborted||!bytes)throw e; if(!(e instanceof Error)||e.message!=='探测超时')throw e;}
  if(signal.aborted)throw Error('已取消');if(!bytes)throw Error('未收到下载字节');return rate();
}
export async function pool<T>(items: T[], concurrency:number,signal:AbortSignal,task:(item:T)=>Promise<void>){let next=0;await Promise.all(Array.from({length:Math.min(items.length,Math.max(1,Math.min(32,Math.floor(concurrency))))},async()=>{while(!signal.aborted){const index=next++;if(index>=items.length)return;await task(items[index]);}}));}
export function csv(results:Result[]){const cell=(value:unknown)=>{let s=String(value??'');if(/^[=+@-]/.test(s))s=`'${s}`;return `"${s.replace(/"/g,'""')}"`;};return '\uFEFF'+[['地址','类型','优选类型','国家','机房','延迟 ms','Mbps','状态','错误'],...results.map(r=>[r.address,r.family,r.type,r.country,r.colo,r.latency,r.speed,r.status,r.error])].map(row=>row.map(cell).join(',')).join('\r\n');}

export interface NetworkInfo { ip:string; ipType:string; country:string; colo:string; cnIspCode:string; endpoint?:string }
export function preferredType(meta:Record<string,unknown>,baseline:NetworkInfo[]=[]){const match=baseline.find(b=>b.ip===meta.ip);const official=!!match||(meta.country==='CN'&&typeof meta.cnIspCode==='string'&&meta.cnIspCode!=='other');if(!official)return '优选反代';const code=String(match?.cnIspCode||meta.cnIspCode||'');return ({ct:'电信优选',cu:'联通优选',cmcc:'移动优选'} as Record<string,string>)[code]||'官方优选';}
export async function discoverNetwork(hosts:string[],signal:AbortSignal,deps:Dependencies):Promise<{host:string;network:NetworkInfo[]}>{
  for(const host of hosts){if(signal.aborted)throw Error('已取消');const probes=['671F0401','6CA2C001','BC726001','68100001','68180001','AC400001','2606-4700--1','2606-4700--1000-1','2606-4700--2000-1','2606-4700--3000-1'];const network:NetworkInfo[]=[];await Promise.all(probes.map(async label=>{try{const data=await scoped(signal,6500,async s=>{const response=await deps.fetch(`https://${label}.${host}/ip.json`,{signal:s,cache:'no-store'});readable(response);return await response.json() as Partial<NetworkInfo>;});if(typeof data.ip==='string')network.push({ip:data.ip,ipType:String(data.ipType||''),country:String(data.country||'未知'),colo:String(data.colo||'未知'),cnIspCode:String(data.cnIspCode||''),endpoint:`https://${label}.${host}`});}catch{/* Other stack or endpoint may still work. */}}));if(network.length)return {host,network};}
  throw Error('公共探测域名不可读取，可能受 DNS / TLS / CORS 限制；可更换域名或使用本地工具');
}
export function sortResults(rows:Result[],key:'latency'|'speed'|'address',descending=false){return [...rows].sort((a,b)=>{const dir=descending?-1:1;if(key==='address')return a.address.localeCompare(b.address)*dir;const av=a[key],bv=b[key];if(av===undefined)return bv===undefined?0:1;if(bv===undefined)return -1;return (av-bv)*dir;});}

export interface Location { iata:string; cca2:string }
export function locationCountry(colo:string,locations:Location[]){return locations.find(l=>l.iata.toUpperCase()===colo.toUpperCase())?.cca2||'未知';}
export async function loadLocations(network:NetworkInfo[],signal:AbortSignal,deps:Dependencies):Promise<Location[]>{
  const endpoints=[...new Set(network.map(n=>n.endpoint).filter((e):e is string=>!!e))];
  return Promise.any(endpoints.map(endpoint=>scoped(signal,8000,async s=>{const response=await deps.fetch(`${endpoint}/locations`,{signal:s,cache:'no-store'});readable(response);const data:unknown=await response.json();if(!Array.isArray(data))throw Error('locations 格式无效');return data.filter((item):item is Location=>!!item&&typeof item==='object'&&typeof item.iata==='string'&&typeof item.cca2==='string');}))).catch(()=>[]);
}

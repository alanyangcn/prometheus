// Catalogue workflow derived from cmliu/edgetunnel (GPL-2.0).
export const toolsSource='https://raw.githubusercontent.com/cmliu/cmliu/refs/heads/main/json/best-cf-tools.json';
export interface LocalTool {id:string;name:string;author:string;description:string;url:string;platforms:string[];ui:string[];stars:number;download?:string}
const text=(v:unknown)=>typeof v==='string'?v:'';
const strings=(v:unknown)=>Array.isArray(v)?v.filter((s):s is string=>typeof s==='string').map(s=>s.trim().toLowerCase()):[];
function safeUrl(value:unknown){try{const url=new URL(text(value));return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}}
export function parseTools(data:unknown):LocalTool[]{if(!data||typeof data!=='object'||!('projects' in data)||!Array.isArray(data.projects))throw Error('工具目录格式无效');return data.projects.filter((p):p is Record<string,unknown>=>!!p&&typeof p==='object').map(p=>({id:text(p.id),name:text(p.name)||'未命名工具',author:text(p.author),description:text(p.description),url:safeUrl(p.url),platforms:strings(p.platforms),ui:strings(p.ui),stars:Number.isFinite(Number(p.stars))?Math.max(0,Number(p.stars)):0,download:safeUrl(p.download_url)||undefined}));}
export function filterTools(tools:LocalTool[],ui='all',platform=''){return tools.filter(t=>(ui==='all'||t.ui.includes(ui))&&(!platform||t.platforms.includes(platform))).sort((a,b)=>b.stars-a.stars);}
export function appendSelections(existing:string,lines:string[],replace=false){const fresh=lines.map(s=>s.trim()).filter(Boolean).join('\n');return replace?fresh:[existing.trim(),fresh].filter(Boolean).join('\n');}
export function formatSelection(result:{address:string;country:string;type:string;latency?:number;speed?:number}){const details=[`${result.latency??'未知'}ms`];if(result.speed!==undefined&&result.speed>0)details.push(`${result.speed.toFixed(2)}Mbps`);return `${result.address}#${result.country} ${result.type}[${details.join(' ')}]`;}

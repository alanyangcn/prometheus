import { appendSelections, formatSelection } from '../src/features/optimizer/catalogue';
import { describe, expect, it, vi } from 'vitest';
import { candidates, csv, discoverNetwork, latency, loadLocations, locationCountry, pool, preferredType, probeUrl, sortResults, speed, type Dependencies, type Result } from '../src/features/optimizer/core';
const candidate=candidates('1.0.0.1')[0];
const result:Result={...candidate,status:'ok',country:'CN',colo:'HKG',type:'官方优选',latency:15};
function dependencies(responses:Response[],times=[0,25]):Dependencies {return {fetch:vi.fn(async()=>{const response=responses.shift();if(!response)throw Error('Unexpected request');return response;}) as typeof fetch,now:()=>times.shift()??25};}
describe('browser optimizer',()=>{
  it('parses bounded CIDR/ranges and IPv6 ports without expanding huge subnets',()=>{
    expect(candidates('192.0.2.0/30',3).map(c=>c.ip)).toEqual(['192.0.2.0','192.0.2.1','192.0.2.2']);
    expect(candidates('192.0.2.1-192.0.2.3').length).toBe(3);
    expect(candidates('2606:4700::/32',4)).toHaveLength(4);
    expect(candidates('[2606:4700::1]:8443')[0].port).toBe(8443);
    expect(candidates('example.com:2053#test')[0].family).toBe('domain');
    expect(()=>candidates('192.0.2.1/33')).toThrow();expect(()=>candidates('1.2.3.999')).toThrow();expect(()=>candidates('1.1.1.1:65536')).toThrow();
  });
  it('mirrors BestCF encoded target domains',()=>{expect(probeUrl(candidate,'bestcf.example','ip.json')).toBe('https://01000001.bestcf.example:443/ip.json');});
  it('requires readable successful OPTIONS and valid GET metadata',async()=>{
    const deps=dependencies([new Response(null,{status:204}),Response.json({ip:'203.0.113.1',country:'CN',colo:'HKG',cnIspCode:'ct'})]);
    const output=await latency(candidate,'bestcf.example',500,new AbortController().signal,deps);expect(output.latency).toBe(25);expect(output.type).toBe('电信优选');expect(deps.fetch).toHaveBeenCalledTimes(2);
  });
  it('retries OPTIONS but never accepts opaque or invalid metadata as success',async()=>{
    const opaque=new Response();Object.defineProperty(opaque,'type',{value:'opaque'});
    await expect(latency(candidate,'bestcf.example',500,new AbortController().signal,dependencies([opaque,opaque,opaque]))).rejects.toThrow('不可读取');
    await expect(latency(candidate,'bestcf.example',500,new AbortController().signal,dependencies([new Response(null,{status:204}),Response.json({})]))).rejects.toThrow('元数据');
  });
  it('times out hanging injected requests and cancels without waiting for a remote response',async()=>{
    vi.useFakeTimers();try{const deps:Dependencies={fetch:vi.fn(()=>new Promise<Response>(()=>{})) as typeof fetch,now:()=>0};
      const timeout=latency(candidate,'bestcf.example',100,new AbortController().signal,deps);const timeoutAssertion=expect(timeout).rejects.toThrow('超时');await vi.advanceTimersByTimeAsync(600);await timeoutAssertion;
      const controller=new AbortController();const cancelled=latency(candidate,'bestcf.example',100,controller.signal,deps);const cancelledAssertion=expect(cancelled).rejects.toThrow('取消');controller.abort();await cancelledAssertion;
    }finally{vi.useRealTimers();}
  });
  it('measures downloaded bytes and rejects empty responses',async()=>{
    expect(await speed(candidate,'bestcf.example',new AbortController().signal,dependencies([new Response(new Uint8Array(1000))],[0,100,100]))).toBe(.08);
    await expect(speed(candidate,'bestcf.example',new AbortController().signal,dependencies([new Response(new Uint8Array())]))).rejects.toThrow('字节');
  });
  it('bounds concurrency and stops scheduling new work when cancelled',async()=>{const controller=new AbortController();const touched:number[]=[];await pool([1,2,3,4],1,controller.signal,async n=>{touched.push(n);controller.abort();});expect(touched).toEqual([1]);
    let active=0,max=0;await pool([1,2,3,4],2,new AbortController().signal,async()=>{active++;max=Math.max(max,active);await Promise.resolve();active--;});expect(max).toBe(2);
  });
  it('discovers working hosts and classifies matching network exits',async()=>{const network={ip:'203.0.113.2',ipType:'ipv4',country:'CN',colo:'HKG',cnIspCode:'cu'};const deps:Dependencies={fetch:vi.fn(async(url)=>String(url).includes('good.example')?Response.json(network):new Response(null,{status:503})) as typeof fetch,now:()=>0};const found=await discoverNetwork(['bad.example','good.example'],new AbortController().signal,deps);expect(found.host).toBe('good.example');expect(preferredType({ip:network.ip,country:'US'},found.network)).toBe('联通优选');});
  it('keeps missing numeric measurements last in both sort directions',()=>{const missing={...result,address:'missing',speed:undefined};expect(sortResults([{...result,speed:1},missing],'speed',true)[1].address).toBe('missing');expect(sortResults([{...result,speed:1},missing],'speed')[1].address).toBe('missing');});
  it('appends selection preserving existing addresses and supports explicit replace',()=>{expect(appendSelections('old.example#keep', ['1.1.1.1:443#new'])).toBe('old.example#keep\n1.1.1.1:443#new');expect(appendSelections('old', ['new'],true)).toBe('new');expect(formatSelection({...result,speed:8})).toBe('1.0.0.1:443#CN 官方优选[15ms 8.00Mbps]');});
  it('loads location metadata from discovered endpoint without inventing unknown regions',async()=>{const locations=await loadLocations([{ip:'1.1.1.1',ipType:'ipv4',country:'CN',colo:'HKG',cnIspCode:'ct',endpoint:'https://test.example'}],new AbortController().signal,dependencies([Response.json([{iata:'HKG',cca2:'HK'},{bad:'data'}])]));expect(locationCountry('hkg',locations)).toBe('HK');expect(locationCountry('UNKNOWN',locations)).toBe('未知');});
  it('exports CSV safely with quote and formula escaping',()=>{const output=csv([{...result,colo:'=HYPERLINK("x")'}]);expect(output).toContain("' =".replace(' ',''));expect(output).toContain('""x""');});
});

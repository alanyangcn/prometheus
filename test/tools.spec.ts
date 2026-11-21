import { afterEach, describe, expect, it, vi } from 'vitest';
import { tools } from '../server/api/tools';
import { converterBaseURL, converterKey, saveVerifiedConverter } from '../src/features/tools/converter';
import { normalizeIP, locationMap } from '../src/features/tools/ip';
import { chainLine, parseChainInput } from '../src/features/tools/chain';
const env = { STORAGE: { get: async () => null } };
async function tool(action: string, data: unknown = {}, runtime: unknown = {}) { return tools(new Request(`https://example.com/api/tools/${action}`, { method: 'POST', body: JSON.stringify(data) }), env as any, runtime as any, {} as any); }
afterEach(() => vi.unstubAllGlobals());
describe('Controlled administration tools', () => {
  it('retires public proxy discovery and remote path presets without contacting external services', async () => {
    const request = vi.fn().mockResolvedValue(Response.json([]));
    vi.stubGlobal('fetch', request);
    for (const action of ['proxy-directory', 'proxyip-check', 'path-presets']) {
      const response = await tool(action, { type: 'socks5', address: '203.0.113.1' });
      expect(response!.status).toBe(404);
    }
    expect(request).not.toHaveBeenCalled();
  });
  it('returns only current-request network metadata with no credentials', async () => { const request = new Request('https://example.com/api/tools/network-info', { method: 'POST', headers: { 'CF-Connecting-IP': '203.0.113.1', Cookie: 'private-cookie', Authorization: 'private-token' }, body: '{}' }); Object.defineProperty(request, 'cf', {value:{colo:'SIN',country:'SG',asOrganization:'Test ASN',httpProtocol:'HTTP/2',tlsVersion:'TLSv1.3',privateValue:'secret'}}); const response = await tools(request, env as any, {} as any, {} as any); const output = await response!.json() as any; expect(output.connectingIP).toBe('203.0.113.1'); expect(output.colo).toBe('SIN'); expect(output.httpProtocol).toBe('HTTP/2'); expect(JSON.stringify(output)).not.toMatch(/private|secret/); });
  it('creates exact ADD chain syntax and brackets IPv6', () => { expect(chainLine('example.com','443','test','socks5','socks5://user:pass@proxy:1080')).toBe('example.com:443#test$socks5://user:pass@proxy:1080'); expect(chainLine('2001:db8::1','','','http','proxy:80')).toBe('[2001:db8::1]#链式代理$http://proxy:80'); expect(() => chainLine('example.com','0','test','http','proxy:80')).toThrow(); });
  it('parses pasted proxy URL scheme and encoded name', () => { expect(parseChainInput('/http://user:pass@proxy:80#%E6%B5%8B%E8%AF%95','socks5')).toEqual({scheme:'http',address:'user:pass@proxy:80',name:'测试'}); });
  it('validates converter version without exposing arbitrary HTML', async () => { const fetcher = vi.fn().mockResolvedValue(new Response('subconverter v0.9')); vi.stubGlobal('fetch',fetcher); expect((await tool('converter-check',{baseURL:'https://converter.example/sub'}))!.status).toBe(200); expect(String(fetcher.mock.calls[0][0])).toBe('https://converter.example/version'); expect(fetcher.mock.calls[0][1].redirect).toBe('manual'); fetcher.mockResolvedValue(new Response('<html>login</html>')); expect((await tool('converter-check',{baseURL:'https://converter.example'}))!.status).toBe(400); });



});

describe('IP details and converter presets', () => {
  it('keeps converter presets while retiring path presets', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([{label:'ACL',options:[{label:'Mini',value:'https://config.example/file?variant=mini'},{label:'invalid'}]}])));
    expect(await (await tool('converter-presets'))!.json()).toEqual([{label:'ACL',options:[{label:'Mini',value:'https://config.example/file?variant=mini'}]}]);
  });
  it('preserves query-bearing converter config URLs', async () => {
    const request = vi.fn().mockResolvedValueOnce(new Response('subconverter v1')).mockResolvedValueOnce(new Response('[custom]'));
    vi.stubGlobal('fetch', request);
    expect((await tool('converter-check',{baseURL:'https://converter.example',config:'https://config.example/file?variant=mini'}))!.status).toBe(200);
    expect(String(request.mock.calls[1][0])).toContain('?variant=mini');
  });
  it('retains source IP flags and geography without inferring missing risk fields', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ip:'203.0.113.1',cc:'SG',asn_num:64500,asn_org:'Test',company_name:'Fixture',is_proxy:true})));
    const response = await tool('ip-info', {ip:'203.0.113.1'});
    expect(response!.status).toBe(200);
    const info = await response!.json() as Record<string, unknown>;
    expect(info).toMatchObject({ip:'203.0.113.1',is_proxy:true,location:{country_code:'SG'},asn:{org:'Test'},company:{name:'Fixture'}});
    expect(info.is_abuser).toBeUndefined();
  });
});

describe('Converter save snapshot and source compatibility', () => {
  it('canonicalizes only validated converter workflow backend suffixes', () => { expect(converterBaseURL('https://converter.example/sub')).toBe('https://converter.example'); expect(converterBaseURL('http://converter.example/base/version/')).toBe('http://converter.example/base'); expect(converterBaseURL('https://converter.example/base/?query=1')).toBe('https://converter.example/base'); });
  it('uses immutable verified values and rejects edit during config read', async () => { const key = converterKey('https://converter.example/sub','https://config.example?key=1'); let current = key; const write = vi.fn(); await expect(saveVerifiedConverter({key,baseURL:'https://converter.example',config:'https://config.example?key=1'},() => current,async () => { current = converterKey('https://other.example',''); return {}; },write)).rejects.toThrow('重新验证'); expect(write).not.toHaveBeenCalled(); current = key; await saveVerifiedConverter({key,baseURL:'https://converter.example/sub',config:'https://config.example?key=1'},() => current,async () => ({订阅转换配置:{UDP:true}}),write); expect(write).toHaveBeenCalledWith({订阅转换配置:{UDP:true,SUBAPI:'https://converter.example',SUBCONFIG:'https://config.example?key=1'}}); });
  it('links only finite valid geographic coordinates without credentials', () => { expect(locationMap(normalizeIP({ip:'203.0.113.1',lat:1.3,lon:103.8}))).toBe('https://www.openstreetmap.org/?mlat=1.3&mlon=103.8#map=10/1.3/103.8'); expect(locationMap(normalizeIP({ip:'203.0.113.1',lat:Infinity,lon:0}))).toBeNull(); });
  it('rejects reserved/internal hosts and malformed IP inputs before external requests', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    for (const badURL of ['https://0.0.0.0/sub', 'https://100.64.0.1/sub', 'https://localhost./sub', 'https://intranet/sub']) {
      expect((await tool('converter-check', { baseURL: badURL }))!.status).toBe(400);
    }
    for (const badIP of ['::::', '...', '999.999.999.999', '127.0.0.1', '::1']) {
      expect((await tool('ip-info', { ip: badIP }))!.status).toBe(400);
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('surfaces HTTP status cleanly when upstream returns non-JSON error body to frontend api client', async () => {
    const { api } = await import('../src/api/client');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Service Unavailable', { status: 503 })));
    await expect(api('/api/session')).rejects.toThrow('503');
  });
});

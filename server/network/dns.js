// Derived from cmliu/edgetunnel a8ab111. GPL-2.0; see THIRD_PARTY_NOTICES.md.
export const initializers = [
  (runtime) => {
runtime.forwardataudp = async function forwardataudp(udpChunk, webSocket, respHeader, request, 响应封装器 = null) {
    const 请求数据 = runtime.数据转Uint8Array(udpChunk);
    const 请求字节数 = 请求数据.byteLength;
    runtime.log(`[UDP转发] 收到 DNS 请求: ${请求字节数}B -> 8.8.4.4:53`);
    try {
        const TCP连接 = runtime.创建请求TCP连接器(request);
        const tcpSocket = TCP连接({ hostname: '8.8.4.4', port: 53 });
        let 魏烈思Header = respHeader;
        const writer = tcpSocket.writable.getWriter();
        await writer.write(请求数据);
        runtime.log(`[UDP转发] DNS 请求已写入上游: ${请求字节数}B`);
        writer.releaseLock();
        await tcpSocket.readable.pipeTo(new WritableStream({
            async write(chunk) {
                const 原始响应 = runtime.数据转Uint8Array(chunk);
                runtime.log(`[UDP转发] 收到 DNS 响应: ${原始响应.byteLength}B`);
                const 封装结果 = 响应封装器 ? await 响应封装器(原始响应) : 原始响应;
                const 发送片段列表 = Array.isArray(封装结果) ? 封装结果 : [封装结果];
                if (!发送片段列表.length)
                    return;
                if (webSocket.readyState !== WebSocket.OPEN)
                    return;
                for (const fragment of 发送片段列表) {
                    const 转发响应 = runtime.数据转Uint8Array(fragment);
                    if (!转发响应.byteLength)
                        continue;
                    if (魏烈思Header) {
                        const response = new Uint8Array(魏烈思Header.length + 转发响应.byteLength);
                        response.set(魏烈思Header, 0);
                        response.set(转发响应, 魏烈思Header.length);
                        await runtime.WebSocket发送并等待(webSocket, response.buffer);
                        魏烈思Header = null;
                    }
                    else {
                        await runtime.WebSocket发送并等待(webSocket, 转发响应);
                    }
                }
            },
        }));
    }
    catch (error) {
        runtime.log(`[UDP转发] DNS 转发失败: ${error?.message || error}`);
    }
};
  },
  (runtime) => {
runtime.DoH缓存 = {};
  },
  (runtime) => {
runtime.DoH缓存最大条目 = 256;
  },
  (runtime) => {
runtime.DoH记录类型映射 = { A: 1, NS: 2, CNAME: 5, MX: 15, TXT: 16, AAAA: 28, SRV: 33, HTTPS: 65 };
  },
  (runtime) => {
runtime.queryDns = async function DoH查询(域名, 记录类型, DoH解析服务 = "https://cloudflare-dns.com/dns-query") {
    const 规范化域名 = String(域名 || '').trim().toLowerCase().replace(/\.$/, '');
    const 规范化记录类型 = String(记录类型 || '').trim().toUpperCase();
    const 缓存键 = `${规范化域名}:${规范化记录类型}`;
    const qtype = runtime.DoH记录类型映射[规范化记录类型] || 1;
    const 当前时间戳 = Date.now();
    const 现缓存项 = runtime.DoH缓存[缓存键];
    if (现缓存项 && 当前时间戳 < 现缓存项.过期时间) {
        runtime.log(`[DoH查询] 命中缓存 ${域名} ${记录类型} via ${DoH解析服务}`);
        return 现缓存项.data.map(data => ({ type: qtype, data }));
    }
    const 开始时间 = performance.now();
    runtime.log(`[DoH查询] 开始查询 ${域名} ${记录类型} via ${DoH解析服务}`);
    try {
        const 编码域名 = (name) => {
            const parts = name.endsWith('.') ? name.slice(0, -1).split('.') : name.split('.');
            const bufs = [];
            for (const label of parts) {
                const enc = new TextEncoder().encode(label);
                bufs.push(new Uint8Array([enc.length]), enc);
            }
            bufs.push(new Uint8Array([0]));
            const total = bufs.reduce((s, b) => s + b.length, 0);
            const result = new Uint8Array(total);
            let off = 0;
            for (const b of bufs) {
                result.set(b, off);
                off += b.length;
            }
            return result;
        };
        const qname = 编码域名(规范化域名);
        const query = new Uint8Array(12 + qname.length + 4);
        const qview = new DataView(query.buffer);
        qview.setUint16(0, crypto.getRandomValues(new Uint16Array(1))[0]);
        qview.setUint16(2, 0x0100);
        qview.setUint16(4, 1);
        query.set(qname, 12);
        qview.setUint16(12 + qname.length, qtype);
        qview.setUint16(12 + qname.length + 2, 1);
        runtime.log(`[DoH查询] 发送查询报文 ${域名} via ${DoH解析服务} (type=${qtype}, ${query.length}字节)`);
        const response = await fetch(DoH解析服务, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/dns-message',
                'Accept': 'application/dns-message',
            },
            body: query,
        });
        if (!response.ok) {
            console.warn(`[DoH查询] 请求失败 ${域名} ${记录类型} via ${DoH解析服务} 响应代码:${response.status}`);
            return [];
        }
        const buf = new Uint8Array(await response.arrayBuffer());
        const dv = new DataView(buf.buffer);
        const qdcount = dv.getUint16(4);
        const ancount = dv.getUint16(6);
        runtime.log(`[DoH查询] 收到响应 ${域名} ${记录类型} via ${DoH解析服务} (${buf.length}字节, ${ancount}条应答)`);
        const 解析域名 = (pos) => {
            const labels = [];
            let p = pos, jumped = false, endPos = -1, safe = 128;
            while (p < buf.length && safe-- > 0) {
                const len = buf[p];
                if (len === 0) {
                    if (!jumped)
                        endPos = p + 1;
                    break;
                }
                if ((len & 0xC0) === 0xC0) {
                    if (!jumped)
                        endPos = p + 2;
                    p = ((len & 0x3F) << 8) | buf[p + 1];
                    jumped = true;
                    continue;
                }
                labels.push(new TextDecoder().decode(buf.slice(p + 1, p + 1 + len)));
                p += len + 1;
            }
            if (endPos === -1)
                endPos = p + 1;
            return [labels.join('.'), endPos];
        };
        let offset = 12;
        for (let i = 0; i < qdcount; i++) {
            const [, end] = 解析域名(offset);
            offset = (end) + 4;
        }
        const answers = [];
        for (let i = 0; i < ancount && offset < buf.length; i++) {
            const [name, nameEnd] = 解析域名(offset);
            offset = (nameEnd);
            const type = dv.getUint16(offset);
            offset += 2;
            offset += 2;
            const ttl = dv.getUint32(offset);
            offset += 4;
            const rdlen = dv.getUint16(offset);
            offset += 2;
            const rdata = buf.slice(offset, offset + rdlen);
            offset += rdlen;
            let data;
            if (type === 1 && rdlen === 4) {
                data = `${rdata[0]}.${rdata[1]}.${rdata[2]}.${rdata[3]}`;
            }
            else if (type === 28 && rdlen === 16) {
                const segs = [];
                for (let j = 0; j < 16; j += 2)
                    segs.push(((rdata[j] << 8) | rdata[j + 1]).toString(16));
                data = segs.join(':');
            }
            else if (type === 16) {
                let tOff = 0;
                const parts = [];
                while (tOff < rdlen) {
                    const tLen = rdata[tOff++];
                    parts.push(new TextDecoder().decode(rdata.slice(tOff, tOff + tLen)));
                    tOff += tLen;
                }
                data = parts.join('');
            }
            else if (type === 5) {
                const [cname] = 解析域名(offset - rdlen);
                data = cname;
            }
            else {
                data = Array.from(rdata).map(b => b.toString(16).padStart(2, '0')).join('');
            }
            answers.push({ name, type, TTL: ttl, data, rdata });
        }
        const 耗时 = (performance.now() - 开始时间).toFixed(2);
        runtime.log(`[DoH查询] 查询完成 ${域名} ${记录类型} via ${DoH解析服务} ${耗时}ms 共${answers.length}条结果${answers.length > 0 ? '\n' + answers.map((a, i) => `  ${i + 1}. ${a.name} type=${a.type} TTL=${a.TTL} data=${a.data}`).join('\n') : ''}`);
        const 相关记录 = answers.filter(answer => answer.type === qtype);
        const 最小TTL = 相关记录.length > 0 ? Math.min(...相关记录.map(a => a.TTL)) : 0;
        const 缓存TTL = Math.max(最小TTL, 5 * 60);
        const 缓存过期时间 = Date.now() + 缓存TTL * 1000;
        const 缓存数据 = 相关记录.map(answer => answer.data);
        if (缓存数据.length > 0 || answers.length === 0) {
            if (Object.keys(runtime.DoH缓存).length >= runtime.DoH缓存最大条目) {
                const 清理时间戳 = Date.now();
                for (const [缓存条目键, 缓存条目] of Object.entries(runtime.DoH缓存)) {
                    if (清理时间戳 >= 缓存条目.过期时间)
                        delete runtime.DoH缓存[缓存条目键];
                }
                if (Object.keys(runtime.DoH缓存).length >= runtime.DoH缓存最大条目) {
                    delete runtime.DoH缓存[Object.keys(runtime.DoH缓存)[0]];
                }
            }
            runtime.DoH缓存[缓存键] = { data: 缓存数据, 过期时间: 缓存过期时间 };
            runtime.log(`[DoH查询] 写入缓存 ${域名} ${记录类型} TTL=${缓存TTL}s${缓存数据.length === 0 ? '（空结果）' : ''}`);
        }
        return answers;
    }
    catch (error) {
        const 耗时 = (performance.now() - 开始时间).toFixed(2);
        console.error(`[DoH查询] 查询失败 ${域名} ${记录类型} via ${DoH解析服务} ${耗时}ms:`, error);
        return [];
    }
};
  }
];

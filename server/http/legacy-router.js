// Derived from cmliu/edgetunnel a8ab111. GPL-2.0; see THIRD_PARTY_NOTICES.md.
export const initializers = [
  (runtime) => {
runtime.worker = {
    async fetch(request, env, ctx) {
        let 请求URL文本 = request.url.replace(/%5[Cc]/g, '').replace(/\\/g, '');
        const 请求URL锚点索引 = 请求URL文本.indexOf('#');
        const 请求URL主体部分 = 请求URL锚点索引 === -1 ? 请求URL文本 : 请求URL文本.slice(0, 请求URL锚点索引);
        if (!请求URL主体部分.includes('?') && /%3f/i.test(请求URL主体部分)) {
            const 请求URL锚点部分 = 请求URL锚点索引 === -1 ? '' : 请求URL文本.slice(请求URL锚点索引);
            请求URL文本 = 请求URL主体部分.replace(/%3f/i, '?') + 请求URL锚点部分;
        }
        const url = new URL(请求URL文本);
        const UA = request.headers.get('User-Agent') || 'null';
        const upgradeHeader = (request.headers.get('Upgrade') || '').toLowerCase(), contentType = (request.headers.get('content-type') || '').toLowerCase();
        const 管理员密码 = env.ADMIN || env.admin || env.PASSWORD || env.password || env.pswd || env.TOKEN || env.KEY || env.UUID || env.uuid;
        const 加密秘钥 = env.KEY || '勿动此默认密钥，有需求请自行通过添加变量KEY进行修改';
        const userIDMD5 = await runtime.hashIdentity(管理员密码 + 加密秘钥);
        const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
        const envUUID = env.UUID || env.uuid;
        const userID = (envUUID && uuidRegex.test(envUUID)) ? envUUID.toLowerCase() : [userIDMD5.slice(0, 8), userIDMD5.slice(8, 12), '4' + userIDMD5.slice(13, 16), '8' + userIDMD5.slice(17, 20), userIDMD5.slice(20)].join('-');
        const hosts = env.HOST ? (await runtime.splitList(env.HOST)).map(h => h.toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split(':')[0]) : [url.hostname];
        const host = hosts[0];
        const 访问路径 = url.pathname.slice(1).toLowerCase();
        runtime.调试日志打印 = ['1', 'true'].includes(env.DEBUG) || runtime.调试日志打印;
        runtime.预加载竞速拨号 = ['1', 'true'].includes(env.PRELOAD_RACE_DIAL) || runtime.预加载竞速拨号;
        runtime.反代并发拨号数 = Math.max(1, Number(env.PROXY_CONCURRENT_DIAL) || runtime.反代并发拨号数);
        runtime.TCP并发拨号数 = Math.max(1, Number(env.TCP_CONCURRENT_DIAL) || runtime.TCP并发拨号数);
        if (!env.TCP_CONCURRENT_DIAL && runtime.TCP并发拨号数 !== 1 && runtime.识别运营商(request) === 'cmcc')
            runtime.TCP并发拨号数 = 1;
        let 默认反代IP = (`${(request.cf || {}).colo}.${runtime.特征码字典[0]}.${runtime.特征码字典[1]}SsSs.nEt`).toLowerCase(), 默认反代兜底 = true;
        if (env.PROXYIP) {
            const proxyIPs = await runtime.splitList(env.PROXYIP);
            默认反代IP = proxyIPs[Math.floor(Math.random() * proxyIPs.length)];
            默认反代兜底 = false;
        }
        ;
        const 访问IP = request.headers.get('CF-Connecting-IP') || request.headers.get('True-Client-IP') || request.headers.get('X-Real-IP') || request.headers.get('X-Forwarded-For') || request.headers.get('Fly-Client-IP') || request.headers.get('X-Appengine-Remote-Addr') || request.headers.get('X-Cluster-Client-IP') || '未知IP';
        const [本机标识头, 本机标识键] = runtime.获取本机标识(userID);
        if (runtime.缓存SOCKS5白名单 === null) {
            if (env.GO2SOCKS5)
                runtime.SOCKS5白名单 = [...new Set(runtime.SOCKS5白名单.concat(await runtime.splitList(env.GO2SOCKS5)))];
            runtime.缓存SOCKS5白名单 = runtime.SOCKS5白名单;
        }
        else
            runtime.SOCKS5白名单 = runtime.缓存SOCKS5白名单;
        if (访问路径 === 'version') {
            const 请求UUID = (url.searchParams.get('uuid') || '').toLowerCase();
            if (uuidRegex.test(请求UUID)) {
                const 目标UUID = String(userID).toLowerCase();
                let 请求前8总和 = 0, 目标前8总和 = 0;
                for (let i = 0; i < 8; i++) {
                    const 请求码 = 请求UUID.charCodeAt(i);
                    请求前8总和 += 请求码 <= 57 ? 请求码 - 48 : 请求码 - 87;
                    const 目标码 = 目标UUID.charCodeAt(i);
                    目标前8总和 += 目标码 <= 57 ? 目标码 - 48 : 目标码 - 87;
                }
                if (请求前8总和 === 目标前8总和 && 请求UUID.slice(-12) === 目标UUID.slice(-12))
                    return new Response(JSON.stringify({ Version: runtime.EDT_版本号 }), { status: 200, headers: { 'Content-Type': 'application/json;charset=utf-8' } });
            }
        }
        else if (管理员密码 && upgradeHeader === 'websocket') {
            const 反代上下文 = await runtime.resolveProxyContext(url, userID, 默认反代IP, 默认反代兜底);
            runtime.log(`[WebSocket] 命中请求: ${url.pathname}${url.search}`);
            return await runtime.handleWebSocket(request, userID, url, 反代上下文);
        }
        else if (管理员密码 && !访问路径.startsWith('admin/') && 访问路径 !== 'login' && request.method === 'POST') {
            const 反代上下文 = await runtime.resolveProxyContext(url, userID, 默认反代IP, 默认反代兜底);
            const 命中叉HTTP特征 = !!request.headers.get(本机标识头) || !!url.searchParams.get(本机标识键);
            if (!命中叉HTTP特征 && contentType.startsWith('application/grpc')) {
                runtime.log(`[gRPC] 命中请求: ${url.pathname}${url.search}`);
                return await runtime.handleGrpc(request, userID, 反代上下文);
            }
            runtime.log(`[叉HTTP] 命中请求: ${url.pathname}${url.search}`);
            return await runtime.handleXhttp(request, userID, 反代上下文);
        }
        else {
            if (url.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(url.hostname))
                return Response.redirect(url.href.replace(`http://${url.hostname}`, `https://${url.hostname}`), 301);
            if (!管理员密码)
                return runtime.serveApp(request, '/setup').then(r => { const headers = new Headers(r.headers); headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate'); headers.set('Pragma', 'no-cache'); headers.set('Expires', '0'); return new Response(r.body, { status: 404, statusText: r.statusText, headers }); });
            if (env.KV && typeof env.KV.get === 'function') {
                const 区分大小写访问路径 = url.pathname.slice(1);
                if (区分大小写访问路径 === 加密秘钥 && 加密秘钥 !== '勿动此默认密钥，有需求请自行通过添加变量KEY进行修改') {
                    const params = new URLSearchParams(url.search);
                    params.set('token', await runtime.hashIdentity(host + userID));
                    return new Response('重定向中...', { status: 302, headers: { 'Location': `/sub?${params.toString()}` } });
                }
                else if (访问路径 === 'login') {
                    const cookies = request.headers.get('Cookie') || '';
                    const authCookie = cookies.split(';').find(c => c.trim().startsWith('auth='))?.split('=')[1];
                    if (authCookie == await runtime.hashIdentity(UA + 加密秘钥 + 管理员密码))
                        return new Response('重定向中...', { status: 302, headers: { 'Location': '/admin' } });
                    if (request.method === 'POST') {
                        const formData = await request.text();
                        const params = new URLSearchParams(formData);
                        const 输入密码 = params.get('password');
                        if (输入密码 === (typeof 管理员密码 === 'string' ? 管理员密码.replace(/[\r\n]/g, '') : 管理员密码)) {
                            const 响应 = new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json;charset=utf-8' } });
                            响应.headers.set('Set-Cookie', `auth=${await runtime.hashIdentity(UA + 加密秘钥 + 管理员密码)}; Path=/; Max-Age=86400; HttpOnly; Secure; SameSite=Lax`);
                            return 响应;
                        }
                    }
                    return runtime.serveApp(request, '/login');
                }
                else if (访问路径 === 'admin' || 访问路径.startsWith('admin/')) {
                    const cookies = request.headers.get('Cookie') || '';
                    const authCookie = cookies.split(';').find(c => c.trim().startsWith('auth='))?.split('=')[1];
                    if (!authCookie || authCookie !== await runtime.hashIdentity(UA + 加密秘钥 + 管理员密码))
                        return new Response('重定向中...', { status: 302, headers: { 'Location': '/login' } });
                    if (访问路径 === 'admin/log.json') {
                        const 读取日志内容 = await env.KV.get('log.json') || '[]';
                        return new Response(读取日志内容, { status: 200, headers: { 'Content-Type': 'application/json;charset=utf-8' } });
                    }
                    else if (区分大小写访问路径 === 'admin/getADDAPI') {
                        if (url.searchParams.get('url')) {
                            const 待验证优选URL = url.searchParams.get('url');
                            try {
                                new URL(待验证优选URL);
                                const 请求优选API内容 = await runtime.fetchAddressSources([待验证优选URL], url.searchParams.get('port') || '443', 本机标识头);
                                let 优选API的IP = 请求优选API内容[0].length > 0 ? 请求优选API内容[0] : 请求优选API内容[1];
                                优选API的IP = 优选API的IP.map(item => item.replace(/#(.+)$/, (_, remark) => '#' + decodeURIComponent(remark)));
                                return new Response(JSON.stringify({ success: true, data: 优选API的IP }, null, 2), { status: 200, headers: { 'Content-Type': 'application/json;charset=utf-8' } });
                            }
                            catch (err) {
                                const errorResponse = { msg: '验证优选API失败，失败原因：' + err.message, error: err.message };
                                return new Response(JSON.stringify(errorResponse, null, 2), { status: 500, headers: { 'Content-Type': 'application/json;charset=utf-8' } });
                            }
                        }
                        return new Response(JSON.stringify({ success: false, data: [] }, null, 2), { status: 403, headers: { 'Content-Type': 'application/json;charset=utf-8' } });
                    }
                    else if (访问路径 === 'admin/check') {
                        const 代理协议 = ['socks5', 'http', 'https', 'turn', 'sstp'].find(类型 => url.searchParams.has(类型)) || null;
                        if (!代理协议)
                            return new Response(JSON.stringify({ error: '缺少代理参数' }), { status: 400, headers: { 'Content-Type': 'application/json;charset=utf-8' } });
                        const 代理参数 = url.searchParams.get(代理协议);
                        const startTime = Date.now();
                        let 检测代理响应;
                        try {
                            const checkParsed = await runtime.parseProxyAddress(代理参数, runtime.proxyDefaultPort(代理协议));
                            const { username, password, hostname, port } = checkParsed;
                            const 完整代理参数 = username && password ? `${username}:${password}@${hostname}:${port}` : `${hostname}:${port}`;
                            try {
                                const 检测主机 = 'cloudflare.com', 检测端口 = 443, encoder = new TextEncoder(), decoder = new TextDecoder();
                                const TCP连接 = runtime.创建请求TCP连接器(request);
                                let tcpSocket = null, tlsSocket = null;
                                try {
                                    tcpSocket = 代理协议 === 'socks5'
                                        ? await runtime.socks5Connect(检测主机, 检测端口, new Uint8Array(0), TCP连接, checkParsed)
                                        : 代理协议 === 'turn'
                                            ? await runtime.turnConnect(checkParsed, 检测主机, 检测端口, TCP连接)
                                            : 代理协议 === 'sstp'
                                                ? await runtime.sstpConnect(checkParsed, 检测主机, 检测端口, TCP连接)
                                                : (代理协议 === 'https' && runtime.isIPHostname(hostname)
                                                    ? await runtime.httpsConnect(检测主机, 检测端口, new Uint8Array(0), TCP连接, checkParsed)
                                                    : await runtime.httpConnect(检测主机, 检测端口, new Uint8Array(0), 代理协议 === 'https', TCP连接, checkParsed));
                                    if (!tcpSocket)
                                        throw new Error('无法连接到代理服务器');
                                    tlsSocket = new runtime.TlsClient(tcpSocket, { serverName: 检测主机, insecure: true });
                                    await tlsSocket.handshake();
                                    await tlsSocket.write(encoder.encode(`GET /cdn-cgi/trace HTTP/1.1\r\nHost: ${检测主机}\r\nUser-Agent: Mozilla/5.0\r\nConnection: close\r\n\r\n`));
                                    let responseBuffer = new Uint8Array(0), headerEndIndex = -1, contentLength = null, chunked = false;
                                    const 最大响应字节 = 64 * 1024;
                                    while (responseBuffer.length < 最大响应字节) {
                                        const value = await tlsSocket.read();
                                        if (!value)
                                            break;
                                        if (value.byteLength === 0)
                                            continue;
                                        responseBuffer = runtime.拼接字节数据(responseBuffer, value);
                                        if (headerEndIndex === -1) {
                                            const crlfcrlf = responseBuffer.findIndex((_, i) => i < responseBuffer.length - 3 && responseBuffer[i] === 0x0d && responseBuffer[i + 1] === 0x0a && responseBuffer[i + 2] === 0x0d && responseBuffer[i + 3] === 0x0a);
                                            if (crlfcrlf !== -1) {
                                                headerEndIndex = crlfcrlf + 4;
                                                const headers = decoder.decode(responseBuffer.slice(0, headerEndIndex));
                                                const statusLine = headers.split('\r\n')[0] || '';
                                                const statusMatch = statusLine.match(/HTTP\/\d\.\d\s+(\d+)/);
                                                const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : NaN;
                                                if (!Number.isFinite(statusCode) || statusCode < 200 || statusCode >= 300)
                                                    throw new Error(`代理检测请求失败: ${statusLine || '无效响应'}`);
                                                const lengthMatch = headers.match(/\r\nContent-Length:\s*(\d+)/i);
                                                if (lengthMatch)
                                                    contentLength = parseInt(lengthMatch[1], 10);
                                                chunked = /\r\nTransfer-Encoding:\s*chunked/i.test(headers);
                                            }
                                        }
                                        if (headerEndIndex !== -1 && contentLength !== null && responseBuffer.length >= headerEndIndex + contentLength)
                                            break;
                                        if (headerEndIndex !== -1 && chunked && decoder.decode(responseBuffer).includes('\r\n0\r\n\r\n'))
                                            break;
                                    }
                                    if (headerEndIndex === -1)
                                        throw new Error('代理检测响应头过长或无效');
                                    const response = decoder.decode(responseBuffer);
                                    const ip = response.match(/(?:^|\n)ip=(.*)/)?.[1];
                                    const loc = response.match(/(?:^|\n)loc=(.*)/)?.[1];
                                    if (!ip || !loc)
                                        throw new Error('代理检测响应无效');
                                    检测代理响应 = { success: true, proxy: 代理协议 + "://" + 完整代理参数, ip, loc, responseTime: Date.now() - startTime };
                                }
                                finally {
                                    try {
                                        tlsSocket ? tlsSocket.close() : await tcpSocket?.close?.();
                                    }
                                    catch (e) { }
                                }
                            }
                            catch (error) {
                                检测代理响应 = { success: false, error: error.message, proxy: 代理协议 + "://" + 完整代理参数, responseTime: Date.now() - startTime };
                            }
                        }
                        catch (err) {
                            检测代理响应 = { success: false, error: err.message, proxy: 代理协议 + "://" + 代理参数, responseTime: Date.now() - startTime };
                        }
                        return new Response(JSON.stringify(检测代理响应, null, 2), { status: 200, headers: { 'Content-Type': 'application/json;charset=utf-8' } });
                    }
                    runtime.config_JSON = await runtime.readConfig(env, host, userID, UA);
                    if (访问路径 === 'admin/init') {
                        try {
                            runtime.config_JSON = await runtime.readConfig(env, host, userID, UA, true);
                            ctx.waitUntil(runtime.recordLog(env, request, 访问IP, 'Init_Config', runtime.config_JSON));
                            runtime.config_JSON.init = '配置已重置为默认值';
                            return new Response(JSON.stringify(runtime.config_JSON, null, 2), { status: 200, headers: { 'Content-Type': 'application/json;charset=utf-8' } });
                        }
                        catch (err) {
                            const errorResponse = { msg: '配置重置失败，失败原因：' + err.message, error: err.message };
                            return new Response(JSON.stringify(errorResponse, null, 2), { status: 500, headers: { 'Content-Type': 'application/json;charset=utf-8' } });
                        }
                    }
                    else if (request.method === 'POST') {
                        if (访问路径 === 'admin/config.json') {
                            try {
                                const newConfig = await request.json();
                                if (!newConfig.UUID || !newConfig.HOST)
                                    return new Response(JSON.stringify({ error: '配置不完整' }), { status: 400, headers: { 'Content-Type': 'application/json;charset=utf-8' } });
                                await env.KV.put('config.json', JSON.stringify(newConfig, null, 2));
                                ctx.waitUntil(runtime.recordLog(env, request, 访问IP, 'Save_Config', runtime.config_JSON));
                                return new Response(JSON.stringify({ success: true, message: '配置已保存' }), { status: 200, headers: { 'Content-Type': 'application/json;charset=utf-8' } });
                            }
                            catch (error) {
                                console.error('保存配置失败:', error);
                                return new Response(JSON.stringify({ error: '保存配置失败: ' + error.message }), { status: 500, headers: { 'Content-Type': 'application/json;charset=utf-8' } });
                            }
                        }
                        else if (区分大小写访问路径 === 'admin/ADD.txt') {
                            try {
                                const customIPs = await request.text();
                                await env.KV.put('ADD.txt', customIPs);
                                ctx.waitUntil(runtime.recordLog(env, request, 访问IP, 'Save_Custom_IPs', runtime.config_JSON));
                                return new Response(JSON.stringify({ success: true, message: '自定义IP已保存' }), { status: 200, headers: { 'Content-Type': 'application/json;charset=utf-8' } });
                            }
                            catch (error) {
                                console.error('保存自定义IP失败:', error);
                                return new Response(JSON.stringify({ error: '保存自定义IP失败: ' + error.message }), { status: 500, headers: { 'Content-Type': 'application/json;charset=utf-8' } });
                            }
                        }
                        else
                            return new Response(JSON.stringify({ error: '不支持的POST请求路径' }), { status: 404, headers: { 'Content-Type': 'application/json;charset=utf-8' } });
                    }
                    else if (访问路径 === 'admin/config.json') {
                        return new Response(JSON.stringify(runtime.config_JSON, null, 2), { status: 200, headers: { 'Content-Type': 'application/json' } });
                    }
                    else if (区分大小写访问路径 === 'admin/ADD.txt') {
                        let 本地优选IP = await env.KV.get('ADD.txt') || 'null';
                        if (本地优选IP == 'null')
                            本地优选IP = (await runtime.generateAddresses(request, runtime.config_JSON.优选订阅生成.本地IP库.随机数量, runtime.config_JSON.优选订阅生成.本地IP库.指定端口))[1];
                        return new Response(本地优选IP, { status: 200, headers: { 'Content-Type': 'text/plain;charset=utf-8', 'asn': (request.cf || {}).asn } });
                    }
                    ctx.waitUntil(runtime.recordLog(env, request, 访问IP, 'Admin_Login', runtime.config_JSON));
                    return runtime.serveApp(request, '/admin');
                }
                else if (访问路径 === 'logout' || uuidRegex.test(访问路径)) {
                    const 响应 = new Response('重定向中...', { status: 302, headers: { 'Location': '/login' } });
                    响应.headers.set('Set-Cookie', 'auth=; Path=/; Max-Age=0; HttpOnly');
                    return 响应;
                }
                else if (访问路径 === 'sub') {
                    const 订阅TOKEN = await runtime.hashIdentity(host + userID), 作为优选订阅生成器 = ['1', 'true'].includes(env.BEST_SUB) && url.searchParams.get('host') === 'example.com' && url.searchParams.get('uuid') === '00000000-0000-4000-8000-000000000000' && UA.toLowerCase().includes('tunnel (https://github.com/' + runtime.特征码字典[1] + '/edge');
                    const 请求TOKEN = url.searchParams.get('token');
                    const 用户客户端请求订阅 = 请求TOKEN === 订阅TOKEN;
                    const 当前日序号 = Math.floor(Date.now() / 86400000);
                    const 订阅转换后端TOKEN种子 = runtime.encodeSecret(订阅TOKEN, userID);
                    const [今日订阅转换后端专属TOKEN, 昨日订阅转换后端专属TOKEN] = await Promise.all([
                        runtime.hashIdentity(订阅转换后端TOKEN种子 + 当前日序号),
                        runtime.hashIdentity(订阅转换后端TOKEN种子 + (当前日序号 - 1)),
                    ]);
                    const 订阅转换后端请求订阅 = 请求TOKEN === 今日订阅转换后端专属TOKEN || 请求TOKEN === 昨日订阅转换后端专属TOKEN;
                    if (用户客户端请求订阅 || 订阅转换后端请求订阅 || 作为优选订阅生成器) {
                        runtime.config_JSON = await runtime.readConfig(env, host, userID, UA);
                        if (作为优选订阅生成器)
                            ctx.waitUntil(runtime.recordLog(env, request, 访问IP, 'Get_Best_SUB', runtime.config_JSON, false));
                        else
                            ctx.waitUntil(runtime.recordLog(env, request, 访问IP, 'Get_SUB', runtime.config_JSON));
                        const ua = UA.toLowerCase();
                        const responseHeaders = {
                            "content-type": "text/plain; charset=utf-8",
                            "Profile-Update-Interval": runtime.config_JSON.优选订阅生成.SUBUpdateTime,
                            "Profile-web-page-url": url.protocol + '//' + url.host + '/admin',
                            "Cache-Control": "no-store",
                        };

                        const isSubConverterRequest = url.searchParams.has('b64') || url.searchParams.has('base64') || request.headers.get('subconverter-request') || request.headers.get('subconverter-version') || ua.includes('subconverter') || ua.includes(('CF-Workers-SUB').toLowerCase()) || 作为优选订阅生成器;
                        const 订阅类型 = isSubConverterRequest
                            ? 'mixed'
                            : url.searchParams.has('target')
                                ? url.searchParams.get('target')
                                : url.searchParams.has('clash') || ua.includes('clash') || ua.includes('meta') || ua.includes('mihomo')
                                    ? 'clash'
                                    : url.searchParams.has('sb') || url.searchParams.has('singbox') || ua.includes('singbox') || ua.includes('sing-box')
                                        ? 'singbox'
                                        : url.searchParams.has('surge') || ua.includes('surge')
                                            ? 'surge&ver=4'
                                            : url.searchParams.has('quanx') || ua.includes('quantumult')
                                                ? 'quanx'
                                                : url.searchParams.has('loon') || ua.includes('loon')
                                                    ? 'loon'
                                                    : 'mixed';
                        if (!ua.includes('mozilla'))
                            responseHeaders["Content-Disposition"] = `attachment; filename*=utf-8''${encodeURIComponent(runtime.config_JSON.优选订阅生成.SUBNAME)}`;
                        const 协议类型 = ((url.searchParams.has('surge') || ua.includes('surge')) && runtime.config_JSON.协议类型 !== 'ss') ? 'tro' + 'jan' : runtime.config_JSON.协议类型;
                        let 订阅内容 = '';
                        if (订阅类型 === 'mixed') {
                            const TLS分片参数 = runtime.config_JSON.TLS分片 == 'Shadowrocket' ? `&fragment=${encodeURIComponent('1,40-60,30-50,tlshello')}` : runtime.config_JSON.TLS分片 == 'Happ' ? `&fragment=${encodeURIComponent('3,1,tlshello')}` : '';
                            let 完整优选IP = [], 其他节点LINK = '', 反代IP池 = [];
                            if (!url.searchParams.has('sub') && runtime.config_JSON.优选订阅生成.local) {
                                const 完整优选列表 = runtime.config_JSON.优选订阅生成.本地IP库.随机IP ? (await runtime.generateAddresses(request, runtime.config_JSON.优选订阅生成.本地IP库.随机数量, runtime.config_JSON.优选订阅生成.本地IP库.指定端口))[0] : await env.KV.get('ADD.txt') ? await runtime.splitList(await env.KV.get('ADD.txt')) : (await runtime.generateAddresses(request, runtime.config_JSON.优选订阅生成.本地IP库.随机数量, runtime.config_JSON.优选订阅生成.本地IP库.指定端口))[0];
                                const 优选API = [], 优选IP = [], 其他节点 = [];
                                for (const 元素 of 完整优选列表) {
                                    if (元素.toLowerCase().startsWith('sub://')) {
                                        优选API.push(元素);
                                    }
                                    else {
                                        const 备注位置 = 元素.indexOf('#');
                                        const 地址部分 = 备注位置 > -1 ? 元素.slice(0, 备注位置) : 元素;
                                        const 备注部分 = 备注位置 > -1 ? 元素.slice(备注位置) : '';
                                        const subMatch = 元素.match(/sub\s*=\s*([^\s&#]+)/i);
                                        if (subMatch && subMatch[1].trim().includes('.')) {
                                            const 优选IP作为反代IP = 元素.toLowerCase().includes('proxyip=true');
                                            if (优选IP作为反代IP)
                                                优选API.push('sub://' + subMatch[1].trim() + "?proxyip=true" + (元素.includes('#') ? ('#' + 元素.split('#')[1]) : ''));
                                            else
                                                优选API.push('sub://' + subMatch[1].trim() + (元素.includes('#') ? ('#' + 元素.split('#')[1]) : ''));
                                        }
                                        else if (地址部分.toLowerCase().startsWith('https://')) {
                                            优选API.push(元素);
                                        }
                                        else if (地址部分.toLowerCase().includes('://')) {
                                            if (元素.includes('#')) {
                                                const 地址备注分离 = 元素.split('#');
                                                其他节点.push(地址备注分离[0] + '#' + encodeURIComponent(decodeURIComponent(地址备注分离[1])));
                                            }
                                            else
                                                其他节点.push(元素);
                                        }
                                        else {
                                            if (地址部分.includes('*')) {
                                                优选IP.push(runtime.替换星号为随机字符(地址部分) + 备注部分);
                                            }
                                            else
                                                优选IP.push(元素);
                                        }
                                    }
                                }
                                const 请求优选API内容 = await runtime.fetchAddressSources(优选API, '443', 本机标识头);
                                const 合并其他节点数组 = [...new Set(其他节点.concat(请求优选API内容[1]))];
                                其他节点LINK = 合并其他节点数组.length > 0 ? 合并其他节点数组.join('\n') + '\n' : '';
                                const 优选API的IP = 请求优选API内容[0];
                                反代IP池 = 请求优选API内容[3] || [];
                                完整优选IP = [...new Set(优选IP.concat(优选API的IP))];
                            }
                            else {
                                let 优选订阅生成器HOST = url.searchParams.get('sub') || runtime.config_JSON.优选订阅生成.SUB;
                                const [优选生成器IP数组, 优选生成器其他节点] = await runtime.fetchSubscriptionSource(优选订阅生成器HOST, 本机标识头);
                                完整优选IP = 完整优选IP.concat(优选生成器IP数组);
                                其他节点LINK += 优选生成器其他节点;
                            }
                            const ECHLINK参数 = runtime.config_JSON.ECH ? `&ech=${encodeURIComponent((runtime.config_JSON.ECHConfig.SNI ? runtime.config_JSON.ECHConfig.SNI + '+' : '') + runtime.config_JSON.ECHConfig.DNS)}` : '';
                            const isLoonOrSurge = ua.includes('loon') || ua.includes('surge');
                            const { type: 传输协议, 路径字段名, 域名字段名 } = runtime.transportConfig(runtime.config_JSON);
                            订阅内容 = 其他节点LINK + 完整优选IP.map(原始地址 => {
                                const regex = /^(\[[\da-fA-F:]+\]|[\d.]+|[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*)(?::(\d+))?(?:#(.+))?$/;
                                const match = 原始地址.match(regex);
                                let 节点地址, 节点端口 = "443", 节点备注;
                                if (match) {
                                    节点地址 = match[1];
                                    节点端口 = match[2] ? match[2] : '443';
                                    节点备注 = match[3] || 节点地址;
                                }
                                else {
                                    console.warn(`[订阅内容] 不规范的IP格式已忽略: ${原始地址}`);
                                    return null;
                                }
                                let 完整节点路径 = runtime.config_JSON.完整节点路径;
                                const 链式代理匹配 = 节点备注.match(/\$(socks5|http|https|turn|sstp):\/\/([^#\s]+)/i);
                                if (链式代理匹配) {
                                    try {
                                        const 代理协议 = 链式代理匹配[1].toLowerCase(), 代理参数 = 链式代理匹配[2];
                                        const 链式代理数据 = { type: 代理协议, ...runtime.parseProxyAddress(代理参数, runtime.proxyDefaultPort(代理协议)) };
                                        完整节点路径 = `/video/${runtime.encodeSecret(JSON.stringify(链式代理数据), userID) + (runtime.config_JSON.启用0RTT ? '?ed=2560' : '')}`;
                                        节点备注 = 节点备注.replace(链式代理匹配[0], '').trim() || 节点地址;
                                    }
                                    catch (error) {
                                        console.warn(`[订阅内容] 链式代理解析失败，已忽略该指令: ${链式代理匹配[0]} (${error && error.message ? error.message : error})`);
                                    }
                                }
                                else if (反代IP池.length > 0) {
                                    const 匹配到的反代IP = 反代IP池.find(p => p.includes(节点地址));
                                    if (匹配到的反代IP)
                                        完整节点路径 = (`${runtime.config_JSON.PATH}/proxyip=${匹配到的反代IP}`).replace(/\/\//g, '/') + (runtime.config_JSON.启用0RTT ? '?ed=2560' : '');
                                }
                                if (isLoonOrSurge)
                                    完整节点路径 = 完整节点路径.replace(/,/g, '%2C');
                                if (协议类型 === 'ss' && !作为优选订阅生成器) {
                                    if (!runtime.config_JSON.SS.TLS) {
                                        const TLS端口 = [443, 2053, 2083, 2087, 2096, 8443];
                                        const NOTLS端口 = [80, 2052, 2082, 2086, 2095, 8080];
                                        节点端口 = String(NOTLS端口[TLS端口.indexOf(Number(节点端口))] ?? 节点端口);
                                    }
                                    完整节点路径 = (完整节点路径.includes('?') ? 完整节点路径.replace('?', '?enc=' + runtime.config_JSON.SS.加密方式 + '&') : (完整节点路径 + '?enc=' + runtime.config_JSON.SS.加密方式)).replace(/([=,])/g, '\\$1');
                                    if (!isSubConverterRequest)
                                        完整节点路径 = 完整节点路径 + ';mux=0';
                                    return `${协议类型}://${btoa(runtime.config_JSON.SS.加密方式 + ':00000000-0000-4000-8000-000000000000')}@${节点地址}:${节点端口}?plugin=v2${encodeURIComponent('ray-plugin;mode=websocket;host=example.com;path=' + (runtime.config_JSON.随机路径 ? runtime.随机路径(完整节点路径) : 完整节点路径) + (runtime.config_JSON.SS.TLS ? ';tls' : '')) + ECHLINK参数 + TLS分片参数}#${encodeURIComponent(节点备注)}`;
                                }
                                else {
                                    const 传输路径参数值 = runtime.transportPath(runtime.config_JSON, 完整节点路径, 作为优选订阅生成器);
                                    return `${协议类型}://00000000-0000-4000-8000-000000000000@${节点地址}:${节点端口}?security=tls&type=${传输协议 + ECHLINK参数}&${域名字段名}=example.com&fp=${runtime.config_JSON.Fingerprint}&sni=example.com&${路径字段名}=${encodeURIComponent(传输路径参数值) + TLS分片参数}&encryption=none&alpn=${encodeURIComponent(runtime.config_JSON.ALPN)}#${encodeURIComponent(节点备注)}`;
                                }
                            }).filter(item => item !== null).join('\n');
                        }
                        else {
                            const 订阅转换URL = `${runtime.config_JSON.订阅转换配置.SUBAPI}/sub?target=${订阅类型}&url=${encodeURIComponent(url.protocol + '//' + url.host + '/sub?target=mixed&token=' + 今日订阅转换后端专属TOKEN + '&cnIspCode=' + runtime.识别运营商(request) + (url.searchParams.has('sub') && url.searchParams.get('sub') != '' ? `&sub=${url.searchParams.get('sub')}` : ''))}&config=${encodeURIComponent(runtime.config_JSON.订阅转换配置.SUBCONFIG)}&emoji=${runtime.config_JSON.订阅转换配置.SUBEMOJI}&list=${runtime.config_JSON.订阅转换配置.SUBLIST}&scv=${runtime.config_JSON.跳过证书验证}&xudp=${runtime.config_JSON.订阅转换配置.XUDP}&udp=${runtime.config_JSON.订阅转换配置.UDP}&tls13=${runtime.config_JSON.订阅转换配置.TLS13}&append_type=${runtime.config_JSON.订阅转换配置.APPEND_TYPE}&sort=${runtime.config_JSON.订阅转换配置.SORT}&expand=${runtime.config_JSON.订阅转换配置.EXPAND}`;
                            try {
                                const response = await fetch(订阅转换URL, { headers: { 'User-Agent': 'Subconverter for ' + 订阅类型 + ' edge' + 'tunnel (https://github.com/' + runtime.特征码字典[1] + '/edge' + 'tunnel) Uid/0x' + 本机标识头 + ' Version/' + runtime.EDT_版本号 } });
                                if (response.ok) {
                                    订阅内容 = await response.text();
                                    if (url.searchParams.has('surge') || ua.includes('surge'))
                                        订阅内容 = runtime.patchSurge(订阅内容, url.protocol + '//' + url.host + '/sub?token=' + 订阅TOKEN + '&surge', runtime.config_JSON);
                                }
                                else
                                    return new Response('订阅转换后端异常：' + response.statusText, { status: response.status });
                            }
                            catch (error) {
                                return new Response('订阅转换后端异常：' + error.message, { status: 403 });
                            }
                        }
                        if (!ua.includes('subconverter') && 用户客户端请求订阅) {
                            const 打乱后HOSTS = [...runtime.config_JSON.HOSTS].sort(() => Math.random() - 0.5);
                            let 替换域名计数 = 0, 当前随机HOST = null;
                            订阅内容 = 订阅内容
                                .replace(/00000000-0000-4000-8000-000000000000/g, runtime.config_JSON.UUID)
                                .replace(/MDAwMDAwMDAtMDAwMC00MDAwLTgwMDAtMDAwMDAwMDAwMDAw/g, btoa(runtime.config_JSON.UUID))
                                .replace(/example\.com/g, () => {
                                if (替换域名计数 % 2 === 0) {
                                    const 原始host = 打乱后HOSTS[Math.floor(替换域名计数 / 2) % 打乱后HOSTS.length];
                                    当前随机HOST = runtime.替换星号为随机字符(原始host);
                                }
                                替换域名计数++;
                                return 当前随机HOST;
                            });
                        }
                        if (订阅类型 === 'mixed' && (!ua.includes('mozilla') || url.searchParams.has('b64') || url.searchParams.has('base64')))
                            订阅内容 = btoa(订阅内容);
                        if (订阅类型 === 'singbox') {
                            订阅内容 = await runtime.patchSingbox(订阅内容, runtime.config_JSON);
                            responseHeaders["content-type"] = 'application/json; charset=utf-8';
                        }
                        else if (订阅类型 === 'clash') {
                            订阅内容 = runtime.patchClash(订阅内容, runtime.config_JSON);
                            responseHeaders["content-type"] = 'application/x-yaml; charset=utf-8';
                        }
                        return new Response(订阅内容, { status: 200, headers: responseHeaders });
                    }
                }
                else if (访问路径 === 'locations') {
                    const cookies = request.headers.get('Cookie') || '';
                    const authCookie = cookies.split(';').find(c => c.trim().startsWith('auth='))?.split('=')[1];
                    if (authCookie && authCookie == await runtime.hashIdentity(UA + 加密秘钥 + 管理员密码))
                        return fetch(new Request('https://speed.cloudflare.com/locations', { headers: { 'Referer': 'https://speed.cloudflare.com/' } }));
                }
                else if (访问路径 === 'robots.txt')
                    return new Response('User-agent: *\nDisallow: /', { status: 200, headers: { 'Content-Type': 'text/plain; charset=UTF-8' } });
            }
            else if (!envUUID)
                return runtime.serveApp(request, '/setup').then(r => { const headers = new Headers(r.headers); headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate'); headers.set('Pragma', 'no-cache'); headers.set('Expires', '0'); return new Response(r.body, { status: 404, statusText: r.statusText, headers }); });
        }
        return runtime.serveApp(request, url.pathname);
    }
};
  }
];

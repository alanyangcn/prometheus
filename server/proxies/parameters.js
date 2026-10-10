// Derived from cmliu/edgetunnel a8ab111. GPL-2.0; see THIRD_PARTY_NOTICES.md.
export const initializers = [
  (runtime) => {
runtime.resolveProxyContext = async function 反代参数获取(url, uuid, 默认反代IP = '', 默认反代兜底 = true) {
    const { searchParams } = url;
    const pathname = decodeURIComponent(url.pathname);
    const pathLower = pathname.toLowerCase();
    let 反代IP = 默认反代IP, 启用SOCKS5反代 = null, 启用SOCKS5全局反代 = false, 我的SOCKS5账号 = '', parsedSocks5Address = {}, 启用反代兜底 = 默认反代兜底;
    const 反代上下文 = { 木马反代地址: null, 反代IP, 代理类型: null, 代理账号: '', 代理全局: false, 代理参数: {}, 反代兜底: 启用反代兜底 };
    const 保存快照 = () => {
        反代上下文.反代IP = 反代IP;
        反代上下文.代理类型 = 启用SOCKS5反代;
        反代上下文.代理账号 = 我的SOCKS5账号;
        反代上下文.代理全局 = 启用SOCKS5全局反代;
        反代上下文.代理参数 = { ...parsedSocks5Address };
        反代上下文.反代兜底 = 启用反代兜底;
    };
    const 链式代理路径匹配 = pathname.match(/\/video\/(.+)$/i);
    if (链式代理路径匹配) {
        try {
            const 链式代理明文 = runtime.decodeSecret(链式代理路径匹配[1].replace(/\/+$/, ''), uuid);
            const { type, ...链式代理地址 } = JSON.parse(链式代理明文);
            if (!type || !runtime.反代协议默认端口[String(type).toLowerCase()])
                throw new Error('链式代理类型无效');
            if (!链式代理地址.hostname || !链式代理地址.port)
                throw new Error('链式代理地址缺少 hostname 或 port');
            我的SOCKS5账号 = '';
            反代IP = '链式代理';
            启用反代兜底 = false;
            启用SOCKS5全局反代 = true;
            启用SOCKS5反代 = String(type).toLowerCase();
            parsedSocks5Address = {
                username: 链式代理地址.username,
                password: 链式代理地址.password,
                hostname: 链式代理地址.hostname,
                port: Number(链式代理地址.port)
            };
            if (isNaN(parsedSocks5Address.port))
                throw new Error('链式代理端口无效');
            保存快照();
            return 反代上下文;
        }
        catch (err) {
            console.error('解析链式代理参数失败:', err.message);
        }
    }
    我的SOCKS5账号 = searchParams.get('socks5') || searchParams.get('http') || searchParams.get('https') || searchParams.get('turn') || searchParams.get('sstp') || null;
    启用SOCKS5全局反代 = searchParams.has('globalproxy');
    if (searchParams.get('socks5'))
        启用SOCKS5反代 = 'socks5';
    else if (searchParams.get('http'))
        启用SOCKS5反代 = 'http';
    else if (searchParams.get('https'))
        启用SOCKS5反代 = 'https';
    else if (searchParams.get('turn'))
        启用SOCKS5反代 = 'turn';
    else if (searchParams.get('sstp'))
        启用SOCKS5反代 = 'sstp';
    const 解析代理URL = (值, 强制全局 = true) => {
        const 匹配 = /^(socks5|http|https|turn|sstp):\/\/(.+)$/i.exec(值 || '');
        if (!匹配)
            return false;
        启用SOCKS5反代 = 匹配[1].toLowerCase();
        我的SOCKS5账号 = 匹配[2].split('/')[0];
        if (强制全局)
            启用SOCKS5全局反代 = true;
        return true;
    };
    const 设置反代IP = (值) => {
        反代IP = 值;
        启用SOCKS5反代 = null;
        启用反代兜底 = false;
    };
    const 提取路径值 = (值) => {
        if (!值.includes('://')) {
            const 斜杠索引 = 值.indexOf('/');
            return 斜杠索引 > 0 ? 值.slice(0, 斜杠索引) : 值;
        }
        const 协议拆分 = 值.split('://');
        if (协议拆分.length !== 2)
            return 值;
        const 斜杠索引 = 协议拆分[1].indexOf('/');
        return 斜杠索引 > 0 ? `${协议拆分[0]}://${协议拆分[1].slice(0, 斜杠索引)}` : 值;
    };
    const 木马路径匹配 = /\/trojan=([^?#\s]+)/i.exec(pathname);
    if (木马路径匹配) {
        try {
            反代上下文.木马反代地址 = runtime.解析木马反代地址(木马路径匹配[1].replace(/\/+$/, ''));
        }
        catch (err) {
            console.error('解析木马反代地址失败:', err.message);
            反代上下文.木马反代地址 = null;
        }
    }
    const 查询反代IP = searchParams.get('proxyip');
    if (查询反代IP !== null) {
        if (!解析代理URL(查询反代IP)) {
            设置反代IP(查询反代IP);
            保存快照();
            return 反代上下文;
        }
    }
    else {
        let 匹配 = /\/(socks5?|http|https|turn|sstp):\/?\/?([^/?#\s]+)/i.exec(pathname);
        if (匹配) {
            const 类型 = 匹配[1].toLowerCase();
            启用SOCKS5反代 = 类型 === 'sock' || 类型 === 'socks' ? 'socks5' : 类型;
            我的SOCKS5账号 = 匹配[2].split('/')[0];
            启用SOCKS5全局反代 = true;
        }
        else if ((匹配 = /\/(g?s5|socks5|g?http|g?https|g?turn|g?sstp)=([^/?#\s]+)/i.exec(pathname))) {
            const 类型 = 匹配[1].toLowerCase();
            我的SOCKS5账号 = 匹配[2].split('/')[0];
            启用SOCKS5反代 = 类型.includes('sstp') ? 'sstp' : (类型.includes('turn') ? 'turn' : (类型.includes('https') ? 'https' : (类型.includes('http') ? 'http' : 'socks5')));
            if (类型.startsWith('g'))
                启用SOCKS5全局反代 = true;
        }
        else if ((匹配 = /\/(proxyip[.=]|pyip=|ip=)([^?#\s]+)/.exec(pathLower))) {
            const 路径反代值 = 提取路径值(匹配[2]);
            if (!解析代理URL(路径反代值)) {
                设置反代IP(路径反代值);
                保存快照();
                return 反代上下文;
            }
        }
    }
    if (!我的SOCKS5账号) {
        启用SOCKS5反代 = null;
        保存快照();
        return 反代上下文;
    }
    try {
        parsedSocks5Address = await runtime.parseProxyAddress(我的SOCKS5账号, runtime.proxyDefaultPort(启用SOCKS5反代));
        if (searchParams.get('socks5'))
            启用SOCKS5反代 = 'socks5';
        else if (searchParams.get('http'))
            启用SOCKS5反代 = 'http';
        else if (searchParams.get('https'))
            启用SOCKS5反代 = 'https';
        else if (searchParams.get('turn'))
            启用SOCKS5反代 = 'turn';
        else if (searchParams.get('sstp'))
            启用SOCKS5反代 = 'sstp';
        else
            启用SOCKS5反代 = 启用SOCKS5反代 || 'socks5';
    }
    catch (err) {
        console.error('解析SOCKS5地址失败:', err.message);
        启用SOCKS5反代 = null;
    }
    保存快照();
    return 反代上下文;
};
  },
  (runtime) => {
runtime.反代协议默认端口 = { socks5: 1080, http: 80, https: 443, turn: 3478, sstp: 443 };
  },
  (runtime) => {
runtime.proxyDefaultPort = function 获取代理默认端口(类型) {
    return runtime.反代协议默认端口[String(类型 || '').toLowerCase()] || 80;
};
  },
  (runtime) => {
runtime.SOCKS5账号Base64正则 = /^(?:[A-Z0-9+/]{4})*(?:[A-Z0-9+/]{2}==|[A-Z0-9+/]{3}=)?$/i;
  },
  (runtime) => {
runtime.IPv6方括号正则 = /^\[.*\]$/;
  },
  (runtime) => {
runtime.parseProxyAddress = function 获取SOCKS5账号(address, 默认端口 = 80) {
    address = String(address || '').trim().replace(/^(socks5|http|https|turn|sstp):\/\//i, '').split('#')[0].trim();
    const firstAt = address.lastIndexOf("@");
    if (firstAt !== -1) {
        let auth = address.slice(0, firstAt).replaceAll("%3D", "=");
        if (!auth.includes(":") && runtime.SOCKS5账号Base64正则.test(auth))
            auth = atob(auth);
        address = `${auth}@${address.slice(firstAt + 1)}`;
    }
    const atIndex = address.lastIndexOf("@");
    const hostPart = (atIndex === -1 ? address : address.slice(atIndex + 1)).split('/')[0];
    const authPart = atIndex === -1 ? "" : address.slice(0, atIndex);
    const [username, password] = authPart ? authPart.split(":") : [];
    if (authPart && !password)
        throw new Error('无效的 SOCKS 地址格式：认证部分必须是 "username:password" 的形式');
    let hostname = hostPart, port = 默认端口;
    if (hostPart.includes("]:")) {
        const [ipv6Host, ipv6Port = ""] = hostPart.split("]:");
        hostname = ipv6Host + "]";
        port = Number(ipv6Port.replace(/[^\d]/g, ""));
    }
    else if (!hostPart.startsWith("[")) {
        const parts = hostPart.split(":");
        if (parts.length === 2) {
            hostname = parts[0];
            port = Number(parts[1].replace(/[^\d]/g, ""));
        }
    }
    if (isNaN(port))
        throw new Error('无效的 SOCKS 地址格式：端口号必须是数字');
    if (hostname.includes(":") && !runtime.IPv6方括号正则.test(hostname))
        throw new Error('无效的 SOCKS 地址格式：IPv6 地址必须用方括号括起来，如 [2001:db8::1]');
    return { username, password, hostname, port };
};
  },
  (runtime) => {
runtime.解析地址端口 = async function 解析地址端口(proxyIP, 目标域名 = 'dash.cloudflare.com', UUID = '00000000-0000-4000-8000-000000000000') {
    proxyIP = proxyIP.toLowerCase();
    function 解析地址端口字符串(str) {
        let 地址 = str, 端口 = 443;
        if (str.includes(']:')) {
            const parts = str.split(']:');
            地址 = parts[0] + ']';
            端口 = parseInt(parts[1], 10) || 端口;
        }
        else if ((str.match(/:/g) || []).length === 1 && !str.startsWith('[')) {
            const colonIndex = str.lastIndexOf(':');
            地址 = str.slice(0, colonIndex);
            端口 = parseInt(str.slice(colonIndex + 1), 10) || 端口;
        }
        return [地址, 端口];
    }
    function 解析TXT反代记录(txtData) {
        return txtData.flatMap(data => {
            if (data.startsWith('"') && data.endsWith('"'))
                data = data.slice(1, -1);
            return data.replace(/\\010/g, ',').replace(/\n/g, ',').split(',').map(s => s.trim()).filter(Boolean);
        }).map(prefix => 解析地址端口字符串(prefix));
    }
    const 反代IP数组 = await runtime.splitList(proxyIP);
    let 所有反代数组 = [];
    const ipv4Regex = /^(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
    const ipv6Regex = /^\[?(?:[a-fA-F0-9]{0,4}:){1,7}[a-fA-F0-9]{0,4}\]?$/;
    for (const singleProxyIP of 反代IP数组) {
        let [地址, 端口] = 解析地址端口字符串(singleProxyIP);
        if (singleProxyIP.includes('.tp')) {
            const tpMatch = singleProxyIP.match(/\.tp(\d+)/);
            if (tpMatch)
                端口 = parseInt(tpMatch[1], 10);
        }
        if (ipv4Regex.test(地址) || ipv6Regex.test(地址)) {
            runtime.log(`[反代解析] ${地址} 为IP地址，直接使用`);
            所有反代数组.push([地址, 端口]);
            continue;
        }
        const [txtRecords, aRecords] = await Promise.all([
            runtime.queryDns(地址, 'TXT'),
            runtime.queryDns(地址, 'A')
        ]);
        const txtData = txtRecords.filter(r => r.type === 16).map(r => (r.data));
        const txtAddresses = 解析TXT反代记录(txtData);
        if (txtAddresses.length > 0) {
            runtime.log(`[反代解析] ${地址} 使用TXT记录，共${txtAddresses.length}个结果`);
            所有反代数组.push(...txtAddresses);
            continue;
        }
        const ipv4List = aRecords.filter(r => r.type === 1).map(r => r.data);
        if (ipv4List.length > 0) {
            runtime.log(`[反代解析] ${地址} 未获取到TXT记录，使用A记录，共${ipv4List.length}个结果`);
            所有反代数组.push(...ipv4List.map(ip => [ip, 端口]));
            continue;
        }
        const aaaaRecords = await runtime.queryDns(地址, 'AAAA');
        const ipv6List = aaaaRecords.filter(r => r.type === 28).map(r => `[${r.data}]`);
        if (ipv6List.length > 0) {
            runtime.log(`[反代解析] ${地址} 未获取到TXT和A记录，使用AAAA记录，共${ipv6List.length}个结果`);
            所有反代数组.push(...ipv6List.map(ip => [ip, 端口]));
        }
        else {
            runtime.log(`[反代解析] ${地址} 未获取到TXT、A和AAAA记录，保留原域名`);
            所有反代数组.push([地址, 端口]);
        }
    }
    const 排序后数组 = 所有反代数组.sort((a, b) => a[0].localeCompare(b[0]));
    const 目标根域名 = 目标域名.includes('.') ? 目标域名.split('.').slice(-2).join('.') : 目标域名;
    let 随机种子 = [...(目标根域名 + UUID)].reduce((a, c) => a + c.charCodeAt(0), 0);
    runtime.log(`[反代解析] 随机种子: ${随机种子}\n目标站点: ${目标根域名}`);
    const 洗牌后 = [...排序后数组].sort(() => (随机种子 = (随机种子 * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff - 0.5);
    const 解析结果 = 洗牌后.slice(0, 8);
    runtime.log(`[反代解析] 解析完成 总数: ${解析结果.length}个\n${解析结果.map(([ip, port], index) => `${index + 1}. ${ip}:${port}`).join('\n')}`);
    return 解析结果;
};
  }
];

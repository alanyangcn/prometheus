// Derived from cmliu/edgetunnel a8ab111. GPL-2.0; see THIRD_PARTY_NOTICES.md.
export const initializers = [
  (runtime) => {
runtime.readConfig = async function 读取config_JSON(env, hostname, userID, UA = "Mozilla/5.0", 重置配置 = false) {
    const _p = runtime.特征码字典[0];
    const host = hostname, Ali_DoH = "https://dns.alidns.com/dns-query", ECH_SNI = "cloudflare-ech.com", 占位符 = '{{IP:PORT}}', 初始化开始时间 = performance.now(), 默认配置JSON = {
        TIME: new Date().toISOString(),
        HOST: host,
        HOSTS: [hostname],
        UUID: userID,
        PATH: "/",
        ALPN: "",
        协议类型: "v" + "le" + "ss",
        传输协议: "ws",
        gRPC模式: "gun",
        gRPCUserAgent: UA,
        跳过证书验证: false,
        启用0RTT: false,
        TLS分片: null,
        随机路径: false,
        ECH: false,
        ECHConfig: {
            DNS: Ali_DoH,
            SNI: ECH_SNI,
        },
        SS: {
            加密方式: "aes-128-gcm",
            TLS: true,
        },
        Fingerprint: "chrome",
        优选订阅生成: {
            local: true,
            本地IP库: {
                随机IP: true,
                随机数量: 16,
                指定端口: -1,
            },
            SUB: null,
            SUBNAME: host,
            SUBUpdateTime: 3,
            TOKEN: await runtime.hashIdentity(hostname + userID),
        },
        订阅转换配置: {
            SUBAPI: `https://SUBAPI.${runtime.特征码字典[1]}ssss.net`,
            SUBCONFIG: `https://raw.githubusercontent.com/${runtime.特征码字典[1]}/ACL4SSR/refs/heads/main/Clash/config/ACL4SSR_Online_Mini_MultiMode_CF.ini`,
            SUBEMOJI: false,
            SUBLIST: false,
            UDP: false,
            XUDP: false,
            TLS13: false,
            APPEND_TYPE: false,
            SORT: false,
            EXPAND: true,
        },
        反代: {
            [_p]: "auto",
            SOCKS5: {
                启用: null,
                全局: false,
                账号: '',
                白名单: runtime.SOCKS5白名单,
            },
            路径模板: {
                [_p]: "proxyip=" + 占位符,
                SOCKS5: {
                    全局: "socks5://" + 占位符,
                    标准: "socks5=" + 占位符
                },
                HTTP: {
                    全局: "http://" + 占位符,
                    标准: "http=" + 占位符
                },
                HTTPS: {
                    全局: "https://" + 占位符,
                    标准: "https=" + 占位符
                },
                TURN: {
                    全局: "turn://" + 占位符,
                    标准: "turn=" + 占位符
                },
                SSTP: {
                    全局: "sstp://" + 占位符,
                    标准: "sstp=" + 占位符
                },
            },
        },
    };
    try {
        let configJSON = await env.STORAGE.get('config.json');
        if (!configJSON || 重置配置 == true) {
            await env.STORAGE.put('config.json', JSON.stringify(默认配置JSON, null, 2));
            runtime.config_JSON = 默认配置JSON;
        }
        else {
            runtime.config_JSON = JSON.parse(configJSON);
        }
    }
    catch (error) {
        console.error(`读取config_JSON出错: ${error.message}`);
        runtime.config_JSON = 默认配置JSON;
    }
    if (!runtime.config_JSON.订阅转换配置.SUBLIST)
        runtime.config_JSON.订阅转换配置.SUBLIST = false;
    if (!runtime.config_JSON.订阅转换配置.UDP)
        runtime.config_JSON.订阅转换配置.UDP = false;
    if (!runtime.config_JSON.订阅转换配置.XUDP)
        runtime.config_JSON.订阅转换配置.XUDP = false;
    if (!runtime.config_JSON.订阅转换配置.TLS13)
        runtime.config_JSON.订阅转换配置.TLS13 = false;
    if (!runtime.config_JSON.订阅转换配置.APPEND_TYPE)
        runtime.config_JSON.订阅转换配置.APPEND_TYPE = false;
    if (!runtime.config_JSON.订阅转换配置.SORT)
        runtime.config_JSON.订阅转换配置.SORT = false;
    if (typeof runtime.config_JSON.订阅转换配置.EXPAND !== 'boolean')
        runtime.config_JSON.订阅转换配置.EXPAND = true;
    if (!runtime.config_JSON.gRPCUserAgent)
        runtime.config_JSON.gRPCUserAgent = UA;
    runtime.config_JSON.HOST = host;
    if (!String(runtime.config_JSON.优选订阅生成.SUBNAME || '').trim())
        runtime.config_JSON.优选订阅生成.SUBNAME = host;
    if (!runtime.config_JSON.HOSTS)
        runtime.config_JSON.HOSTS = [hostname];
    if (env.HOST)
        runtime.config_JSON.HOSTS = (await runtime.splitList(env.HOST)).map(h => h.toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split(':')[0]);
    runtime.config_JSON.UUID = userID;
    if (!runtime.config_JSON.随机路径)
        runtime.config_JSON.随机路径 = false;
    if (!runtime.config_JSON.启用0RTT)
        runtime.config_JSON.启用0RTT = false;
    if (env.PATH)
        runtime.config_JSON.PATH = env.PATH.startsWith('/') ? env.PATH : '/' + env.PATH;
    else if (!runtime.config_JSON.PATH)
        runtime.config_JSON.PATH = '/';
    if (!runtime.config_JSON.ALPN)
        runtime.config_JSON.ALPN = "";
    if (!runtime.config_JSON.gRPC模式)
        runtime.config_JSON.gRPC模式 = 'gun';
    if (!runtime.config_JSON.SS)
        runtime.config_JSON.SS = { 加密方式: "aes-128-gcm", TLS: false };
    if (!runtime.config_JSON.反代.路径模板?.[_p]) {
        runtime.config_JSON.反代.路径模板 = {
            [_p]: "proxyip=" + 占位符,
            SOCKS5: {
                全局: "socks5://" + 占位符,
                标准: "socks5=" + 占位符
            },
            HTTP: {
                全局: "http://" + 占位符,
                标准: "http=" + 占位符
            },
            HTTPS: {
                全局: "https://" + 占位符,
                标准: "https=" + 占位符
            },
            TURN: {
                全局: "turn://" + 占位符,
                标准: "turn=" + 占位符
            },
            SSTP: {
                全局: "sstp://" + 占位符,
                标准: "sstp=" + 占位符
            },
        };
    }
    if (!runtime.config_JSON.反代.路径模板.HTTPS)
        runtime.config_JSON.反代.路径模板.HTTPS = { 全局: "https://" + 占位符, 标准: "https=" + 占位符 };
    if (!runtime.config_JSON.反代.路径模板.TURN)
        runtime.config_JSON.反代.路径模板.TURN = { 全局: "turn://" + 占位符, 标准: "turn=" + 占位符 };
    if (!runtime.config_JSON.反代.路径模板.SSTP)
        runtime.config_JSON.反代.路径模板.SSTP = { 全局: "sstp://" + 占位符, 标准: "sstp=" + 占位符 };
    const 代理配置 = runtime.config_JSON.反代.路径模板[runtime.config_JSON.反代.SOCKS5.启用?.toUpperCase()];
    let 路径反代参数 = '';
    if (代理配置 && runtime.config_JSON.反代.SOCKS5.账号)
        路径反代参数 = (runtime.config_JSON.反代.SOCKS5.全局 ? 代理配置.全局 : 代理配置.标准).replace(占位符, runtime.config_JSON.反代.SOCKS5.账号);
    else if (runtime.config_JSON.反代[_p] !== 'auto')
        路径反代参数 = runtime.config_JSON.反代.路径模板[_p].replace(占位符, runtime.config_JSON.反代[_p]);
    let 反代查询参数 = '';
    if (路径反代参数.includes('?')) {
        const [反代路径部分, 反代查询部分] = 路径反代参数.split('?');
        路径反代参数 = 反代路径部分;
        反代查询参数 = 反代查询部分;
    }
    runtime.config_JSON.PATH = runtime.config_JSON.PATH.replace(路径反代参数, '').replace('//', '/');
    const normalizedPath = runtime.config_JSON.PATH === '/' ? '' : runtime.config_JSON.PATH.replace(/\/+(?=\?|$)/, '').replace(/\/+$/, '');
    const [路径部分, ...查询数组] = normalizedPath.split('?');
    const 查询部分 = 查询数组.length ? '?' + 查询数组.join('?') : '';
    const 最终查询部分 = 反代查询参数 ? (查询部分 ? 查询部分 + '&' + 反代查询参数 : '?' + 反代查询参数) : 查询部分;
    runtime.config_JSON.完整节点路径 = (路径部分 || '/') + (路径部分 && 路径反代参数 ? '/' : '') + 路径反代参数 + 最终查询部分 + (runtime.config_JSON.启用0RTT ? (最终查询部分 ? '&' : '?') + 'ed=2560' : '');
    if (!runtime.config_JSON.TLS分片 && runtime.config_JSON.TLS分片 !== null)
        runtime.config_JSON.TLS分片 = null;
    const TLS分片参数 = runtime.config_JSON.TLS分片 == 'Shadowrocket' ? `&fragment=${encodeURIComponent('1,40-60,30-50,tlshello')}` : runtime.config_JSON.TLS分片 == 'Happ' ? `&fragment=${encodeURIComponent('3,1,tlshello')}` : '';
    if (!runtime.config_JSON.Fingerprint)
        runtime.config_JSON.Fingerprint = "chrome";
    if (!runtime.config_JSON.ECH)
        runtime.config_JSON.ECH = false;
    if (!runtime.config_JSON.ECHConfig)
        runtime.config_JSON.ECHConfig = { DNS: Ali_DoH, SNI: ECH_SNI };
    const ECHLINK参数 = runtime.config_JSON.ECH ? `&ech=${encodeURIComponent((runtime.config_JSON.ECHConfig.SNI ? runtime.config_JSON.ECHConfig.SNI + '+' : '') + runtime.config_JSON.ECHConfig.DNS)}` : '';
    const { type: 传输协议, 路径字段名, 域名字段名 } = runtime.transportConfig(runtime.config_JSON);
    const 传输路径参数值 = runtime.transportPath(runtime.config_JSON, runtime.config_JSON.完整节点路径);
    runtime.config_JSON.LINK = runtime.config_JSON.协议类型 === 'ss'
        ? `${runtime.config_JSON.协议类型}://${btoa(runtime.config_JSON.SS.加密方式 + ':' + userID)}@${host}:${runtime.config_JSON.SS.TLS ? '443' : '80'}?plugin=v2${encodeURIComponent(`ray-plugin;mode=websocket;host=${host};path=${((runtime.config_JSON.完整节点路径.includes('?') ? runtime.config_JSON.完整节点路径.replace('?', '?enc=' + runtime.config_JSON.SS.加密方式 + '&') : (runtime.config_JSON.完整节点路径 + '?enc=' + runtime.config_JSON.SS.加密方式)) + (runtime.config_JSON.SS.TLS ? ';tls' : ''))};mux=0`) + ECHLINK参数}#${encodeURIComponent(runtime.config_JSON.优选订阅生成.SUBNAME)}`
        : `${runtime.config_JSON.协议类型}://${userID}@${host}:443?security=tls&type=${传输协议 + ECHLINK参数}&${域名字段名}=${host}&fp=${runtime.config_JSON.Fingerprint}&sni=${host}&${路径字段名}=${encodeURIComponent(传输路径参数值) + TLS分片参数}&encryption=none#${encodeURIComponent(runtime.config_JSON.优选订阅生成.SUBNAME)}`;
    runtime.config_JSON.优选订阅生成.TOKEN = await runtime.hashIdentity(hostname + userID);
    // Discard obsolete integration fields from existing configuration records.
    delete runtime.config_JSON.TG;
    delete runtime.config_JSON.CF;
    runtime.config_JSON.加载时间 = (performance.now() - 初始化开始时间).toFixed(2) + 'ms';
    return runtime.config_JSON;
};
  }
];

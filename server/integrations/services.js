// Derived from cmliu/edgetunnel a8ab111. GPL-2.0; see THIRD_PARTY_NOTICES.md.
export const initializers = [
  (runtime) => {
runtime.recordLog = async function 请求日志记录(env, request, 访问IP, 请求类型 = "Get_SUB", config_JSON, 是否写入KV日志 = true) {
    try {
        const 当前时间 = new Date();
        const 日志内容 = { TYPE: 请求类型, IP: 访问IP, ASN: `AS${(request.cf || {}).asn || '0'} ${(request.cf || {}).asOrganization || 'Unknown'}`, CC: `${(request.cf || {}).country || 'N/A'} ${(request.cf || {}).city || 'N/A'}`, URL: runtime.redactUrl(request.url), UA: request.headers.get('User-Agent') || 'Unknown', TIME: 当前时间.getTime() };
        if (config_JSON.TG.启用) {
            try {
                const TG_TXT = await env.KV.get('tg.json');
                const TG_JSON = JSON.parse(TG_TXT);
                if (TG_JSON?.BotToken && TG_JSON?.ChatID) {
                    const 请求时间 = new Date(日志内容.TIME).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
                    const 请求URL = new URL(日志内容.URL);
                    const msg = `<b>#${config_JSON.优选订阅生成.SUBNAME} 日志通知</b>\n\n` +
                        `📌 <b>类型：</b>#${日志内容.TYPE}\n` +
                        `🌐 <b>IP：</b><code>${日志内容.IP}</code>\n` +
                        `📍 <b>位置：</b>${日志内容.CC}\n` +
                        `🏢 <b>ASN：</b>${日志内容.ASN}\n` +
                        `🔗 <b>域名：</b><code>${请求URL.host}</code>\n` +
                        `🔍 <b>路径：</b><code>${请求URL.pathname + 请求URL.search}</code>\n` +
                        `🤖 <b>UA：</b><code>${日志内容.UA}</code>\n` +
                        `📅 <b>时间：</b>${请求时间}\n` +
                        `${config_JSON.CF.Usage.success ? `📊 <b>请求用量：</b>${config_JSON.CF.Usage.total}/${config_JSON.CF.Usage.max} <b>${((config_JSON.CF.Usage.total / config_JSON.CF.Usage.max) * 100).toFixed(2)}%</b>\n` : ''}`;
                    await fetch(`https://api.telegram.org/bot${TG_JSON.BotToken}/sendMessage?chat_id=${TG_JSON.ChatID}&parse_mode=HTML&text=${encodeURIComponent(msg)}`, {
                        method: 'GET',
                        headers: {
                            'Accept': 'text/html,application/xhtml+xml,application/xml;',
                            'Accept-Encoding': 'gzip, deflate, br',
                            'User-Agent': 日志内容.UA || 'Unknown',
                        }
                    });
                }
            }
            catch (error) {
                console.error(`读取tg.json出错: ${error.message}`);
            }
        }
        是否写入KV日志 = ['1', 'true'].includes(env.OFF_LOG) ? false : 是否写入KV日志;
        if (!是否写入KV日志)
            return;
        let 日志数组 = [];
        const 现有日志 = await env.KV.get('log.json'), KV容量限制 = 4;
        if (现有日志) {
            try {
                日志数组 = JSON.parse(现有日志);
                if (!Array.isArray(日志数组)) {
                    日志数组 = [日志内容];
                }
                else if (请求类型 !== "Get_SUB") {
                    const 三十分钟前时间戳 = 当前时间.getTime() - 30 * 60 * 1000;
                    if (日志数组.some(log => log.TYPE !== "Get_SUB" && log.IP === 访问IP && log.URL === runtime.redactUrl(request.url) && log.UA === (request.headers.get('User-Agent') || 'Unknown') && log.TIME >= 三十分钟前时间戳))
                        return;
                    日志数组.push(日志内容);
                    while (JSON.stringify(日志数组, null, 2).length > KV容量限制 * 1024 * 1024 && 日志数组.length > 0)
                        日志数组.shift();
                }
                else {
                    日志数组.push(日志内容);
                    while (JSON.stringify(日志数组, null, 2).length > KV容量限制 * 1024 * 1024 && 日志数组.length > 0)
                        日志数组.shift();
                }
            }
            catch (e) {
                日志数组 = [日志内容];
            }
        }
        else {
            日志数组 = [日志内容];
        }
        await env.KV.put('log.json', JSON.stringify(日志数组, null, 2));
    }
    catch (error) {
        console.error(`日志记录失败: ${error.message}`);
    }
};
  },
  (runtime) => {
runtime.掩码敏感信息 = function 掩码敏感信息(文本, 前缀长度 = 3, 后缀长度 = 2) {
    if (!文本 || typeof 文本 !== 'string')
        return 文本;
    if (文本.length <= 前缀长度 + 后缀长度)
        return 文本;
    const 前缀 = 文本.slice(0, 前缀长度);
    const 后缀 = 文本.slice(-后缀长度);
    const 星号数量 = 文本.length - 前缀长度 - 后缀长度;
    return `${前缀}${'*'.repeat(星号数量)}${后缀}`;
};
  },
  (runtime) => {
runtime.getCloudflareUsage = async function getCloudflareUsage(Email, GlobalAPIKey, AccountID, APIToken) {
    const API = "https://api.cloudflare.com/client/v4";
    const sum = (a) => a?.reduce((t, i) => t + (i?.sum?.requests || 0), 0) || 0;
    const cfg = { "Content-Type": "application/json" };
    try {
        if (!AccountID && (!Email || !GlobalAPIKey))
            return { success: false, pages: 0, workers: 0, total: 0, max: 100000 };
        if (!AccountID) {
            const r = await fetch(`${API}/accounts`, {
                method: "GET",
                headers: { ...cfg, "X-AUTH-EMAIL": Email, "X-AUTH-KEY": GlobalAPIKey }
            });
            if (!r.ok)
                throw new Error(`账户获取失败: ${r.status}`);
            const d = await r.json();
            if (!d?.result?.length)
                throw new Error("未找到账户");
            const idx = d.result.findIndex(a => a.name?.toLowerCase().startsWith(Email.toLowerCase()));
            AccountID = d.result[idx >= 0 ? idx : 0]?.id;
        }
        const now = new Date();
        now.setUTCHours(0, 0, 0, 0);
        const hdr = APIToken ? { ...cfg, "Authorization": `Bearer ${APIToken}` } : { ...cfg, "X-AUTH-EMAIL": Email, "X-AUTH-KEY": GlobalAPIKey };
        const res = await fetch(`${API}/graphql`, {
            method: "POST",
            headers: hdr,
            body: JSON.stringify({
                query: `query getBillingMetrics($AccountID: String!, $filter: AccountWorkersInvocationsAdaptiveFilter_InputObject) {
					viewer { accounts(filter: {accountTag: $AccountID}) {
						pagesFunctionsInvocationsAdaptiveGroups(limit: 1000, filter: $filter) { sum { requests } }
						workersInvocationsAdaptive(limit: 10000, filter: $filter) { sum { requests } }
					} }
				}`,
                variables: { AccountID, filter: { datetime_geq: now.toISOString(), datetime_leq: new Date().toISOString() } }
            })
        });
        if (!res.ok)
            throw new Error(`查询失败: ${res.status}`);
        const result = await res.json();
        if (result.errors?.length)
            throw new Error(result.errors[0].message);
        const acc = result?.data?.viewer?.accounts?.[0];
        if (!acc)
            throw new Error("未找到账户数据");
        const pages = sum(acc.pagesFunctionsInvocationsAdaptiveGroups);
        const workers = sum(acc.workersInvocationsAdaptive);
        const total = pages + workers;
        const max = 100000;
        runtime.log(`统计结果 - Pages: ${pages}, Workers: ${workers}, 总计: ${total}, 上限: 100000`);
        return { success: true, pages, workers, total, max };
    }
    catch (error) {
        console.error('获取使用量错误:', error.message);
        return { success: false, pages: 0, workers: 0, total: 0, max: 100000 };
    }
};
  }
];

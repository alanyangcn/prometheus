// Derived from cmliu/edgetunnel a8ab111. GPL-2.0; see THIRD_PARTY_NOTICES.md.
export const initializers = [
  (runtime) => {
runtime.recordLog = async function 请求日志记录(env, request, 访问IP, 请求类型 = "Get_SUB", config_JSON, 是否写入KV日志 = true) {
    try {
        const 当前时间 = new Date();
        const 日志内容 = { TYPE: 请求类型, IP: 访问IP, ASN: `AS${(request.cf || {}).asn || '0'} ${(request.cf || {}).asOrganization || 'Unknown'}`, CC: `${(request.cf || {}).country || 'N/A'} ${(request.cf || {}).city || 'N/A'}`, URL: runtime.redactUrl(request.url), UA: request.headers.get('User-Agent') || 'Unknown', TIME: 当前时间.getTime() };
        
        是否写入KV日志 = ['1', 'true'].includes(env.OFF_LOG) ? false : 是否写入KV日志;
        if (!是否写入KV日志)
            return;
        let 日志数组 = [];
        const 现有日志 = await env.STORAGE.get('log.json'), KV容量限制 = 4;
        if (现有日志) {
            try {
                日志数组 = JSON.parse(现有日志);
                if (!Array.isArray(日志数组)) {
                    日志数组 = [日志内容];
                }
                else if (请求类型 === "Admin_Login") {
                    const 三十分钟前时间戳 = 当前时间.getTime() - 30 * 60 * 1000;
                    if (日志数组.some(log => log.TYPE === "Admin_Login" && log.IP === 访问IP && log.URL === runtime.redactUrl(request.url) && log.UA === (request.headers.get('User-Agent') || 'Unknown') && log.TIME >= 三十分钟前时间戳))
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
        await env.STORAGE.put('log.json', JSON.stringify(日志数组, null, 2));
    }
    catch (error) {
        console.error(`日志记录失败: ${error.message}`);
    }
};
  }
];

// GPL-2.0; contributor copyrights: see THIRD_PARTY_NOTICES.md.
export const initializers = [
  (runtime) => {
runtime.recordLog = async function 请求日志记录(env, request, 访问IP, 请求类型 = "Get_SUB", config_JSON, 是否写入KV日志 = true) {
    try {
        是否写入KV日志 = ['1', 'true'].includes(env.OFF_LOG) ? false : 是否写入KV日志;
        if (!是否写入KV日志 || !env.STORAGE || typeof env.STORAGE.get !== 'function')
            return;
        const 当前时间 = new Date();
        const 脱敏URL = runtime.redactUrl(request.url);
        const 客户端UA = request.headers.get('User-Agent') || 'Unknown';
        const 日志内容 = { TYPE: 请求类型, IP: 访问IP, ASN: `AS${(request.cf || {}).asn || '0'} ${(request.cf || {}).asOrganization || 'Unknown'}`, CC: `${(request.cf || {}).country || 'N/A'} ${(request.cf || {}).city || 'N/A'}`, URL: 脱敏URL, UA: 客户端UA, TIME: 当前时间.getTime() };
        let 日志数组 = [];
        const 现有日志 = await env.STORAGE.get('log.json'), 最大字节数 = 4 * 1024 * 1024;
        if (现有日志) {
            try {
                const 解析结果 = JSON.parse(现有日志);
                if (Array.isArray(解析结果)) {
                    if (请求类型 === "Admin_Login") {
                        const 三十分钟前时间戳 = 当前时间.getTime() - 30 * 60 * 1000;
                        if (解析结果.some(log => log && log.TYPE === "Admin_Login" && log.IP === 访问IP && log.URL === 脱敏URL && log.UA === 客户端UA && log.TIME >= 三十分钟前时间戳))
                            return;
                    }
                    日志数组 = 解析结果;
                }
            }
            catch (e) {
                日志数组 = [];
            }
        }
        日志数组.push(日志内容);
        const 编码器 = runtime.textEncoder || new TextEncoder();
        let 序列化日志 = JSON.stringify(日志数组, null, 2);
        let 当前字节 = 编码器.encode(序列化日志).byteLength;
        while (当前字节 > 最大字节数 && 日志数组.length > 1) {
            const 预估移除数 = Math.max(1, Math.ceil(((当前字节 - 最大字节数) / 当前字节) * 日志数组.length));
            日志数组.splice(0, Math.min(日志数组.length - 1, 预估移除数));
            序列化日志 = JSON.stringify(日志数组, null, 2);
            当前字节 = 编码器.encode(序列化日志).byteLength;
        }
        await env.STORAGE.put('log.json', 序列化日志);
    }
    catch (error) {
        console.error(`日志记录失败: ${error.message}`);
    }
};
  }
];

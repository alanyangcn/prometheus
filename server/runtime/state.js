// Derived from cmliu/edgetunnel a8ab111. GPL-2.0; see THIRD_PARTY_NOTICES.md.
export const initializers = [
  (runtime) => {
runtime.Version = '2026-10-08 22:23:27';
  },
  (runtime) => {
runtime.config_JSON = undefined;
  },
  (runtime) => {
runtime.缓存SOCKS5白名单 = null;
  },
  (runtime) => {
runtime.调试日志打印 = false;
  },
  (runtime) => {
runtime.SOCKS5白名单 = ['*tapecontent.net', '*cloudatacdn.com', '*loadshare.org', '*cdn-centaurus.com', 'scholar.google.com'];
  },
  (runtime) => {
runtime.WS早期数据最大字节 = 8 * 1024;
  },
  (runtime) => {
runtime.WS早期数据最大头长度 = Math.ceil(runtime.WS早期数据最大字节 * 4 / 3) + 4;
  },
  (runtime) => {
runtime.上行合包目标字节 = 20 * 1024;
  },
  (runtime) => {
runtime.上行队列最大字节 = 16 * 1024 * 1024;
  },
  (runtime) => {
runtime.上行队列最大条目 = 4096;
  },
  (runtime) => {
runtime.下行Grain包字节 = 32 * 1024;
  },
  (runtime) => {
runtime.下行Grain尾部阈值 = 512;
  },
  (runtime) => {
runtime.下行Grain低水位字节 = Math.max(4096, runtime.下行Grain尾部阈值 * 12);
  },
  (runtime) => {
runtime.下行Grain最大等待轮次 = 4;
  },
  (runtime) => {
runtime.TCP并发拨号数 = 2;
  },
  (runtime) => {
runtime.反代并发拨号数 = 1;
  },
  (runtime) => {
runtime.预加载竞速拨号 = false;
  },
  (runtime) => {
runtime.特征码字典 = ['PROXYIP', 'cmliu', '090227'];
  },
  (runtime) => {
runtime.汇聚订阅_UA = 'v2rayN/edge' + 'tunnel (https://github.com/' + runtime.特征码字典[1] + '/edge' + 'tunnel)';
  }
];

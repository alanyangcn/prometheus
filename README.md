# Prometheus · 普罗米修斯

基于 Vue 3 + TypeScript + Vite + Vue Router + Pinia 的 Cloudflare Workers 隧道服务与本地管理界面，按模块迁移 edgetunnel 的网络功能，剔除无关宗教填充、混淆彩蛋和运行时外站管理页面。

## 当前状态

核心算法已按模块迁移，本地 Vue 管理界面已接入。管理工作流已扩展到订阅分享、配置预设、代理目录、链式节点、在线/本地优选、网络诊断工具。受控测试与浏览器管理流程的验证记录见功能矩阵；真实外部代理与客户端组合的端到端验证仍待完成。详细范围见 `docs/feature-matrix.md`。

新路由、认证、管理 API 与 Vue 使用 TypeScript；迁移的底层算法保留 JavaScript，并由请求级运行时组合。内部动态注册仍需逐步收紧类型，不将这次迁移描述为全部算法的纯 TypeScript 重写。

## 本地开发

```bash
npm install
cp .dev.vars.example .dev.vars
# 编辑 .dev.vars，设置自己的 ADMIN；不要提交真实密码
npm run dev
```

开发服务默认 http://localhost:5173，管理页面 `/<ADMIN_PATH>/Illumination`，登录页面 `/<ADMIN_PATH>/spark`。KV 使用本地模拟存储；真实部署需绑定自己的命名空间。

```bash
npm test
npm run build
npx wrangler deploy --dry-run
```

经核验并完成生产绑定后，执行 `npx wrangler login` 和 `npm run deploy`。开发文件不是生产 secrets；通过 Wrangler 或 Cloudflare 控制台配置生产 ADMIN/KEY/UUID。

## 功能边界

保留 VLESS/Trojan/Shadowsocks，WS/gRPC/XHTTP，ProxyIP 与 SOCKS5/HTTP/HTTPS/TURN/SSTP 上游代理，节点与订阅生成、地址库、配置和日志。实际支持组合和验证状态见功能矩阵。

UDP 支持受原协议实现与 Workers 平台约束；订阅的 Clash/Sing-box 等转换仍可能调用配置的外部转换服务。没有承诺任意原生 UDP 或所有组合。

## 环境变量

| 名称 | 用途 |
| --- | --- |
| ADMIN | 管理员密码（必需） |
| ADMIN_PATH | 管理网页的单层路径前缀，例如 `as` 对应 `/as/spark`；未设置或无效时关闭管理网页入口 |
| KEY | 快速订阅路径密钥及旧身份派生兼容 |
| UUID | 可选固定 UUIDv4 |
| HOST / PATH | 节点域名与路径覆盖 |
| PROXYIP | 用户配置的上游反代地址 |
| GO2SOCKS5 | 上游代理域名匹配名单 |
| DEBUG / OFF_LOG | 调试与禁用 KV 日志 |
| BEST_SUB | 优选订阅生成器模式 |
| PRELOAD_RACE_DIAL | 预加载竞速拨号 |
| TCP_CONCURRENT_DIAL / PROXY_CONCURRENT_DIAL | 并发拨号参数 |

不设置生产密码或代理凭据的默认值。保留旧变量别名仅为兼容，推荐使用表中名称。

## 外部服务

迁移保留的默认外部地址来源包括原项目公共 ProxyIP 解析、订阅转换端/规则、优选生成器；DNS 转发及 DoH 也需要外部网络。可在配置中替换相关服务。公共服务可能不可用，项目不保证其 SLA。

管理工具按用户点击读取参考项目维护的代理目录、转换服务/规则和路径模板、优选工具清单、BestCF 探测服务、ipapi.is 信息，以及 EDT-Pages 的独立 Snippet 源码。浏览器优选和网络诊断从当前浏览器发起探测，结果受到本地 DNS、TLS、代理出口和 CORS 限制；不会把无法读取的响应算作优选测速成功。站点延迟测试只记录浏览器请求耗时，不能证明目标 HTTP 状态。二维码在本地生成，不把订阅 token 发送到二维码网站。


管理界面随 Vue 构建发布，运行时不依赖 edt-pages.github.io。首页展示真实应用，不模拟 nginx/1101 页面，可生成参考项目的独立 Snippet 代码，提供复制与下载；不引入其无功能混淆填充。

## 结构

- `src/`：本地 Vue 管理界面、路由、Pinia 状态。
- `server/`：请求路由、认证、配置、协议、传输、代理与日志模块。
- `shared/`：公共类型。
- `test/`：协议兼容与 API 测试。
- `docs/`：设计、实施进度、功能矩阵。
- `reference/`：原始参考仓库，不参与构建。

## 开发与许可证

开发约定见 AGENTS.md。核心迁移来源 `cmliu/edgetunnel`，基线 `a8ab111`。保留 GPL v2 许可及原算法归属，见 LICENSE 和 THIRD_PARTY_NOTICES.md。

## GitHub 自动部署

Cloudflare Workers Builds 已连接 `alanyangcn/prometheus`，生产分支为 `main`。

- 构建命令：`npm ci && npm test && npm run build`
- 部署命令：`npx wrangler deploy`
- 生产 KV：`prometheus`，绑定名 `KV`。
- 生产管理员密码：Worker Secret `ADMIN`；不写入仓库。

main 更新后由 Cloudflare 原生 Git 集成构建和部署，部署凭据由 Cloudflare 管理，无需另行配置 GitHub 部署 Token。`.github/workflows/ci.yml` 只负责测试与构建。

## 生产构建压缩与混淆

`npm run build` 对 Worker 和浏览器 JavaScript 执行压缩，对 CSS 执行压缩；`build/obfuscation.ts` 只对浏览器产物应用标识符和字符串数组混淆，在最终文件哈希计算前执行。开发模式不执行混淆，生产构建不输出 sourcemap。

混淆使用 `javascript-obfuscator`，不启用 eval、反调试、自保护、垃圾代码或控制流扁平化。Worker 网络及密码学算法只进行压缩。混淆可能增加前端体积，也不提供密码或源码保密保证；本项目源码仍公开并保留 GPL 许可。

## 前端入口

摄影首页通过 `index.html` → `src/photography.ts` 独立构建，只加载摄影页面及主题模块，不注册管理路由或 Pinia。管理界面通过 `admin.html` → `src/main.ts` 单独构建。Worker 将运行时 `ADMIN_PATH` 注入管理 HTML，Vue Router 根据该前缀生成链接，登录、退出、刷新和管理深链接均使用同一前缀。首页不包含前缀。

在本地 `.dev.vars` 或 Cloudflare 运行时变量/密钥中配置：

```dotenv
ADMIN_PATH="as"
```

例如登录地址为 `/as/spark`，管理概览为 `/as/Illumination`，设置页为 `/as/Illumination/settings`。前缀允许 1–64 个英文字母、数字、下划线或短横线，也可输入 `/as/`。不能使用 API、静态资源或协议端点的保留名称。未设置、空值或无效值时管理网页返回实际 HTTP 404。尚未访问正确前缀的浏览器，访问旧 `/login`、`/admin`、`/setup`、直接访问 `/admin.html` 或错误前缀时返回 404，不会通过重定向泄露入口。首次访问正确前缀的网页时设置带签名的 HttpOnly Cookie，记录发现入口，有效期固定为 30 分钟，刷新和跳转不会续期。标识有效时访问前缀外的其他网页会跳转到当前前缀下的登录页；首页、静态资源、API、订阅与隧道不受影响。到期后恢复 404，重新访问正确前缀才创建新记录。修改 ADMIN_PATH 会使旧标识失效，该标识不授予登录权限。

正确前缀内的管理页面未登录时重定向到该前缀下的登录页，旧初始化路径 `/as/setup` 也重定向到登录页。ADMIN、KV 配置提示弹窗在登录页展示。原有管理诊断与配置兼容路径也使用此前缀。修改运行时变量后无需重新打包前端；本地开发需要开发服务重新读取环境变量。

两个入口仅共享 Vue 运行时、主题逻辑等公共模块，不互相导入业务代码。生产构建保留压缩、混淆并关闭 source map。摄影首页及静态 JS/CSS 公开，管理静态资源尚未增加资源鉴权。订阅、隧道与 `/api/*` 保留原有地址和鉴权规则，避免网页前缀破坏客户端连接。

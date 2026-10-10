# Prometheus · 普罗米修斯

基于 Vue 3 + TypeScript + Vite + Vue Router + Pinia 的 Cloudflare Workers 隧道服务与本地管理界面，按模块迁移 edgetunnel 的网络功能，剔除无关宗教填充、混淆彩蛋和运行时外站管理页面。

## 当前状态

核心算法已按模块迁移，本地 Vue 管理界面已接入。33 项自动化检查、浏览器管理流程和构建已通过；真实 Workers 与外部代理的端到端验证仍待完成。详细范围见 `docs/feature-matrix.md`。

新路由、认证、管理 API 与 Vue 使用 TypeScript；迁移的底层算法保留 JavaScript，并由请求级运行时组合。内部动态注册仍需逐步收紧类型，不将这次迁移描述为全部算法的纯 TypeScript 重写。

## 本地开发

```bash
npm install
cp .dev.vars.example .dev.vars
# 编辑 .dev.vars，设置自己的 ADMIN；不要提交真实密码
npm run dev
```

开发服务默认 http://localhost:5173，管理页面 `/admin`，登录页面 `/login`。KV 使用本地模拟存储；真实部署需绑定自己的命名空间。

```bash
npm test
npm run build
npx wrangler deploy --dry-run
```

经核验并完成生产绑定后，执行 `npx wrangler login` 和 `npm run deploy`。开发文件不是生产 secrets；通过 Wrangler 或 Cloudflare 控制台配置生产 ADMIN/KEY/UUID。

## 功能边界

保留 VLESS/Trojan/Shadowsocks，WS/gRPC/XHTTP，ProxyIP 与 SOCKS5/HTTP/HTTPS/TURN/SSTP 上游代理，节点与订阅生成、地址库、配置和日志、Cloudflare 用量与 Telegram 集成。实际支持组合和验证状态见功能矩阵。

UDP 支持受原协议实现与 Workers 平台约束；订阅的 Clash/Sing-box 等转换仍可能调用配置的外部转换服务。没有承诺任意原生 UDP 或所有组合。

## 环境变量

| 名称 | 用途 |
| --- | --- |
| ADMIN | 管理员密码（必需） |
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

迁移保留的默认外部地址来源包括原项目公共 ProxyIP 解析、订阅转换端/规则、优选生成器；DNS 转发及 DoH、Cloudflare GraphQL、Telegram 也需要外部网络。可在配置中替换相关服务，未配置通知凭据时不会开启通知。公共服务可能不可用，项目不保证其 SLA。

管理界面随 Vue 构建发布，运行时不依赖 edt-pages.github.io。首页展示真实应用，不模拟 nginx/1101 页面，不提供源代码混淆服务。

## 结构

- `src/`：本地 Vue 管理界面、路由、Pinia 状态。
- `server/`：请求路由、认证、配置、协议、传输、代理与集成模块。
- `shared/`：公共类型。
- `test/`：协议兼容与 API 测试。
- `docs/`：设计、实施进度、功能矩阵。
- `reference/`：原始参考仓库，不参与构建。

## 开发与许可证

开发约定见 AGENTS.md。核心迁移来源 `cmliu/edgetunnel`，基线 `a8ab111`。保留 GPL v2 许可及原算法归属，见 LICENSE 和 THIRD_PARTY_NOTICES.md。

## GitHub 自动部署

`.github/workflows/deploy.yml` 在 main 更新或手动触发时运行测试、构建和 Wrangler 部署。

仓库需配置 Secret `CLOUDFLARE_API_TOKEN` 和 Variable `CLOUDFLARE_ACCOUNT_ID`。API Token 应限制到目标账号，包含 Workers Scripts 编辑、Workers KV Storage 编辑及 Account Settings 读取权限。Token 不应写入代码或提交；生产 ADMIN 通过 Cloudflare Worker Secrets 单独设置。部署前必须将 wrangler.jsonc 中 KV 绑定补全为生产命名空间 ID。

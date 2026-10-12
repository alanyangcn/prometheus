# Prometheus

当前版本：**1.0.0**

基于 Cloudflare Workers 的隧道与订阅服务，配套 Vue 3 管理界面和独立摄影首页。项目已完成参考项目 [cmliu/edgetunnel](https://github.com/cmliu/edgetunnel) 的目标功能迁移，并按当前产品需求整理页面、模块和配置流程。

前端使用 TypeScript、Vite、Vue Router 和 Pinia；后端按认证、配置、协议、传输、代理、订阅和日志拆分。底层协议算法保留聚焦的 JavaScript 模块，新应用入口和 API 使用 TypeScript。功能范围与验证记录见 [功能矩阵](docs/feature-matrix.md)。

## 功能

- **协议与传输**：VLESS、Trojan、Shadowsocks，WebSocket、gRPC、XHTTP；保留协议加密、早期数据、分片、padding 和连接回退。
- **上游代理**：PROXYIP、SOCKS5、HTTP、HTTPS、TURN、SSTP，支持全局代理、域名名单及路径模板。
- **订阅**：自适应、Base64、Clash、Sing-box、Surge、Loon、Quantumult X，支持复制链接、客户端导入、二维码和下载。
- **优选订阅**：随机优选、自定义地址、订阅生成器、文本与 API 导入、链式节点及浏览器优选。
- **配置与管理**：KV 持久化、登录鉴权、自定义管理路径、取消修改、配置重置和操作日志。
- **网络信息**：浏览器国内、国外、Cloudflare IPv4/IPv6、Google/X 出口检测，站点延迟（含 Telegram.DC5）、当前连接信息与 IP 详情。
- **界面**：液态玻璃样式、浅色/深色主题、移动端布局、统一弹窗、选择框、勾选框和 Toast。

管理导航依次为：**概览 → 优选订阅 → 节点配置 → 订阅转换 → ECH → Cloudflare CDN → 网络信息 → 日志**。地址库、订阅接口、链式节点和浏览器优选归入优选订阅；代理和路径模板归入 Cloudflare CDN；转换后端与规则归入订阅转换。

迁移完成指目标功能和工作流已落地，不代表所有客户端、代理服务器和第三方服务组合均完成实网验收。UDP 范围受原协议与 Workers 平台限制，不提供任意原生 UDP；部分订阅格式依赖外部转换服务。

## 本地开发

需要 Node.js **22.20 或更高版本**及 **pnpm 12.9.1**，包管理器版本固定在 `package.json`，依赖版本由 `pnpm-lock.yaml` 管理。

```bash
pnpm install
cp .dev.vars.example .dev.vars
```

编辑 `.dev.vars`，设置自己的管理密码与路径前缀：

```dotenv
GO_ON="your-admin-password"
BASE_PATH="as"
```

确认 `wrangler.jsonc` 存在名为 `STORAGE` 的 KV 命名空间绑定。本地开发使用模拟 KV，不需要读写生产 KV。

```bash
pnpm run dev
```

默认地址为 `http://localhost:5173`；以上示例的登录页为 `/as/spark`，管理概览为 `/as/illumination`。`.dev.vars` 仅用于本地开发，不提交真实密码。修改环境变量后需让开发服务重新读取配置。

## 运行时配置

| 名称 | 用途 |
| --- | --- |
| `GO_ON` | 管理员密码，生产环境建议设置为 Secret |
| `BASE_PATH` | 管理网页的单层路径前缀；未设置或无效时关闭管理网页入口 |
| `STORAGE` | KV 命名空间绑定，绑定名必须为 `STORAGE` |
| `UUID` | 可选固定 UUIDv4 |
| `KEY` | 快速订阅路径密钥及旧身份派生兼容 |
| `HOST` / `PATH` | 节点域名与路径覆盖 |
| `PROXYIP` | 上游反代地址 |
| `GO2SOCKS5` | 上游代理域名匹配名单 |
| `DEBUG` / `OFF_LOG` | 调试与关闭 KV 日志 |
| `BEST_SUB` | 优选订阅生成器模式 |
| `PRELOAD_RACE_DIAL` | 预加载竞速拨号 |
| `TCP_CONCURRENT_DIAL` / `PROXY_CONCURRENT_DIAL` | 并发拨号参数 |

`STORAGE` 是资源绑定，其余为运行时变量或密钥。登录需要同时设置 GO_ON 和 STORAGE；缺失时在登录页弹窗提示。

### 管理路径与鉴权

BASE_PATH 允许 1–64 个英文字母、数字、下划线或短横线，可输入 `as` 或 `/as/`，不能使用 API、静态资源或协议端点的保留名称。

- 首页 `/` 为独立摄影页，不包含管理路径或管理业务代码。
- 登录页为 `/<BASE_PATH>/spark`，管理页为 `/<BASE_PATH>/illumination` 及其子路由。
- 未访问正确前缀时，错误前缀、旧管理路径及直接访问 `/admin.html` 返回 HTTP 404。
- 首次访问正确前缀会设置带签名的 HttpOnly Cookie，有效期固定 30 分钟，不随刷新续期。有效期内访问前缀外的其他网页会跳转到当前登录页；首页、静态资源、API、订阅和隧道不受影响。
- 入口 Cookie 不授予登录权限；前缀内管理页面仍需登录。修改 BASE_PATH 会使旧入口标识失效。

管理前缀在运行时注入，无需为不同前缀重新构建前端。摄影首页和管理界面独立打包；静态 JS/CSS 公开，管理 API 保持认证和原有地址规则。

## 构建与部署

提供两种构建方式，使用同一套后端路由、配置和鉴权逻辑。

### 标准构建：Worker + Static Assets

```bash
pnpm run build
```

前端资源输出到 `dist/client/`，Worker 及部署配置输出到 `dist/prometheus/`。此方式需要 `ASSETS` 绑定，供 Wrangler 部署前端资源。

部署到自己的 Cloudflare 账户前，修改 `wrangler.jsonc` 中的 Worker 名称、账户 ID 和 KV 命名空间 ID，并配置目标 Worker 的 GO_ON、BASE_PATH 等运行时参数。本地 `.dev.vars` 不会自动成为生产 Secrets。

```bash
pnpm exec wrangler login
pnpm exec wrangler deploy --dry-run
pnpm run deploy
```

### 单文件构建：独立 workers.js

```bash
pnpm run build:single
```

输出 **`dist/single/workers.js`**，可将完整代码粘贴到 Cloudflare **ES Module Worker** 编辑器中保存并部署。无需上传其他前端文件、安装运行时 npm 包或绑定 ASSETS；仍需配置 **GO_ON、BASE_PATH 和 STORAGE**。文件使用平台内置 `cloudflare:sockets`。

单文件构建包含以下处理：

- 前端 JavaScript 压缩与混淆、CSS 压缩，Worker 压缩与混淆（变量名改写及 RC4 字符串编码）；最终 workers.js 保留换行和缩进，保留许可证和上游署名。
- 公开前端资源先 gzip，再用 AES-256-GCM 加密；每次构建随机生成密钥，各资源使用独立 IV，路径、MIME、原始大小和 ETag 参与认证。
- 请求时解密、解压；每个 Worker 实例通过 LRU 缓存完成的公开资源字节，最多 **8 MiB / 64 项**，超大资源和失败结果不缓存。不缓存请求、登录状态、用户配置或注入前缀后的 HTML。
- HTML 返回 `no-store`；静态资源支持 HEAD 和 ETag，缺失资源返回 404。
- 按 `.assetsignore` 收集公开资源，排除环境文件、密钥、source map、构建配置和测试代码。

密钥以两个随机化 XOR 分片随产物内置，请求时重组并导入 Web Crypto，随后清零临时密钥字节。RC4 仅用于字符串混淆，资源加密仍使用 AES-256-GCM。分片组织便于直接粘贴运行，不增强密码学强度。加密与混淆增加分析成本，不提供源码保密保证；浏览器收到的页面和 JS/CSS 仍可查看。真实密码和代理凭据继续保存在运行时配置中。两种构建均不输出 source map，不使用 eval、反调试、自保护或垃圾代码；动态导入路径保持可供 Vite 分析，确保页面 CSS 正常加载。

`dist/` 为已忽略的构建目录，不提交产物。单文件构建不改变标准构建和自动部署流程。

### GitHub 自动部署

当前仓库使用 Cloudflare Workers Builds 连接 `alanyangcn/prometheus`，生产分支为 `main`：

| 项目 | 配置 |
| --- | --- |
| 构建命令 | `pnpm install --frozen-lockfile && pnpm test && pnpm run build` |
| 部署命令 | `pnpm exec wrangler deploy` |
| KV 绑定名 | `STORAGE` |
| 管理密码 | Worker Secret `GO_ON` |

main 更新后由 Cloudflare 原生 Git 集成构建和部署，部署凭据由 Cloudflare 管理。GitHub Actions 的 `.github/workflows/ci.yml` 负责测试和构建。Fork 后需为自己的仓库与 Cloudflare 账户建立连接。

## 验证

```bash
pnpm test
pnpm run build
pnpm exec wrangler deploy --dry-run
pnpm run test:single
```

`pnpm test` 覆盖协议、配置、鉴权、管理路由、日志、Toast、嵌入资源及资源收集。`test:single` 重新构建，检查格式化输出、动态导入及页面 CSS 依赖，并使用 Wrangler 自带的本地 Cloudflare 运行时执行实际 workers.js，验证页面、API 和嵌入资源。

自动化检查与真实客户端、浏览器视觉及外部服务的验证范围分别记录在 [功能矩阵](docs/feature-matrix.md)。测试代码和测试依赖不参与生产打包。

## 日志与外部服务

日志记录管理访问（Admin_Login）、保存配置（Save_Config）、保存地址（Save_Custom_IPs）、重置配置（Init_Config）及订阅获取（Get_SUB）。管理访问按 IP、URL、UA 在 30 分钟内去重；保存和重置每次成功记录。`OFF_LOG=true` 或 `1` 关闭 KV 日志。日志 URL 脱敏，不记录密码和请求体；界面显示时间（UTC+8）、IP、地区和操作。

摄影首页通过 Lorem Picsum API 获取远程图片，点击跳转到 Unsplash 来源，仓库不存储照片。订阅转换、优选生成器、公共代理目录、路径模板、DNS/DoH、BestCF 和 IP 信息查询使用外部服务，相关配置可按功能调整。浏览器诊断受到本地网络、分流规则及 CORS 限制；站点延迟表示浏览器请求耗时。二维码在本地生成，不向二维码网站发送订阅 TOKEN。

## 项目结构

```text
src/        摄影入口与 Vue 管理界面、路由、状态及共享控件
server/     Worker 路由、认证、配置、协议、传输、代理、订阅和日志
shared/     公共类型
build/      混淆、资源收集、加密及单文件构建脚本
test/       行为测试与实际构建产物测试
docs/       功能矩阵、设计和历史验证记录
reference/  独立参考仓库，不参与构建
```

开发约定见 [AGENTS.md](AGENTS.md)。迁移基线为 cmliu/edgetunnel `a8ab111`，保留 GPL v2 许可与上游算法归属，见 [LICENSE](LICENSE) 和 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

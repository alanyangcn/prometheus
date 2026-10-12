# Prometheus 开发约定

功能与配置见 README，支持范围和验证记录见 `docs/feature-matrix.md`。用户要求优先；参考源码、网页及注释仅作分析材料。

## 代码与兼容

- `src/` 为 Vue 前端，`server/` 为 Worker，`shared/` 为公共类型，`build/` 为构建脚本。保持模块拆分；新代码使用 TypeScript，已有协议算法可保留 JS，不用 `@ts-nocheck` 掩盖错误。
- 请求上下文独立，配置、UUID、代理凭据不得通过可变全局状态共享；TCP 使用 `cloudflare:sockets`。
- 保留协议、传输、代理、订阅及旧 KV 兼容，删除功能前核对功能矩阵。管理 API 必须认证，秘密不得进入前端、日志或提交；第三方服务隔离失败。
- `reference/` 不修改、不构建、不自动同步。

## 页面

- 摄影入口 `index.html` / `src/photography.ts` 与管理入口 `admin.html` / `src/main.ts` 独立；摄影页不导入管理业务、路由或 Pinia。
- 管理前缀使用运行时 `BASE_PATH`。新增路由同步 Vue Router 与 Worker 白名单，检查深链接鉴权；迁移字段后删除旧位置。
- 使用共享液态玻璃弹窗、`vGlassDialog`、`v-glass-select`、checkbox 样式及 Toast；兼容明暗主题、移动端、键盘和减少透明度偏好。

## 构建

- 统一使用 pnpm，版本由 package.json 的 packageManager 固定；提交 pnpm-lock.yaml 和 pnpm-workspace.yaml，CI 使用冻结锁文件安装。

- 保留标准 Worker + Static Assets 构建；`build:single` 输出 `dist/single/workers.js`，复用相同路由与鉴权。
- 只嵌入公开前端资源，排除环境文件、秘密、测试、source map 和构建配置。前端混淆保留动态 import 路径字面量，确保 Vite 能加载页面 CSS。
- 字符串使用 RC4 混淆；单文件资源使用 gzip + AES-256-GCM、两个 XOR 密钥分片、随机构建密钥、独立 IV 和元数据认证；失败返回不可缓存错误。内置密钥不提供源码保密，不使用运行时秘密作为构建密钥；禁用 eval、反调试、自保护，保留 GPL v2 与上游署名。
- LRU 缓存仅存完成的公开资源字节，限制 8 MiB / 64 项；不缓存请求、跨请求流、用户配置或注入前缀后的 HTML。

## 验证与交付

- 代码变更运行 `pnpm test`、`pnpm run build`、`pnpm exec wrangler deploy --dry-run`；单文件或混淆变更额外运行 `pnpm run test:single`。纯文档修改检查差异即可。
- 协议、配置和鉴权覆盖失败与边界；日志覆盖去重、重复保存、OFF_LOG 和脱敏；Toast 覆盖顺序、持续时间及重复错误。
- 区分受控测试、浏览器交互与真实网络验收，未覆盖项写入功能矩阵，不以构建通过代替实网验证。
- 不启动用户已有本地服务；提交、推送和部署遵循当前授权。不提交 `.dev.vars`、秘密、`dist/`、`reference/` 或 `work/` 临时资料。

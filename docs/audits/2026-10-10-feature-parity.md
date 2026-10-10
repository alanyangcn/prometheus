# 参考项目功能对照复核

## 初始复核结论（补齐之前）

初始版本是底层算法模块迁移 + 基础管理界面，不是参考项目全部必要功能已经完成重构。之前的完成表述过早。用户仅要求去除无功能填充和混淆，不能据此默认省略有功能的管理工具。

对照来源：reference/_worker.js a8ab111、reference/README.md、reference/CHANGELOG.md，以及 Worker 加载的远程 admin HTML（本地审计缓存）。远程管理页是单独发布的，不能声称它与 Worker 基线提交严格同步。

## 初始定位的缺口

| 功能 | 参考依据 | 当前情况 | 需要补齐 |
| --- | --- | --- | --- |
| 二维码、客户端导入 | admin HTML showQRCode / 各订阅按钮 | Dashboard 仅复制链接 | 本地二维码组件和按客户端生成导入 URI |
| Loon、Quantumult X 订阅 | Worker 订阅类型分支 | 后端分支迁移，Dashboard 未提供入口 | 界面入口及转换后的输出检查 |
| 链式代理节点 | admin HTML 添加链式代理节点、resetChainProxyValidation 等 | 编码与代理算法已迁移，没有操作界面 | 节点解析、校验、检测、生成、保存流程 |
| 浏览器优选 | admin HTML BestCF、testLatency、testDownloadSpeed、saveSelectedResults、exportOptimizeResultsCsv | 完全没有迁移工具界面 | 任务控制、测速、排序/筛选、选择、保存/导出；说明浏览器 CORS 和真实测速限制 |
| 订阅源模式 | admin HTML saveSub 的 random/custom/generator | 配置字段可编辑，但地址库保存不联动切换随机模式 | 显式模式选择、各模式字段验证和联动保存 |
| 上游代理选择 | admin HTML processProxyAddress/saveProxy | nullable 启用字段作为原始文本展示；只有独立检测页 | 关闭/SOCKS5/HTTP/HTTPS/TURN/SSTP 选择、凭据解析、全局/名单联动 |
| gRPC User-Agent | Worker 配置字段、原管理页设置 | ConfigFields 的 readonly 集合错误包含 gRPCUserAgent | 可编辑控件及协议相关验证 |
| ECH / 指纹 / TLS | admin HTML saveEch、ech-title 等 | 字段存在，但缺少相关联动约束及解释 | 按原真实行为核对兼容组合，不能凭提示文字删掉协议能力 |
| 路径模板 | admin HTML savePathTemplateConfig | 只有递归字段编辑 | 模板校验、默认值恢复和正确生成节点路径 |
| 转换后端检测/选择 | admin HTML load SUBAPI 列表、testSubAPI | 仅编辑字段 | 可用性检查和明确测试结果；裸域名校验任务已被用户叫停，不能混入其他提交 |
| Cloudflare 集成 | Worker getCloudflareUsage、admin HTML testCloudflareConfig | 保存凭据及概览数据已接入，独立检测流程未接入 | 使用 POST 的检测 API/界面，不能将凭据放入浏览器 URL |
| Telegram 集成 | admin HTML testTelegramConfig | 保存凭据和通知算法已有，检测界面没有 | 明确区分凭据校验与实际发送测试消息；实际发送按用户授权处理 |
| 日志展示 | Worker log.json、admin HTML 日志窗口 | 原始 JSON 列表 | 按字段展示和检索；不能误称存在参考没有的删除接口 |
| 网络/IP 信息 | admin HTML fetchAndShowIpDetail / 代理状态 | 仅显示检测 JSON | 出口/IP/地域结果展示，外部查询明确标注来源 |
| Snippet 代码生成 | admin HTML generateUUIDSnippetCode | 未实现 | 先核对生成代码用途与独立必要性；不自动归入无功能彩蛋 |

## 已有但未充分验收

VLESS/Trojan/SS、WS/gRPC/XHTTP、DNS/DoH、TCP 竞速和回退、ProxyIP/SOCKS5/HTTP/HTTPS/TURN/SSTP、TLS、转换客户端补丁存在于迁移模块。自动化只覆盖部分协议向量和受控流，不代表所有组合、实际客户端、TLS 握手和长连接已验收。

特别应核查请求状态隔离、socket 包装是否完整保留能力、TCP 回退、各传输首包和结束语义、SS 加密流、TURN/SSTP 异常和清理。逐项以真实行为结果记录，不能以源码出现函数名作为完成依据。

## 补齐顺序

1. 先修影响核心配置的表单和模式联动，补订阅格式入口、二维码/导入及链式代理流程。
2. 补转换检查、集成检查、日志/出口信息展示、路径模板和 ECH 联动。
3. 实现浏览器优选的必要操作及结果保存/导出；评估 Snippet 生成的独立用途。
4. 建立协议/传输/代理组合验收记录，按受控测试、真实客户端测试与外部环境限制分别记录。

真正应排除的是无功能宗教填充、仿错误页、混淆彩蛋和源文件自动覆盖。功能性工具不能仅因来自远程管理页面就省略。


## 补齐实施记录

以上初始缺口及后续复核发现已逐项落实到本地功能模块，详见 `../feature-matrix.md` 的管理工作流表。新增七种订阅分享/二维码/导入/下载；节点表单约束、订阅模式、代理模式和路径预设；API 地址导入、链式节点；浏览器优选/下载测速/来源库/机房目录/筛选/追加与覆盖/导出及本地工具目录；公共账号代理和 PROXYIP 目录；网络出口、站点采样、IP 详情、隐私与主题；转换器和配置规则预设；集成检查与 Telegram 开关；Snippet 展示/复制/下载；日志筛选与导出。

浏览器优选并非静态表格：OPTIONS/GET、下载字节、并发池、超时与取消均有受控行为测试。保存默认追加，覆盖必须显式选择。代理/API/转换输入变更使先前验证失效。站点 no-cors 耗时与可读取优选探测分开描述。

源码审查进一步发现并修正目录异步请求的旧结果污染，以及转换工具验证/保存 URL 不一致和输入变更竞态。此前用户叫停的全局裸域名修复仅保存在忽略的 work 文件，不混入本次迁移。

Snippet 来源在本次复核读取为 28,355 字节，SHA256 `aaa14e03929139b01eee042215896ec6b1caefa057cafb409d87d12e2a90ae5f`，未检测到希伯来字符。它是单独可变的上游文件，因此生成边界还拒绝不兼容的填充源码；不靠静默删除可执行代码来保证功能。应用 src/server/shared 亦未包含希伯来字符。

真实网络协议的验收限制仍然有效：本次不声称实际 TURN/SSTP/HTTPS 代理、所有客户端/传输组合及外部转换服务均端到端通过；未使用生产凭据发通知或运行公开地址批量探测。


## 最终本地验证

- 10 个测试文件、85 项检查全部通过，包含网络受控流、工具响应校验、代理目录请求世代/取消、转换保存竞态、禁止填充的 Snippet 输入、配置/分享和优选实测算法。
- Vue 与 Worker TypeScript 检查、Vite 双生产构建、Wrangler deploy --dry-run 通过；dry-run 正确绑定实际生产 KV，未执行部署。
- 独立虚拟 KV 的 Chrome 浏览器：登录、七种二维码、主题持久化、配置保存刷新、实际本地订阅、全部管理深链接、Origin/认证；零浏览器异常。
- 进一步 Chrome 流程：专家模式/UA/取消、转换预设、验证后的 API URL/地址导入、输入变更重验、链式追加、优选保留原库、公开代理与 PROXYIP 目录/检查/应用、切换清空旧选择、TG 开关、浏览器出口隐私与站点图表；外部响应受控，零浏览器异常。
- 最后构建的压缩/混淆文件经独立静态预览并接入虚拟 KV API 跑通登录、七种二维码、设置/地址保存、订阅与深链接；生产文件没有 sourcemap。
- 后续真实外部服务和所有协议组合仍按照功能矩阵单独验收。

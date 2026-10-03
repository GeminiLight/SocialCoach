# ModelScope 创空间部署

状态：已公开部署，ModelScope 返回 Running（2026-10-04）；Blender 人物、五类 3D 空间与按需展开的操作界面已更新。最新公共浏览器验收限制见文末。

本地验证：隔离目录使用锁定依赖完成生产构建与 TypeScript 检查；standalone 服务在 7860 端口启动，首页、设置、场景目录、health 和 manifest 均返回 HTTP 200。云端 Docker 构建及启动均通过。

## 线上记录

- 空间：[GeminiLight/SocialCoach](https://modelscope.cn/studios/GeminiLight/SocialCoach)。公开，Apache-2.0，免费 `platform/2v-cpu-16g-mem`。
- 应用 host：`https://geminilight-socialcoach.ms.show`。自动化 API 检查使用平台提示的专用地址 `https://studio-geminilight-socialcoach.api-inference.modelscope.net`，该地址需要 ModelScope Bearer token，不能当作无需认证的普通分享链接。
- 空间 Git：`https://modelscope.cn/studios/GeminiLight/SocialCoach.git`，分支 `master`，当前应用部署提交 `128d487`（2026-10-04，3D 对象选择 / 编辑焦点稳定，对应 GitHub 应用提交 `7cb0ebf`）。通过独立克隆同步应用必需文件，未将本地 Git 历史、环境变量或其他文档上传。
- 同步步骤（本机钥匙串已有推送凭证）：克隆空间仓库；`rsync -a --delete` 主仓库的 `app/src/`、`app/public/`，复制 `app/` 下的 `next.config.ts`、`package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、`postcss.config.mjs`、`tsconfig.json`、`next-env.d.ts`，以及根目录 `Dockerfile`、`.dockerignore`、`LICENSE`；不带 `app/scripts`、`.env*`、`AGENTS.md`、eslint 配置；空间自己的 `README.md`（含卡片 frontmatter）不动。提交后 `git push origin master`。**推送不会自动重建**：2026-09-10 推送 `ceee413` 后 25 分钟空间仍在跑旧构建。重建走 OpenAPI：`POST https://modelscope.cn/openapi/v1/studios/GeminiLight/SocialCoach/deploy`，`Authorization: Bearer <token>`，token 就是本机 git 钥匙串里 modelscope.cn 的密码（`printf 'protocol=https\nhost=modelscope.cn\n\n' | git credential fill`），不要落盘。状态用 `GET …/studios/GeminiLight/SocialCoach`（Building → Running），日志 `GET …/logs/build` 与 `…/logs/run`。
- 环境变量：非敏感配置在明文变量 `GET/POST/PUT …/variables`（`{"key","value"}`），敏感值在 `…/secrets`（只回 key）。空间现有布局：`LLM_API_KEY`、`FEEDBACK_FEISHU_APP_SECRET` 是 secret，其余 LLM / 限流 / 飞书 app id、base token、table id、`FEEDBACK_DEPLOYMENT=ModelScope` 都是明文变量。完整端点见本机 skill `~/.claude/skills/modelscope-studio`。
- 统计：2026-09-10 通过 API 加明文变量 `ANALYTICS_FEISHU_TABLE_PREFIX=events`（复用已有 `FEEDBACK_FEISHU_*`）并触发重建；没有它 `/api/track` 报不可用，客户端不发。
- 模型沿用本机 `app/.env.local` 中的 LLM 配置，`LLM_API_KEY` 放入 Secrets；未同步 Vercel 令牌。限流为每 IP 每小时 45 次、全站每日 2000 次；计数在内存，重启后会重置。
- HTTP 验收：首页、设置、场景目录、图标及 health 为 200；14 个 CSS / JS 资源均为 200。health 返回 `serverKey=true`、`requireByok=false`。
- 合成加薪场景：roleplay 71 个响应块，约 1.56 秒首块、4.58 秒结束，包含 `@@meta` 和 `@@linda`，无流内错误。
- 同一测试对话的 assess：647 个响应块，约 13.56 秒首块、26.99 秒结束，包含可解析的 `@@final`、3 条优势和 2 条弱项及引文，无流内错误。耗时是单次测量，不是性能承诺。
- Chrome 实际打开创空间，确认「运行中」、嵌入应用 onboarding 及中文切换正常。未完成浏览器端整轮练习与记录刷新检查，该扩展验收已单列 backlog。
- 首次启动曾因 Alpine 系统用户的 nologin shell 失败；改为 `/bin/sh` 后 Running，详见 [踩坑记录](../80-known-pitfalls.md)。

## 部署边界

### 统一域名（2026-09-09 已启用）

- 分享入口：`https://socialcoach.aurax.live/`。
- Cloudflare DNS：代理 A 记录 `192.0.2.0`，自动 TTL，仅用于边缘跳转，无源站。
- 两条 Single Redirects 均限定 `http.host eq "socialcoach.aurax.live"`：`ip.src.country eq "CN"` → `https://modelscope.cn/studios/GeminiLight/SocialCoach?mode=full`；`ne "CN"` → `https://socialcoach-ai.vercel.app/`。状态码均为 302，不保留路径和查询参数。港澳台走其他地区分支；代理/VPN 会影响 IP 地区判断。
- DNS 记录 ID：`a031b4bdc21402a71c24dbc552d20955`；ruleset ID：`b5edb41140ba49daa4c72e12b2a12e6e`。通过已登录控制台创建，API 回读确认代理和两条规则均启用。
- 实际 HTTPS 验证：本机直连返回 302 → 魔搭；经现有海外代理返回 302 → Vercel。Trace API 的 geoloc 模拟未正确区分 CN/US，不作为地区验收依据。

- 国内入口使用 `?mode=full`：已在 Chrome 验证只显示嵌入应用，隐藏魔搭空间标题、内容/反馈/管理栏；浏览器地址仍为魔搭域名。直接访问 `.ms.show` 也会跳到此全屏入口。

### 应用运行

- 首次使用跟随浏览器语言，保留中英文切换；已有档案使用用户保存的语言选择。

- 部署完整 Next.js 应用，使用 Docker SDK；根目录 `Dockerfile` 以 `app/` 为源码目录，监听 `0.0.0.0:7860`。
- 根目录 `.dockerignore` 只允许构建必需文件进入镜像，不包含本地环境变量、Git 历史、营销草稿或构建缓存。
- 现有 `app/Dockerfile` 继续用于原有自托管流程。
- 单进程运行，无账号、无数据库；练习记录仍在浏览器，不同站点域名之间不自动共享。
- 使用用户账号当前可用的免费 CPU 规格，创建前实时查询，不写死配额。公开或私有由用户指定。
- 根目录 Apache-2.0 `LICENSE` 随运行镜像保留，空间卡片声明同一许可证。

## 账号与配置

需要 ModelScope 访问令牌，以及 Docker 创空间所需的阿里云绑定和实名认证。
令牌从 `MODELSCOPE_API_KEY` 或用户指定的本机文件读取，不进入仓库或日志。

非敏感环境变量：`LLM_PROVIDER`、`LLM_BASE_URL`、`LLM_FAST_MODEL`、`LLM_SMART_MODEL`，按实际供应商设置。
`LLM_API_KEY` 通过空间 Secrets 注入。保留现有按 IP 和全局限流；若启用 `LLM_REQUIRE_BYOK=true`，用户在浏览器配置自己的模型连接。

## 上线验收

- 构建成功，空间状态为 Running。
- 首页、设置页、场景页及 CSS / 图标可访问。
- `/api/health` 正常，不返回密钥。
- 实际完成一次角色对话和复盘，确认平台代理不缓冲流式输出。
- 验证模型服务从空间可达，以及浏览器刷新后的练习记录。
- 在空间嵌入页和独立应用地址分别检查本地存储行为。

## 来源

- [ModelScope Docker 创空间说明](https://modelscope.cn/docs/studios/docker)
- [ModelScope 官方部署技能](https://modelscope.cn/skills/modelscope/modelscope-studio)

## 完整版本更新（2026-09-09 01:50 CST）

- 将当前工作区完整应用快照同步到两端，包含未提交的新组件；发布结束再次比较源码哈希，快照与工作区 `app/src`、`app/public` 一致。
- ModelScope：`94b57ba`，构建成功并 Running。
- Vercel：`dpl_GSywssSnbCd1cYwnxGssxQYrpykK`，已正式发布至 `socialcoach-ai.vercel.app`。
- 更新包括头像选择 / 外观调整、限时应答、练习与复盘界面；保留现有模型、反馈收件与地区跳转配置。
- 隔离目录按锁文件安装依赖，生产构建及类型检查通过；源码 ESLint、头像校验、反馈检查、模式引文保护检查通过。
- 两端 `/settings`、`/api/health`、`/api/feedback` 均为 200；模型凭证可用、反馈配置可用；各 15 个页面引用资源全部 200。
- 两端使用合成沉默事件请求 roleplay，均返回 200、`@@meta` 与角色输出，无 `@@error`。这是线上接口冒烟检查，不代表完整计时交互或模型行为质量验收。

## 场景封面更新（2026-09-09 16:07 CST）

- 同步当前完整源码快照；本轮增量为 `ScenarioCover.tsx` 和 `globals.css`。发布结束源码哈希再次核对一致。
- ModelScope：`539715b`，构建成功、Running。
- Vercel：`dpl_5X2dSqKvdn7YuKjZ3LEhw1EkTv23`，正式别名 `socialcoach-ai.vercel.app` 已更新。
- 隔离目录锁定依赖安装、生产构建、TypeScript 和改动组件 ESLint 通过。
- 两端 `/arena` 返回 200，各 16 个引用资源全部 200，线上资源中均确认包含新封面布局。health 与反馈可用性接口正常。此次样式更新未重复执行模型对话或发送测试反馈。

## 通用练习策略与产品体验更新（2026-09-21）

- GitHub 应用提交：`51697dd`；先快进保留远端 README 的友链改动，再提交本地完整实现及回归脚本。
- Vercel：GitHub main 自动发布 `dpl_4QCZd7h4oHDb6T8jbUodDMDekEyg`，平台返回 Ready，生产别名 `socialcoach-ai.vercel.app` 与 `socialcoach-app.vercel.app` 保持不变。此处验收使用 Vercel 部署状态与别名检查，未重新执行 Vercel 线上模型回归。
- ModelScope：`5b2352b`，OpenAPI 显式触发重建；构建日志的镜像标签包含该提交，状态 Building → Deploying → Running，监听 `0.0.0.0:7860`。独立克隆的 `app/src`、`app/public` 与 GitHub 发布源码逐文件哈希一致。
- 原创空间、公开性、免费硬件、模型与飞书配置、地区跳转及网址均保持。没有迁移、清空或重建用户练习存储，也没有删除飞书反馈。
- 存储兼容：保留 `localStorage["socialcoach.v1"]`、version 0 和全部既有持久化字段；旧报告新增字段均可缺省，不重算历史评分。8 项浏览器升级检查验证旧复盘、已有发言的未结束对话、档案、收藏、自建场景、熟练度与设置在六次页面打开 / 刷新后逐字段不变。另 15 项交互回归、18 项策略检查、匿名统计检查与 ESLint 通过；本轮沿用此前通过的正式构建 / 80 组布局 / 40 次可访问性扫描，云端两端构建也通过。
- ModelScope 线上：首页、场景、设置、health、feedback、track 均 HTTP 200；服务器模型可用、无需 BYOK、反馈与统计均配置可用。未发送测试反馈或测试统计记录。
- 合成对话冒烟：两次 roleplay 返回角色输出与 `@@meta`，约 4.6–4.9 秒；assess 返回可解析的 `@@final` 与 `scoringVersion=2`。首次额外的「标题引文必须非空且原样匹配」断言未满足；第二次按接口的可选引文契约检查通过，实际获得精确标题引文和 1 条有效技能评分，约 30.8 秒。不能把这两个样本视为模型质量保证，标题引文降级比例与评分偏好继续纳入盲测。
- 用户历史仍受浏览器存储边界约束：同一浏览器和原有站点保留；清除站点数据、换设备或在国内 / 海外两个实际域名间切换，不会自动带入另一个来源的记录。发布本身没有改变这一边界。

## 体验精修与中断恢复更新（2026-10-02）

- 用户明确授权部署前两轮已经验证的改动。GitHub 应用提交 `adaae5c`，ModelScope `52c5b78`；两端 `app/src` / `app/public` 共 102 个文件逐文件一致，构建配置按既有白名单同步，空间 README 与环境配置保留。
- Vercel GitHub main 自动生产发布 `dpl_DZUF4DWEc43nDPr4ectrY96GGidV`，平台 Ready，别名 `socialcoach-ai.vercel.app` / `socialcoach-app.vercel.app` 已关联。使用部署列表的提交 SHA 与 inspect 的 target / status / aliases 验证；本轮没有重新发送 Vercel 线上模型请求或执行 Vercel 浏览器回归。
- ModelScope 显式重建，镜像标签包含 `52c5b788`；Building → Deploying → Running，运行日志显示 Next.js 在 `0.0.0.0:7860` Ready。原有公开性、免费 CPU、模型、飞书与统一域名分流配置没有改动。
- 专用 API 地址：首页、目录、设置、health 及首页引用的 15 个 CSS / JS 资源均为 200；服务器模型可用，无需 BYOK。合成 roleplay 有 meta 与 NPC 台词，无 error，读取 55 块，首块约 2.59 秒、完成约 4.69 秒；assess 返回可解析的 final / scoringVersion=2、1 条有效评分，无 error，约 33.18 秒。这只是单次接口检查；复盘正文按当前验证后再发的流程输出，未据此声明所有代理都不缓冲。
- 公共 host 的非浏览器请求返回平台的 SDK 专用地址提示；带标准浏览器 UA 与 ModelScope Referer 后可读到实际 HTML 和 14 个 JS 资源，确认包含 `socialcoach-recovery.json`、`pr_reply_interrupted` 和 `pr_silence_interrupted`，证明公共资源已更新。
- **公共浏览器验收未通过。** 本机独立 Chromium 打开创空间全屏页时，iframe 仍显示“意外终止了连接”；通过系统已有代理、调整 UA 或限定 TLS 版本复核后仍未解决。原生浏览器自动化入口也超时，不能据此推断真实浏览器一定失败。原因尚未定位，保留为平台入口 / 当前网络的待验证项；没有为绕过问题关闭证书校验、改变公开权限或修改域名分流。需要实际用户浏览器与另一网络继续复核。
- 浏览器检查使用独立会话，并拦截可选统计；合成模型请求不写入用户档案。没有发送产品反馈或测试统计，不清空历史记录。发布前的 168 个布局组合、88 次扫描、12 项中断回归、14 项 store 检查、19 项策略检查及工程验证见两份评审，不视为完整线上实体设备验收。

[本次发布证据](../../docs/reviews/release-2026-10-02/README.md)；体验与剩余工作见 [成熟度评审](../reviews/review-2026-10-01-product-maturity.md)和 [中断恢复评审](../reviews/review-2026-10-01-practice-recovery.md)。

## 复盘助手更新（2026-10-02）

- GitHub `89163d6`，Vercel 生产部署 `dpl_Cmre25CciEBqQogA3PgQVMgVWHYi` Ready；ModelScope `7b676ca` 显式重建后 Running。`app/src` / `app/public` 共 106 个文件逐个哈希一致。
- 新增本次练习的多轮复盘咨询、知识卡片入口、本地问答与导出，部署和 BYOK 共用原话 / 来源校验。23 项任务、38 项浏览器检查、既有关键旅程和真实模型样本通过。
- 两端新助手 API 合成请求均返回 200 且原话 / 来源有效；Vercel 浏览器资源确认包含新接口。国内仍通过凭证后端执行，未重复公共 iframe 浏览器验收，上一节的连接限制不因此视为解决。
- [交付评审](../reviews/review-2026-10-02-debrief-assistant.md)与 [验证材料](../../docs/reviews/debrief-assistant-2026-10-02/README.md)。

## Blender 3D 人物与空间更新（2026-10-03）

- GitHub 应用提交 `5770e5c`，Vercel 生产部署 `dpl_948uqZnMXbjo7BC7ytSr7VbfGshW` Ready；正式别名 `socialcoach-ai.vercel.app` / `socialcoach-app.vercel.app` 指向该部署。公开主站的 GLB 清单与首页预览 JPG 均 HTTP 200，字节与主仓库一致。
- ModelScope `307cc9e`，独立克隆按既有白名单同步，`app/src` / `app/public` 共 221 文件逐个一致。OpenAPI 显式重建后 Running；构建日志包含完整提交与 `363578-307cc9ed-2026-10-03-23-12-57` 镜像标签，构建成功。专用认证 API 的素材清单与首页 JPG 均 200 且匹配主仓库。两端各 24 个 GLB 实际下载，48 次 HTTP / SHA256 检查全部通过；资源核对记录保存在评审的测量摘要。
- 本次没有改动免费硬件、空间公开性或环境配置。没有发送线上模型、反馈或统计测试请求。此前已授权并验证的主站功能随应用快照一并更新，不另维护 Studio 实现。
- 发布后浏览器自动化入口连续超时，未完成线上实际画面验收；公共 host 的非浏览器请求出现 TLS EOF。素材一致、平台 Running 不代表公共浏览器入口问题已解决。本地真实网页的五类空间、视角 / 移动 / 举杯检查及 161 项回归见 [交付评审](../reviews/review-2026-10-03-3d-blender.md)，实体手机性能仍待验证。

## 3D 操作收敛更新（2026-10-04）

- GitHub 应用提交 `9cb2fd9`，Vercel 生产部署 `dpl_BYVQLew1uuUUwBNH7vwxS6LJSMyu` Ready；正式别名已更新。顶部常驻入口收敛为视角、历史和更多，走动摇杆与事件操作按需展开，对象选择改为单行。
- ModelScope `fca06a0`，`app/src` / `app/public` 共 223 文件与主仓库逐个一致，按既有配置显式重建后 Running。构建日志包含该提交、成功标记及镜像标签 `363578-fca06a0b-2026-10-04-00-15-12`。
- 两端 `/3d` 均返回 200，各两份 CSS 包含新操作样式，首页预览 JPG 字节与主仓库一致。没有发送线上模型、反馈或统计测试请求，也未改动空间配置。
- 165 项检查、lint、生产构建通过；本地正式构建实际检查 364×696 中文、320×568 英文和 1280×720 桌面，以及走动松手停止、开关门、历史、草稿与对象保留。线上浏览器打开超时，本轮不宣称公共入口画面或实体手机验收完成。详见 [操作收敛评审](../reviews/review-2026-10-04-3d-controls.md)。

同日补充 `7cb0ebf` / ModelScope `128d487`：修复焦点提示撑高 HUD 的 19px 跳动，24 次分组实际测量在人物 / 焦点切换后均保持坐标和尺寸不变。Vercel `dpl_AD68zjDf9PqdmEHXVHhm5MRCivnn` Ready、正式别名已关联；国内 Running，构建日志包含该提交、成功标记与 `363578-128d4873-2026-10-04-00-37-26`。仅同步 `globals.css`，223 份应用源码 / 素材逐个一致；两端 `/3d` 及 CSS 中的固定占位 / 可见性规则已核对。没有更改空间配置或发送线上测试请求，实际浏览器交互证明仍来自本地正式构建。见 [验收补充](../reviews/review-2026-10-04-3d-controls.md#人物选择的布局稳定性同日补充)。

## 条件式剧情与十开局更新（2026-10-04）

- GitHub 应用 `63eec9b`，Vercel 生产 `dpl_EipWu2kxcdiVbGY2LfSYUnUfXHg1` Ready、正式别名已关联。十开局短冲突 / 条件式转折、内部剧情记忆、事实与承诺边界；文字与排练同调。没有上线鱼头 / 倒酒玩法。
- ModelScope `8423a4e`，同步主站当前完整应用必要源码（含主线此前已提交的首页精修），`app/src` / `app/public` 226 文件逐个一致。显式重建后 Running；成功构建及镜像 `363578-8423a4eb-2026-10-04-02-28-45` 已核对。原免费 CPU、空间公开性、README 和环境配置保留。
- 两端 `/3d` 与 health 200，各 16 个页面引用资源全部 200；两端分别连续两次合成 3D 请求通过基本结构 / 当轮原文校验。国内走平台专用认证 API，未宣称公共浏览器 / iframe 整轮验收。没有发送测试反馈或统计。
- 172 项 3D 检查及 47 项文字续聊 / 结构 / 策略检查、lint / 正式构建通过；模型回放保留 217 条接受回复及初始失败材料。真实语义与玩家兴趣仍有边界。本轮浏览器控制连接超时，连续网页 / 手机验收未通过。详见 [剧情评审](../reviews/review-2026-10-04-scene-craft.md)。

## 文字帮忙时间保护（2026-10-04）

- 主站应用 `b550edb`，Vercel 生产 `dpl_E9V6Dm4o3eLxPRDdfFRpue868Wii` Ready；国内 `2a73aed` 显式重建后 Running，镜像 `363578-2a73aed5-2026-10-04-03-15-26` 成功构建。源码 / 素材 227 文件逐个一致，空间配置和免费硬件保留。
- 仅 `office-quick-favor` 在完整输出前检查已复现的假帮忙时间，服务端 / BYOK 共用既有一次修复。正常调用数不增加，但首段显示可能更晚；不能称为性能优化或全量事实校验。
- 10 项新增事实检查与原有文字检查、lint / 生产构建通过。最终 15 个真实模型样本没有错误帮忙时间，前两轮漏检原件保留；其他事实、提前揭示隐藏内容和网页试玩仍待验证。详见 [评审与原件](../reviews/review-2026-10-04-scene-craft.md)。
- 两端 `/3d` / health 与各 16 个静态引用资源均 200，各两轮合成文字请求确认自己的报告截止与帮忙时间未约定。国内为平台认证 API；公共 iframe 与连续浏览器 / 手机验收未补齐。

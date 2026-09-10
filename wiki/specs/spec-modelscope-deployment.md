# ModelScope 创空间部署

状态：已公开部署，ModelScope 返回 Running（2026-09-09）。

本地验证：隔离目录使用锁定依赖完成生产构建与 TypeScript 检查；standalone 服务在 7860 端口启动，首页、设置、场景目录、health 和 manifest 均返回 HTTP 200。云端 Docker 构建及启动均通过。

## 线上记录

- 空间：[GeminiLight/SocialCoach](https://modelscope.cn/studios/GeminiLight/SocialCoach)。公开，Apache-2.0，免费 `platform/2v-cpu-16g-mem`。
- 应用 host：`https://geminilight-socialcoach.ms.show`。自动化 API 检查使用平台提示的专用地址 `https://studio-geminilight-socialcoach.api-inference.modelscope.net`，该地址需要 ModelScope Bearer token，不能当作无需认证的普通分享链接。
- 空间 Git：`https://modelscope.cn/studios/GeminiLight/SocialCoach.git`，分支 `master`，当前部署提交 `ceee413`（2026-09-10 同步匿名使用统计与首页稿纸封面，对应 GitHub main `83fe573`）。通过独立克隆同步应用必需文件，未将本地 Git 历史、环境变量或其他文档上传。
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

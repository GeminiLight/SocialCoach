<!-- Last verified: 2026-10-03 | Current stage: B -->

# Backlog

> 周 / 迭代级任务：bug、技术债、改进想法。完成后打勾保留；发版时从已完成条目整理进 `90-changelog.md`，再清理。
> 月 / 季度级方向放 [01-project-roadmap.md](./01-project-roadmap.md)。

## Bug

- [x] 2026-10-02 本地修复六组复现问题：准备失败仍可开练、半截回复污染转录、刷新 / 暂停失去恢复入口、最后回合仍可输入、复盘重复更新能力 / 日期、损坏档案导致空白。→ [评审与证据](./reviews/review-2026-10-01-practice-recovery.md)、[相关根因](./81-postmortem-practice-continuity.md)

- [x] README 两处 `REPLACE-WITH-YOUR-URL` 是死链（导航行 + Live 徽章）。2026-09-08 已替换为 `https://socialcoach-app.vercel.app`（`curl` 确认 title / lang 是本项目）；仓库 homepage 字段也从 404 的 `socialcoach-lime` 改为该地址

## 技术债

- [ ] 2026-09-21 README 截图仍是 2026-09-08 的真实演示，早于本次核心路径 UI 精修；需重新采集中英各三张同一流程截图，可再录制一段真实对练到复盘的短演示。英文 README 已先切换为现有英文素材。
- [ ] 2026-09-21 文档核对发现 `.env.example` 的 `LLM_FAST_MODEL` / `LLM_SMART_MODEL` 留空，而 `llm.ts` 用 `??` 回退，空字符串不会采用默认模型。README 已明确要求填写两个可用模型 ID；后续决定配置校验或空值回退策略。

- [ ] **46 个场景里有 29 个包含 `hidden`（底牌，2026-10-01 实数）。** 其余 17 个会跳过揭示屏，直接进报告。是否补齐应按场景教学目标判断，并保留来源；补语料另行定义范围。

- [x] 缺 `LICENSE` 文件。2026-09-09 用户选定 Apache-2.0，已加入官方许可全文及 README License 一节，注明第三方材料保留各自权利。
- [ ] `app/` 的 8/8 页面路由为 `use client`，原始 HTML 缺少可读正文；官网 `site/` 已有可索引的双语产品与论文介绍，以及 5 个双语场景预览（共 12 页），完整语料落地页仍待建设。→ [12-stage-c.md](./12-stage-c.md)
- [ ] 2026-09-23 SEO 复核：域名根目录的 `robots.txt` 仅指向个人站点 sitemap，该 sitemap 不含 SocialCoach；官网子路径 sitemap 已扩充至 12 页。个人站点 [PR #14](https://github.com/GeminiLight/geminilight.github.io/pull/14) 增加第二条 Sitemap 指令，但私有仓库 CI 因 GitHub 账户付款 / Actions 额度问题未启动，按该仓库规则暂不合并。之后仍需在 Search Console 核对实际收录与搜索查询。
- [ ] 2026-09-23 HTTP 版官网仍返回 200。Pages API 开启 `https_enforced` 因证书不存在被拒绝；构建里的绝对 URL 已统一为 HTTPS，后续仍应在域名托管层配置 HTTP → HTTPS 重定向或修复 Pages 证书配置。
- [ ] 2026-09-23 arXiv 摘要页与 v2 PDF 首页的作者顺序不一致；官网和 README 按 PDF 排列，论文提交者需核对上游元数据。→ [80-known-pitfalls.md](./80-known-pitfalls.md#arxiv-摘要页与-pdf-首页的作者顺序不同)
- [ ] `docs/PRODUCT.md` 已被 [00-product-proposal.md](./00-product-proposal.md) 取代。保留作历史，但需在文件头加一行指向 wiki，避免 Agent 读到过时定位
- [x] 已有语料 / 头像检查和浏览器体验回归。2026-10-01 本地正式构建通过 152 个页面组合、80 次自动可访问性扫描及关键行为回归；这不覆盖模型语义质量或真实设备。→ [成熟度评审](./reviews/review-2026-10-01-product-maturity.md)
- [x] 2026-09-09 `app/scripts/check-avatars.ts` 已同步新版 `portraitFor`，验证保存、改名稳定性与旧种子回退；全量 `tsc --noEmit` 通过。

## 改进想法

- [x] 2026-10-03 中英文 README 顶部左上角以紧凑单行展示香港科技大学（广州）与中国科学技术大学的官方横版校名 Logo（各宽 120 px，间距约 12 px），链接到各校官网；素材本地保存并记录[出处](../docs/logos/README.md)，保留原始图形与色彩，港科广深色模式切换官方白色版。

- [x] 2026-10-02 本次练习的复盘 AI 助手：知识点解释、如何应用与连续追问；引用本次原话、已有知识来源、问答保存在设备；38 项 UI 与 23 项任务检查通过。→ [方案](./archive/specs/spec-debrief-assistant.md)

- [x] 官网上线（2026-09-08，`https://tianfuwang.tech/SocialCoach/`）。仍待决定：是否绑独立域名（官网主域 + 产品子域），以及 Pages 的 HTTPS 强制开关（当前 `https_enforced: false`）
- [x] 产品截图放 `docs/screenshots/` 与 `site/assets/`，中英各三张（2026-09-08）
- [x] 仓库 homepage 字段 2026-09-08 指向当时的应用域名；2026-09-23 改为可抓取的双语官网 `https://tianfuwang.tech/SocialCoach/`，README 在线体验徽章仍直达应用。
- [ ] 英文版官网的三张截图是英文界面，但演示对话里的学习者名字是 Sam；中文版是小周。若要统一，重跑 `site/scripts/screenshots.mjs` 改 `profile.name`
- [x] 2026-10-01 `/learn` 详情增加最多 3 个共享技能的既有场景，可直接进入准备流程；没有声称案例直接来源于某条理论。→ [成熟度评审](./reviews/review-2026-10-01-product-maturity.md)
- [ ] 情境筛选 chip 用的是 `taxonomy` 里的 emoji `glyph`，与编辑感排版有张力，是否保留待定
- [ ] `/arena` 截图右边缘有一个被裁切的圆形元素，未定位到来源（`page.tsx:106` 那个装饰圆在首页，不是这里）

- [x] 2026-10-01 欢迎 / 设置共用 `LanguagePicker`，统一双语标签、选中语义及至少 44px 触区。

- [ ] P1 同场景前后对照：先展示两场用户原话，再解释具体变化；保留旧报告，不能只比较星数或 NPC 是否让步。→ [成熟度评审](./reviews/review-2026-10-01-product-maturity.md#下一轮工作按价值排序)
- [ ] P1 本地备份恢复：导入前预览版本和数量，显式选择合并 / 替换，失败保留原档案，密钥不入文件；不引入账号或服务器练习档案。
- [x] 2026-10-02 损坏 JSON / 存储访问拒绝的启动恢复：双语原因说明、保护原始字节、原样备份、重试及确认重置。上述完整导入 / 合并仍待完成。
- [ ] P1 真实场景校正：开始前能修正自己的身份、关系、目标，并明确重生成范围；不提前展示或编辑 NPC 底牌。
- [ ] P2 首次成长空状态：少展示零值和空图，解释能力估计与证据覆盖；不把无记录包装为能力不足。
- [ ] P2 排练预览与准备适配的两段等待：测 P50 / P90 及失败率后决定复用边界，不为省时绕过身份匹配。

- [x] 产品截图三张（首页 / 对话中 / 复盘报告）放 `docs/screenshots/`，排进 README pitch 段落下方（2026-09-08）
- [ ] README 章节名是否加 emoji（三个参考项目都加，与设计反参考冲突）——需要显式决定，见 [11-stage-b.md](./11-stage-b.md#b3-readme-结构)
- [ ] Star History 图表（等 star 有量后再加）
- [ ] `Architecture` 流程图的节点名仍是论文术语（`Prescription` / `Adaptation` / `Bounded proficiency delta`）。是否换成用户语言待定——换了对产品读者友好，但与代码的对应关系变弱
- [ ] 发布火力句 `ChatGPT will agree with you. Your boss won't.` 已定稿待用，用于 HN / Product Hunt / 小红书发布帖
- [ ] `You know what to say. You just can't say it yet.` 作为落地页副本 / 广告变体
- [ ] 统计后续：真实飞书凭证下验证自动建月表（`bitable:app`）与 `search` 过滤语法；飞书仪表盘按「事件 = session_start」建每日局数与场景分布两张图；Postgres 迁移路径：Supabase / Neon 免费档（0.5 GB，免费档一周不用会暂停，Pro 每月约 25 美元）或阿里云 RDS PostgreSQL Serverless（每月几十元），迁移是导出各月表 CSV 灌库并替换 `deliverEvents`，客户端不改
- [ ] 限时应答后续：耐心秒数按场景难度给默认值（difficulty 3 → 10 秒）；沉默事件是否进入跨场次模式识别（`/api/pattern`）作为「一被顶就冻住」的证据；reduced motion 下的墨线与「开着朗读时等台词读完再计时」未单独验证

## 既有布局改造

- [x] 2026-10-01 核对：桌面 token、三档断点、侧栏 / 边注、`use-media.ts` 与正文 Source Serif 4 均已在本轮开始时的干净工作区中，不再属于“另一 session 未提交”。当前规范见 [设计原则](./03-design-principle.md)。

## 待验证

- [ ] 2026-10-02 ModelScope 公共嵌入页浏览器复核：平台 Running，专用地址页面 / 资源 / 对话 / 复盘均通过，公开地址带浏览器请求头的 HTTP 检查确认新版本；本机独立 Chromium 的 iframe 仍显示连接异常。需在实际用户浏览器和另一网络复核，不能把后台 API 成功当作完整公共访问验收。→ [发布记录](./specs/spec-modelscope-deployment.md#体验精修与中断恢复更新2026-10-02)

- [ ] 2026-10-02 真实模型小样本中，明确退出的原话被舞台提示概括为“什么都没说”；收尾引文正确，但提示语义不准确。扩大双语多回合盲测，区分 NPC 表现、事实总结与复盘评价；不能只断言结构和成功率。→ [第二轮评审](./reviews/review-2026-10-01-practice-recovery.md)
- [ ] 本地持久化继续验证合法 JSON 的坏 schema、写入配额 / 权限变化、跨标签页并发与旧版已受污染转录；本轮启动恢复及单实例报告防重不等于这些场景已覆盖。

- [ ] 复盘标题引文的有效率与降级体验：2026-09-21 魔搭合成冒烟有一次未满足非空精确引文断言，下一次精确引文及评分通过；需要扩大样本统计，保留证据校验，不以放宽引用规则换命中率。

- [ ] 2026-09-21 UI 精修上线后的真实 iOS Safari / Android 软键盘、读屏与长对话检查；本轮覆盖 Chromium 模拟视口及本地正式构建，尚未替代实体设备验收。

- [x] ModelScope 国内体验入口：2026-09-09 已公开部署，免费 CPU、Apache-2.0；页面资源及对话 / 复盘流式接口通过。见 [部署记录](./specs/spec-modelscope-deployment.md)。
- [ ] ModelScope 扩展验收：完成一轮浏览器端练习并刷新验证记录，比较创空间嵌入页与独立域名的浏览器存储隔离；本次已验证嵌入页加载与语言切换。

- [ ] Vercel 部署后确认流式路由（`/api/roleplay`、`/api/assess`）在 Vercel 边缘缓冲下正常工作——本地正常不代表线上正常，`X-Accel-Buffering: no` 已设但未在线上验证
- [ ] `/api/assess` 的 `maxDuration = 180` 是否够用（Vercel 计划有函数时长上限）

## 已完成（待整理进 changelog）

- [x] 2026-10-02 练习中断与档案恢复（已双平台部署）：完整回复才写转录、刷新 / 暂停恢复、结束窗口锁定、复盘只应用一次；损坏档案有保护与恢复入口。→ [评审](./reviews/review-2026-10-01-practice-recovery.md)

- [x] 2026-10-01 产品成熟度精修（2026-10-02 已双平台部署）：欢迎可直接排练 / 选场景，完整设置保留；首页按需推荐、续接未完复盘；知识关联练习；复盘主动作改为重练且保留旧报告；修复折叠焦点、颜色对比、长回合触区、手机反馈遮挡与动画等待。→ [评审与证据](./reviews/review-2026-10-01-product-maturity.md)

- [x] 2026-09-21 中英 README 精修：首屏定位、场景与三步体验、同语言截图、入口域名、部署折叠、数据说明及论文作者顺序；GitHub Markdown 渲染、相对链接与锚点检查通过。→ [评审](./reviews/review-2026-09-21-readme.md)。

- [x] 2026-09-21 核心路径 UI/UX 精修：练习进程、紧凑目录与状态保留、草稿恢复、历史阅读保护、复盘章节导航、真实等待文案及辅助阅读语义。含本地浏览器回归脚本；2026-09-21 已发布至 Vercel 与 ModelScope → [评审](./archive/reviews/review-2026-09-21-product-ux.md)。

- [x] 2026-09-17 为本人飞书账号添加 SocialCoach 反馈与统计 Base 的 `full_access`（可管理）权限，读回确认；B11 收口，[反馈方案](./archive/specs/spec-user-feedback.md)已归档。

- [x] 2026-09-09 头像生成与选择重做：固定比例的人物肖像、24 款起点、五组配色、外观微调、保存前预览 / 取消 / 恢复、改名后稳定及设备导出；见 [头像规范](./03-design-principle.md#头像avatar--avatarfigure)。

- [x] 2026-09-07 UI/UX 打磨：首页周记录与熟练度说明、场景目录与组合筛选、排练描述草稿与填写引导、统一品牌图形、原生弹窗与明确退出操作。验收见 [界面评审](./archive/reviews/review-2026-09-07-ui-ux.md)

- [x] 核心定位定稿：敌人是「建议」、知道≠做到、A/B 客户分层 → [11-stage-b.md](./11-stage-b.md#b1-核心定位)
- [x] 主句定稿 `Say the thing you've been not saying.` 并三处对齐（README / `layout.tsx` / `manifest.webmanifest`）
- [x] README 按开源产品惯例重排（Key features / Architecture / Quick start / Deployment / Tech stack / Design / Contributing / Disclaimer / Research）
- [x] 品牌 banner 明暗双版（`docs/banner.svg` / `banner-dark.svg`），色值由 `globals.css` OKLCH 精确换算
- [x] 删除 `app/README.md`（30/44 行与根 README 重复）
- [x] wiki 文档体系建立
- [x] 胶囊开关修复：抽成 `ui.tsx` 的 `Switch`，显式水平锚点、border-box 几何重算、OFF 态对比度
- [x] `/arena` `/learn` 打磨：tile 改对手头像、桌面网格补齐、技能墙折叠、详情栏加纸面容器
- [x] 场景封面重做：改为「对方的第一句话」，废掉按 context 的气泡 motif，清掉四处粉彩父底色
- [x] 应用图标重做：竖直分色心 + 墨色火花，含独立 maskable 变体、manifest 修正、PNG 重导 → 规范见 [03-design-principle.md](./03-design-principle.md#应用图标)
- [x] 删除临时布局夹具 `/api/dev-seed`（无环境守卫，曾有上线泄漏风险）→ 教训已收进 [80-known-pitfalls.md](./80-known-pitfalls.md)

- [x] 2026-09-07 其他页面精修：知识目录与阅读排版、收藏搜索与收起内容焦点隔离、设置资料与偏好控件，以及首页 / 练习场 / 排练引导细节；验收续记在 [界面评审](./archive/reviews/review-2026-09-07-ui-ux.md)。

- [x] 2026-09-07 语料多样化：新增 12 场景、8 知识、6 教学示例；补充来源链接与语料完整性检查。见 [来源记录](./refs/corpus-sources-2026-09.md)。

## 通用练习策略（2026-09-21）

- [x] 修复推荐随机兜底绕过核心约束；增加可迁移角色相容性判断。
- [x] 初始目标结果与沟通质量分开；提前结束校验真实收尾引文；提示/复盘隔离 NPC 底牌；新旧评分显式区分。
- [ ] 扩大跨情境、跨语言、多回合的人工盲测，关注过度顺从、责任边界、模型臆造事实、替代建议是否强迫用户承担额外任务；小样本通过不代表全量质量保证。
- [ ] 测量新增角色匹配调用的实际等待时间与无匹配率，评估是否需要在简报前补问用户角色。当前仅把不确定性写入适配上下文。

实现、验证与边界见 [通用策略方案](./archive/specs/spec-general-practice-policy.md)。

## 3D 饭局接入（2026-10-03）

- [x] 扩展多轮连续剧情：六种开局、默认 12 回合 / 可续至 24、按话题推进、指定对象、完整已听历史、修复错答上一句与插曲抢话 → [方案](./archive/specs/spec-3d-story-continuity.md)。
- [x] 收紧 3D 单轮台词、重做对象选择、提供包含开场的完整对话记录；保留旧长句与草稿，桌面侧栏 / 手机面板 → [验收](./reviews/review-2026-10-03-3d-conversation-ui.md)。
- [ ] 扩大饭局自由输入盲测，覆盖反讽、隐含指代、反悔及不同语言；当前引文校验不能保证模型对承诺和角色权限的每次解释都准确。

- [x] 主站人物第二轮重塑：连续头颈、衣身到袖子、膝盖与手腕握持；78 项检查、九位角色近景和完整坐立姿态通过 → [验收](./reviews/review-2026-10-03-3d-anatomy.md)。

- [x] 3D 原型接入主站 `/3d`、常驻入口、一次性公告、主站模型与 BYOK；原独立仓库保留。
- [x] 人物第一轮面部重塑：连续鼻梁、眼睑内虹膜、平滑法线、头发防穿透、柔和肤色与补光、衣领 / 翻领贴合、抱臂姿态及奖杯遮脸修正；73 项检查通过 → [人物验收](./reviews/review-2026-10-03-3d-characters.md)。
- [ ] 真实手机与真实麦克风的语音识别 / 全屏体验验证；浏览器识别服务是否可用依赖浏览器与网络。
- [ ] 后续角色资产仍需进一步打磨；当前程序模型为交互原型，不能以照片级真实宣传。

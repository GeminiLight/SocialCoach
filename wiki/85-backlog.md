<!-- Last verified: 2026-09-03 | Current stage: B -->

# Backlog

> 周 / 迭代级任务：bug、技术债、改进想法。完成后打勾保留；发版时从已完成条目整理进 `90-changelog.md`，再清理。
> 月 / 季度级方向放 [01-project-roadmap.md](./01-project-roadmap.md)。

## Bug

- [x] README 两处 `REPLACE-WITH-YOUR-URL` 是死链（导航行 + Live 徽章）。2026-09-08 已替换为 `https://socialcoach-app.vercel.app`（`curl` 确认 title / lang 是本项目）；仓库 homepage 字段也从 404 的 `socialcoach-lime` 改为该地址

## 技术债

- [ ] 2026-09-21 README 截图仍是 2026-09-08 的真实演示，早于本次核心路径 UI 精修；需重新采集中英各三张同一流程截图，可再录制一段真实对练到复盘的短演示。英文 README 已先切换为现有英文素材。
- [ ] 2026-09-21 文档核对发现 `.env.example` 的 `LLM_FAST_MODEL` / `LLM_SMART_MODEL` 留空，而 `llm.ts` 用 `??` 回退，空字符串不会采用默认模型。README 已明确要求填写两个可用模型 ID；后续决定配置校验或空值回退策略。

- [ ] **34 个场景里只有 17 个有 `hidden`（底牌）。** 没有底牌的场景会跳过揭示屏，直接进报告——机制只在一半场景里生效。补另外 17 个属于扩语料，按项目约束需要用户点头

- [x] 缺 `LICENSE` 文件。2026-09-09 用户选定 Apache-2.0，已加入官方许可全文及 README License 一节，注明第三方材料保留各自权利。
- [ ] `app/` 的 8/8 页面路由为 `use client`，原始 HTML 缺少可读正文；官网 `site/` 已有可索引的双语产品与论文介绍，但语料落地页仍待建设。→ [12-stage-c.md](./12-stage-c.md)
- [ ] `docs/PRODUCT.md` 已被 [00-product-proposal.md](./00-product-proposal.md) 取代。保留作历史，但需在文件头加一行指向 wiki，避免 Agent 读到过时定位
- [ ] 无任何自动化测试。语料的类型正确性（`skills` / `context` / `competencies` 是否为合法 id）目前只靠 TS 编译和运行时校验
- [x] 2026-09-09 `app/scripts/check-avatars.ts` 已同步新版 `portraitFor`，验证保存、改名稳定性与旧种子回退；全量 `tsc --noEmit` 通过。

## 改进想法

- [x] 官网上线（2026-09-08，`https://tianfuwang.tech/SocialCoach/`）。仍待决定：是否绑独立域名（官网主域 + 产品子域），以及 Pages 的 HTTPS 强制开关（当前 `https_enforced: false`）
- [x] 产品截图放 `docs/screenshots/` 与 `site/assets/`，中英各三张（2026-09-08）
- [x] 仓库 homepage 字段改为 `socialcoach-app.vercel.app`（2026-09-08）
- [ ] 英文版官网的三张截图是英文界面，但演示对话里的学习者名字是 Sam；中文版是小周。若要统一，重跑 `site/scripts/screenshots.mjs` 改 `profile.name`
- [ ] `/learn` 详情栏在条目短时下方仍有大片空白。真正的解法是填入相关内容（引用该理论的案例、可练这个技能的场景），属于功能而非打磨
- [ ] 情境筛选 chip 用的是 `taxonomy` 里的 emoji `glyph`，与编辑感排版有张力，是否保留待定
- [ ] `/arena` 截图右边缘有一个被裁切的圆形元素，未定位到来源（`page.tsx:106` 那个装饰圆在首页，不是这里）

- [ ] 语言切换胶囊在 `settings/page.tsx` 与 `onboarding/page.tsx` 各写了一份完全相同的 markup，应抽成 `Segmented` 组件（无 bug，但改一处不会同步另一处）

- [x] 产品截图三张（首页 / 对话中 / 复盘报告）放 `docs/screenshots/`，排进 README pitch 段落下方（2026-09-08）
- [ ] README 章节名是否加 emoji（三个参考项目都加，与设计反参考冲突）——需要显式决定，见 [11-stage-b.md](./11-stage-b.md#b3-readme-结构)
- [ ] Star History 图表（等 star 有量后再加）
- [ ] `Architecture` 流程图的节点名仍是论文术语（`Prescription` / `Adaptation` / `Bounded proficiency delta`）。是否换成用户语言待定——换了对产品读者友好，但与代码的对应关系变弱
- [ ] 发布火力句 `ChatGPT will agree with you. Your boss won't.` 已定稿待用，用于 HN / Product Hunt / 小红书发布帖
- [ ] `You know what to say. You just can't say it yet.` 作为落地页副本 / 广告变体
- [ ] 统计后续：真实飞书凭证下验证自动建月表（`bitable:app`）与 `search` 过滤语法；飞书仪表盘按「事件 = session_start」建每日局数与场景分布两张图；Postgres 迁移路径：Supabase / Neon 免费档（0.5 GB，免费档一周不用会暂停，Pro 每月约 25 美元）或阿里云 RDS PostgreSQL Serverless（每月几十元），迁移是导出各月表 CSV 灌库并替换 `deliverEvents`，客户端不改
- [ ] 限时应答后续：耐心秒数按场景难度给默认值（difficulty 3 → 10 秒）；沉默事件是否进入跨场次模式识别（`/api/pattern`）作为「一被顶就冻住」的证据；reduced motion 下的墨线与「开着朗读时等台词读完再计时」未单独验证

## 进行中（另一 session，未提交）

- [ ] 桌面版布局改造：新增 `--rail-w` / `--content-max` / `--margin-w` / `--measure` token，`.sheet` / `.bar-fixed` 三档断点，侧栏导航 + 边注列；新增 `app/src/lib/use-media.ts`
- [ ] 正文字体从 Hanken Grotesk 换为 Source Serif 4，中文回落改宋体系
- [ ] 上述改动涉及 18 个组件 / 页面文件，全部未提交。**本 wiki 的 `03-design-principle.md` 已按当前磁盘状态记录 token 与断点，组件层细节可能继续变动**

## 待验证

- [ ] 复盘标题引文的有效率与降级体验：2026-09-21 魔搭合成冒烟有一次未满足非空精确引文断言，下一次精确引文及评分通过；需要扩大样本统计，保留证据校验，不以放宽引用规则换命中率。

- [ ] 2026-09-21 UI 精修上线后的真实 iOS Safari / Android 软键盘、读屏与长对话检查；本轮覆盖 Chromium 模拟视口及本地正式构建，尚未替代实体设备验收。

- [x] ModelScope 国内体验入口：2026-09-09 已公开部署，免费 CPU、Apache-2.0；页面资源及对话 / 复盘流式接口通过。见 [部署记录](./specs/spec-modelscope-deployment.md)。
- [ ] ModelScope 扩展验收：完成一轮浏览器端练习并刷新验证记录，比较创空间嵌入页与独立域名的浏览器存储隔离；本次已验证嵌入页加载与语言切换。

- [ ] Vercel 部署后确认流式路由（`/api/roleplay`、`/api/assess`）在 Vercel 边缘缓冲下正常工作——本地正常不代表线上正常，`X-Accel-Buffering: no` 已设但未在线上验证
- [ ] `/api/assess` 的 `maxDuration = 180` 是否够用（Vercel 计划有函数时长上限）

## 已完成（待整理进 changelog）

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

<!-- Last verified: 2026-09-03 | Current stage: B -->

# Backlog

> 周 / 迭代级任务：bug、技术债、改进想法。完成后打勾保留；发版时从已完成条目整理进 `90-changelog.md`，再清理。
> 月 / 季度级方向放 [01-project-roadmap.md](./01-project-roadmap.md)。

## Bug

- [x] README 两处 `REPLACE-WITH-YOUR-URL` 是死链（导航行 + Live 徽章）。2026-09-08 已替换为 `https://socialcoach-app.vercel.app`（`curl` 确认 title / lang 是本项目）；仓库 homepage 字段也从 404 的 `socialcoach-lime` 改为该地址

## 技术债

- [ ] **34 个场景里只有 17 个有 `hidden`（底牌）。** 没有底牌的场景会跳过揭示屏，直接进报告——机制只在一半场景里生效。补另外 17 个属于扩语料，按项目约束需要用户点头

- [ ] 缺 `LICENSE` 文件。无许可证会直接挡住团队 / 公司采用，也让 README 无法按开源惯例加 License 一节。**需要用户选定许可证**
- [ ] 8/8 页面路由 `use client`，零可索引性。→ [12-stage-c.md](./12-stage-c.md)
- [ ] `docs/PRODUCT.md` 已被 [00-product-proposal.md](./00-product-proposal.md) 取代。保留作历史，但需在文件头加一行指向 wiki，避免 Agent 读到过时定位
- [ ] 无任何自动化测试。语料的类型正确性（`skills` / `context` / `competencies` 是否为合法 id）目前只靠 TS 编译和运行时校验

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

## 进行中（另一 session，未提交）

- [ ] 桌面版布局改造：新增 `--rail-w` / `--content-max` / `--margin-w` / `--measure` token，`.sheet` / `.bar-fixed` 三档断点，侧栏导航 + 边注列；新增 `app/src/lib/use-media.ts`
- [ ] 正文字体从 Hanken Grotesk 换为 Source Serif 4，中文回落改宋体系
- [ ] 上述改动涉及 18 个组件 / 页面文件，全部未提交。**本 wiki 的 `03-design-principle.md` 已按当前磁盘状态记录 token 与断点，组件层细节可能继续变动**

## 待验证

- [ ] Vercel 部署后确认流式路由（`/api/roleplay`、`/api/assess`）在 Vercel 边缘缓冲下正常工作——本地正常不代表线上正常，`X-Accel-Buffering: no` 已设但未在线上验证
- [ ] `/api/assess` 的 `maxDuration = 180` 是否够用（Vercel 计划有函数时长上限）

## 已完成（待整理进 changelog）

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

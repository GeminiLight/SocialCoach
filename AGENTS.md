# AGENTS.md

SocialCoach —— LLM 社交技能教练。应用在 `app/`（Next.js），仓库根只有文档。

## 入口

1. 先读 `wiki/00-product-proposal.md`（做什么、**不做什么**）和 `wiki/01-project-roadmap.md`（当前阶段、功能索引）。
2. 动 `app/` 里的代码前，读 `app/AGENTS.md` —— Next.js 16 与训练数据差异较大，该文件由 `next dev` 自动维护。
3. 不要一次加载 `wiki/archive/`、`wiki/refs/`、`wiki/reviews/`。

## Wiki

架构 / 数据流改动再读 `wiki/02-system-architecture.md` 与当前 stage；API 改动读 `wiki/04-api-reference.md`；UI 改动读 `wiki/03-design-principle.md`；修 bug 先扫 `wiki/80-known-pitfalls.md`。

本项目用**紧凑编号方案**（`0x` 战略+架构，`1x` 阶段，`8x` 运维）。不要引入 `20-` / `30-` / `6x-` 这类展开方案编号。

开发到以下节点时同步 wiki（不需要每次 commit 都更新）：

| 做了这件事 | 更新 |
|---|---|
| 新增 / 修改 API | `wiki/04-api-reference.md` |
| 完成 stage 内一个功能 | `wiki/01-project-roadmap.md` 对应行状态 |
| 架构变更（新模块、新数据流） | `wiki/02-system-architecture.md` |
| 踩到非显而易见的坑 | `wiki/80-known-pitfalls.md`（现象 / 原因 / 解法 / 教训） |
| 同一模块连续 3+ 相关 bug | 新建 `wiki/81-postmortem-{topic}.md` |
| 发现 bug / 技术债 / 改进想法 | `wiki/85-backlog.md` |
| 新增设计 token / 动效 | `wiki/03-design-principle.md` |
| 阶段全部交付 | `wiki/90-changelog.md`（从 backlog 已完成项整理） |
| 重命名 / 移动 wiki 文件 | 全文搜索旧路径并更新引用 |

新建：功能复杂到一句话说不清 → `wiki/1X-stage-X.md`；小功能需要边界和验收 → `wiki/specs/spec-{name}.md`；外部机制被查阅 2 次以上 → `wiki/refs/{topic}.md`；评审结束 → `wiki/reviews/review-{YYYY-MM-DD}-{subject}.md`。

归档：spec 完成 → `git mv` 到 `wiki/archive/specs/` 并在 backlog 打勾；review 的 action items 全部完成 → `archive/reviews/`；stage 完结且无跨引用 → `archive/stages/`，roadmap 标 `[archived]`。

每个阶段开始时跑一次审计，按 high → medium 处理：

```bash
python3 ~/.claude/skills/project-wiki/scripts/wiki_audit.py wiki/
```

## 项目专有约束

这些约束违反了就是产品定位问题，不是代码风格问题：

- **NPC 不能讨好用户。** 不因态度好就让步、不提前吐露 `hidden`、不在对话内跳出角色做教练。阻力是产品唯一的护城河。
- **任何反馈必须先引用用户原话。** 没有转录证据的评价不出现。
- **语料必须有 `source`。** 不生成无出处的「策略」或「案例」。
- **不引入账号体系或服务端存储。** 状态留在设备上、可导出。
- **面向用户的静态文案是 `L = {zh, en}` 双语对象**，用 `pick(v, lang)` 取值。
- **产品名对外一律是 `SocialCoach`**，中文语境也不例外。中文说明放在名字下面的副行（`nav_workspace`：你的情商练习场），不做第二个名字。
- **主句四处同源**：`README.md`、`app/src/app/layout.tsx` 的 `metadata.description`、`app/public/manifest.webmanifest` 的 `description`、`site/content.mjs` 的 `hero.h1` 与 `footer.tagline`。同源指的是**主句本身逐字一致**，不是整个字符串相等——manifest 只放主句，layout 是主句加一段展开，README 是行文。改主句必须四处一起改。
- **色值只在 `app/src/app/globals.css` 定义**（OKLCH）。组件里不写死颜色；对外 SVG 用脚本换算的 hex。
- **结构化输出走 `jsonCall()` / `extractJSON()`**，不要用 SDK 的 `output_config.format`（当前网关不支持）。

<!-- Last verified: 2026-09-03 | Current stage: B -->

# Stage C — 可索引化与 GEO

> 未开工。本文件是执行前的规格，不是已完成记录。诊断于 2026-09-03。

## 问题陈述

**当前 SEO / GEO 表面积为零。**

```
8 / 8 页面路由全是 "use client"      爬虫拿到的是空壳
零 generateMetadata                  所有页面共用同一个 title
缺 sitemap.ts  robots.ts  metadataBase
缺 OG 图  JSON-LD  hreflang(zh/en)
```

Googlebot 能渲染 JS，但 **GPTBot / ClaudeBot / PerplexityBot 基本不渲染**——它们抓到空 `<body>`。今天任何人问 AI「有没有练社交沟通的 App」，本产品在物理上不可能被提到。

## 两张未启用的资产

| 资产 | 内容 |
|---|---|
| **语料 = 184 个现成落地页** | `src/data/corpus/` 里 92 条内容（34 场景 + 34 理论 + 24 案例）× 中英。场景标题本身就是高意图长尾搜索词（「如何跟老板谈加薪」、「how to decline extra work」），**搜这些词的人和晚上 11 点打开 App 的人是同一批**（A 类客户）。内容已写完，只是索引不到 |
| **论文 = GEO 资产** | 「可引用的权威性」是 LLM 引用谁的核心排序信号，消费级 App 买不到同行评议论文。配 `ScholarlyArticle` + `SoftwareApplication` 与 `llms.txt` 可占住「AI 被问到社交技能训练时引用谁」 |

## 功能汇总

| # | 功能 | 状态 | 备注 |
|---|---|---|---|
| C1 | 语料落地页 SSG（184 页） | 📋 | 核心 |
| C2 | `sitemap.ts` / `robots.ts` / `metadataBase` | 📋 | |
| C3 | 动态 OG 图 | 📋 | |
| C4 | JSON-LD 结构化数据 | 📋 | |
| C5 | `llms.txt` | 📋 | |
| C6 | hreflang（zh / en） | 📋 | 需要 i18n 路由方案 |

---

## C1: 语料落地页

### 边界

**只把语料变成可索引页面，不动练习流程。** `/practice/[id]`、`/arena`、`/progress` 等交互页保持 `use client`——它们依赖 localStorage，本来也不该被索引。

### 待定的关键决策

| 决策点 | 待定 | 说明 |
|---|---|---|
| 路由形态 | `/scenarios/[slug]` + `/library/[slug]`？还是统一 `/s/[slug]`？ | slug 影响 URL 永久性，改一次就丢外链 |
| i18n 路由 | `/[lang]/...` 前缀，还是 `/en/...` + 中文在根？ | 决定 hreflang 怎么写；中文是主语言（`<html lang="zh-CN">`） |
| 与 `/learn` 的关系 | 新落地页替代 `/learn`，还是并存（`/learn` 为登录态浏览器） | 并存会有重复内容风险，需要 canonical |
| 页面上的 CTA | 落地页读者是搜索来的陌生人，主动作应是「练这一场」还是「先读」 | 决定转化路径 |

### 验收标准

- `curl` 一个落地页，`<body>` 里能看到场景标题、背景、目标——**不执行 JS 的前提下**
- 每页有独立 `title` / `description` / canonical / hreflang
- `sitemap.xml` 列出全部 184 页
- 已练过的场景不在落地页泄露用户数据（落地页不读 localStorage）

### 受影响文件（预估）

| 文件 | 改动 |
|---|---|
| `app/src/app/scenarios/[slug]/page.tsx` | 新增，server component + `generateStaticParams` |
| `app/src/app/library/[slug]/page.tsx` | 新增 |
| `app/src/app/sitemap.ts` · `robots.ts` | 新增 |
| `app/src/app/layout.tsx` | 加 `metadataBase`；`description` 已是定稿文案 |
| `app/src/data/corpus/index.ts` | 可能需要导出 slug 映射 |

---

## C4: JSON-LD

| 类型 | 挂在哪 | 关键字段 |
|---|---|---|
| `SoftwareApplication` | 首页 | `name` `applicationCategory` `operatingSystem` `offers` `description`（用定稿主句） |
| `ScholarlyArticle` | `Research` 落地页 / 首页 | `headline` `author`（12 位）`identifier: arXiv:2606.04155` `datePublished: 2026-08-16` |
| `HowTo` 或 `Article` | 每个场景落地页 | 场景标题 + 目标 + 策略；`citation` 指向对应 `Theory.source` |

**每条理论 / 案例都有 `source`（书名 + 作者），这是可以直接映射成 `citation` 的**——多数内容站没有这个。

## C5: `llms.txt`

放 `app/public/llms.txt`。内容：产品一句话定位、论文引用、语料索引（分类 + 落地页 URL 列表）、明确的使用边界（不做临床评估）。目的是让 LLM 在不爬全站的情况下拿到准确摘要。

---

## 前置依赖

C 阶段开工前需要 Stage B 收口：**必须先有线上地址**（`metadataBase`、canonical、sitemap 都要绝对 URL），且 `socialcoach.vercel.app` 已被占用。→ [80-known-pitfalls.md](./80-known-pitfalls.md#部署)

## 遗留讨论

用户 2026-09-03 表示正在另一个 session 专门构建 GEO / SEO / marketing 的可复用 skill（`~/.claude/skills/` 下已有 `geo-optimizer`、`seo-optimizer`、`launch-marketer` 等）。**本阶段开工前先看那些 skill**，避免两边重复决策。

<!-- Last verified: 2026-09-03 | Current stage: B -->

# 项目路线图

## 阶段总览

| 阶段 | 主题 | 状态 | 文件 |
|---|---|---|---|
| A | 产品与语料建成 | ✅ Done | [10-stage-a](./10-stage-a.md) |
| B | 定位与对外物料 | 🚧 In Progress | [11-stage-b](./11-stage-b.md) |
| C | 可索引化与 GEO | 📋 Planned | [12-stage-c](./12-stage-c.md) |
| D | 发布与增长 | 📋 Planned | — 尚未开卡 |

## 功能索引

### Stage A — 产品与语料建成

| # | 功能 | 状态 | 备注 |
|---|---|---|---|
| A1 | 三层语料库（理论 / 案例 / 场景，双语，全部带 `source`） | ✅ | 42 / 30 / 46（2026-09-07 扩充，新增案例明确标为教学示例）；`src/data/corpus/` |
| A2 | 多面分类体系（5 CASEL × 34 技能 × 7 情境 / 26 类型） | ✅ | `src/data/taxonomy.ts` |
| A3 | 自适应排程 `/api/schedule`（处方 → 受约束检索 → 适配） | ✅ | 固定放松顺序，核心约束不放松 |
| A4 | 沉浸式角色扮演 `/api/roleplay`（流式、隐藏动机、目标追踪、回合上限、可失败） | ✅ | `@@characterId` / `@@meta` 文本协议 |
| A5 | 证据式复盘 `/api/assess`（引用原话、acquisition/performance 归因、有界增量） | ✅ | 流式正文 + `@@final` JSON |
| A6 | 知识检索卡片 + 苏格拉底式反思 `/api/reflect` | ✅ | 报告内嵌理论 / 案例 |
| A7 | 对话中提示 `/api/hint` | ✅ | ≤40 词，只点动作不代写 |
| A8 | `/rehearse` 生成真实处境场景 | ✅ | ~15s，输出全量打标场景 |
| A9 | 本地持久化 store + 导出 / 重置 | ✅ | Zustand persist，零注册；排练描述有标签页草稿，重置时同步清理 |
| A10 | 能力雷达 / 熟练度 / 时间线 / 反思日志 | ✅ | `/progress` |
| A11 | 8 个路由页面 + 移动优先 PWA | ✅ | manifest + service worker；2026-09-07 打磨首页、场景目录、排练表单及共享导航 / 弹窗 |
| A12 | 中英双语 UI，模型输出跟随用户语言 | ✅ | `src/lib/i18n.ts` |

### Stage B — 定位与对外物料

| # | 功能 | 状态 | 备注 |
|---|---|---|---|
| B1 | 核心定位陈述（敌人是「建议」；知道≠做到；A/B 客户分层） | ✅ | → [00-product-proposal](./00-product-proposal.md#产品定位) |
| B2 | 主句定稿并三处对齐 | ✅ | README / `layout.tsx` / `manifest.webmanifest` |
| B3 | README 按开源产品惯例重排 | ✅ | Key features / Architecture / Quick start / Deployment / Tech stack / Design / Contributing / Disclaimer / Research |
| B4 | 品牌 banner（明暗双版 SVG，色值由 `globals.css` OKLCH 精确换算） | ✅ | `docs/banner.svg` / `banner-dark.svg` |
| B5 | 产品截图（首页 / 对话中 / 复盘） | 📋 | 阻塞 README 最有效的一块 |
| B6 | LICENSE 文件与 README 章节 | 📋 | 缺许可证会直接挡住团队与公司采用 |
| B7 | Live 站点地址替换 README 占位符 | 📋 | 现为 `REPLACE-WITH-YOUR-URL`，两处 |
| B8 | wiki 文档体系 | 🚧 | 本次建立 |
| B9 | 官网（`site/`：一页式双语静态站，首屏与末节都指向论文） | 🚧 | 2026-09-08 建成并推送，含 JSON-LD / hreflang / sitemap / `llms.txt` / OG 图；上线只差 Settings → Pages 选 GitHub Actions 来源。截图位留空，文件到位自动渲染 → [11-stage-b](./11-stage-b.md#b9-官网) |

### Stage C — 可索引化与 GEO

| # | 功能 | 状态 | 备注 |
|---|---|---|---|
| C1 | 语料落地页 SSG（`corpus` 118 条 × 双语 = 236 页，独立 `generateMetadata`） | 📋 | 当前 8/8 路由 `use client`，爬虫拿到空壳 |
| C2 | `sitemap.ts` / `robots.ts` / `metadataBase` | 📋 | 全缺 |
| C3 | 动态 OG 图（`opengraph-image.tsx`） | 📋 | 全缺 |
| C4 | JSON-LD：`SoftwareApplication` + `ScholarlyArticle` | 📋 | 论文是 GEO 资产 |
| C5 | `llms.txt` 与 LLM 可引用结构 | 📋 | GPTBot / ClaudeBot / PerplexityBot 基本不渲染 JS |
| C6 | hreflang（zh / en） | 📋 | 现无 i18n 路由 |

## 里程碑

| 日期 | 里程碑 | 状态 |
|---|---|---|
| 2026-09-03 | Stage A 全量交付（首个 commit `bae956f`） | ✅ |
| 2026-09-03 | 定位定稿 + 主句三处对齐 + README 重排 + banner | ✅ |
| 2026-09-03 | wiki 体系建立 | 🚧 |
| — | 线上可访问 + LICENSE + 截图（Stage B 收口） | 📋 |
| — | 236 个落地页可被 LLM 爬虫读到（Stage C 收口） | 📋 |

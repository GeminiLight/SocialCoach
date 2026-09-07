<!-- Last verified: 2026-09-03 | Current stage: B -->

# 系统架构

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 16.3.4（App Router）· React 19.2.8 · TypeScript 5 |
| 样式 | Tailwind v4（`@tailwindcss/postcss`）+ `globals.css` 里的 OKLCH design token |
| 状态 | Zustand 5（`persist` 到 localStorage） |
| 动效 | Framer Motion 13 |
| 校验 | Zod 4 |
| LLM | `@anthropic-ai/sdk` 0.123，双模型路由（fast / smart） |
| 存储 | **无数据库、无账号**。练习档案在 localStorage；未提交的排练描述在当前标签页 sessionStorage |
| 部署 | Vercel，Node runtime API routes，Root Directory = `app` |
| 包管理 | pnpm 11.24 |

单进程应用，无 worker / daemon / 定时任务。

## 目录结构

```
SocialCoach/
├── app/                          Next.js 应用（Vercel Root Directory）
│   ├── src/app/
│   │   ├── api/                  6 条 LLM 路由 → 详见 ./04-api-reference.md
│   │   ├── layout.tsx            metadata（含对外文案，改动需三处同步）
│   │   ├── globals.css           OKLCH design token 的唯一来源
│   │   └── {onboarding,arena,rehearse,progress,learn,settings}/  8 个页面路由
│   │       └── practice/[id]/    简报 → 对话 → 复盘，单路由三阶段
│   ├── src/components/           Shell / Radar / Knowledge / practice/{Chat,Briefing,Debrief}
│   ├── src/data/
│   │   ├── taxonomy.ts           5 CASEL × 34 技能 × 7 情境（分类的唯一来源）
│   │   └── corpus/               theories(42) · cases(30) · scenarios-a(16)+b(18)+c(12)
│   ├── src/lib/                  llm · prompts · retrieval · types · i18n · api-utils
│   │                             partial-json · format · session-utils · client-api · use-media
│   ├── src/store/useApp.ts       全部客户端状态
│   ├── public/manifest.webmanifest  PWA（含对外文案）
│   └── .impeccable.md            设计 brief → 详见 ./03-design-principle.md
├── docs/
│   ├── PRODUCT.md                早期产品定义（已被 wiki/00 取代，保留作历史）
│   ├── banner.svg / banner-dark.svg   README 品牌 banner
│   └── reference/                paper.txt · fig10/11
├── site/                         官网：一页式双语静态站，独立于 app/ → 详见 ./11-stage-b.md#b9-官网
│   ├── content.mjs               全部文案（L(zh, en) 双语对象）+ 站点 / app / 论文 URL
│   ├── build.mjs                 零依赖构建 → dist/（/ 中文，/en/ 英文，sitemap · robots · llms.txt · 404）
│   ├── scripts/og.mjs            用 app 的 sharp 生成 assets/og-{zh,en}.png
│   └── assets/                   icon.svg（与 app/public 同源）· OG 图 · 产品截图（可选，存在才渲染）
├── .github/workflows/site.yml    site/** 变更 → 构建 → GitHub Pages（Actions 来源；Pages 未启用时绿色跳过）
├── wiki/                         本文档体系
└── README.md                     对外宣传物
```

## 数据流

一轮练习是一条单向链，客户端在 `useApp` 里累积 `Session`：

```
profile/goals/proficiency/history
        │
        ▼  POST /api/schedule           （非流式，一次返回四件套）
  ① 处方 prescription   LLM 产出 JSON：query + core_constraints + optional_constraints + rationale
  ② 检索 retrieval      纯本地函数 retrieveScenario()，不过 LLM
  ③ 适配 adaptation     LLM 重写 briefing / objectives / focus / why
        │
        ▼  POST /api/roleplay          （流式，每回合一次）
  文本协议：@@<characterId> + 台词，末尾 @@meta {objectives,ended,outcome,note}
  客户端边流边解析（partial-json.ts）
        │
        ▼  POST /api/assess            （流式，正文先出，@@final 后带完整 JSON）
  诊断 → 归因 → 检索理论/案例 → 生成报告；服务端 clamp 所有数值后才发 @@final
        │
        ▼  POST /api/reflect           （流式）针对用户的回答给教练回应
        │
        ▼  applyReport() 写回 proficiency（有界、非负增量）
```

**检索的关键约束**（`src/lib/retrieval.ts`，对应论文 §4.3.1）：

- **核心约束永不放松**：`target_skills` 命中（`skills` 或 `relatedSkills`）+ `contexts` 命中。
- **可选约束按固定顺序放松**，每次放松都记进 `RetrievalTrace.relaxed`：`relationship_types` → `difficulty` → `related_skills`。
- 仍无候选时才放松 `exclude_history`（允许重复练过的场景），再无则返回 `null`。
- 排序 = 标签对齐（主技能 ×2 + 相关技能 ×1）+ 对 `query` 的词汇匹配分。**没有向量检索、没有 embedding**。
- `custom: true`（用户 `/rehearse` 生成的）场景永远不进排程池。

## 核心类型

```typescript
// src/data/corpus/types.ts — 语料三层
interface Scenario {                     // K_s 实践层
  id: string; title: L; hook: L; background: L;
  context: ContextId; contextType: L;
  competencies: CompetencyId[]; skills: SkillId[]; relatedSkills?: SkillId[];
  relationship: RelationshipType[]; difficulty: 1 | 2 | 3; minutes: number;
  characters: Character[];               // 含 stance 与 hidden
  objectives: L[]; success: L; failure: L; maxTurns: number;
  opening: { characterId: string; text: L };
  source: string; keywords: string[]; custom?: boolean;
}
interface Character { id; name: L; role: L; personality: L; stance: L; hidden?: L; playable?: boolean; hue: number }
interface Theory { id; title: L; source: {book;author}; principle: L; howTo: L[]; competencies; skills; keywords }
interface Case   { id; title: L; source: {book;author}; situation: L; whatHappened: L; takeaway: L; ... }

// src/lib/types.ts — 运行时
type L = { zh: string; en: string };     // 所有面向用户的文案都是双语对象
type Proficiency = Partial<Record<SkillId, number>>;   // 1–5，估计值

interface Prescription { query; core_constraints: {target_skills; contexts?}; optional_constraints?; rationale }
interface RetrievalTrace { relaxed: string[]; candidates: number; chosen: string }
interface Adaptation { learnerCharacterId; briefing; objectives: string[]; focus; why? }

interface WeaknessItem { behavior; evidence; skill; deficit: "acquisition" | "performance"; whyItMatters }
interface Report {
  stars: 0|1|2|3; outcome: "success"|"partial"|"failure"; summary;
  strengths: EvidenceItem[]; weaknesses: WeaknessItem[]; alternatives: Alternative[];
  knowledge: { theoryIds: string[]; caseIds: string[]; whyThis };
  reflectionQuestions: string[]; nextStep; deltas: Proficiency;
}
interface Session {                      // 一轮练习的完整快照，存在 localStorage
  id; scenario: Scenario; learnerCharacterId;
  prescription?; adaptation?; retrieval?;
  messages: ChatMessage[]; objectiveDone: boolean[];
  status: "briefing"|"active"|"ended"|"assessed";
  report?: Report; reflections: Reflection[];
  origin: "scheduled" | "arena" | "rehearse";
}
```

**`L` 类型是全局约定**：任何面向用户的静态文案都是 `{zh, en}`，用 `pick(v, lang)` 取值。新增语料字段若面向用户，必须是 `L`。

### 排练描述草稿（2026-09-07）

`/rehearse` 每次输入时把描述写入 `sessionStorage["socialcoach.rehearsal-draft"]`，回到页面或刷新时恢复。清空输入会删除该键；`useApp.reset()` 同时删除当前标签页的草稿。存储不可用时继续保留内存中的输入，并不显示保存成功提示。草稿最多 800 字符，不引入任何服务端持久化；点击生成时仍走原有 `/api/rehearse` 请求。成功生成的场景继续由 `customScenarios` 保存。

## API 路由概览

> 完整契约见 [04-api-reference.md](./04-api-reference.md)。

| 方法 | 路径 | 用途 | 模型 | 返回 | maxDuration |
|---|---|---|---|---|---|
| POST | `/api/schedule` | 处方 → 检索 → 适配 | fast | JSON | 120 |
| POST | `/api/roleplay` | NPC 对话回合 | fast | 文本流 | 60 |
| POST | `/api/assess` | 复盘报告 | **smart** | 文本流 + `@@final` | 180 |
| POST | `/api/reflect` | 反思回应 | fast | 文本流 | 30 |
| POST | `/api/hint` | 对话中提示 | fast | JSON | 30 |
| POST | `/api/rehearse` | 生成自定义场景 | fast | JSON | 120 |

## 环境变量

| 变量 | 用途 | 默认值 |
|---|---|---|
| `ANTHROPIC_API_KEY` | 凭证（或 `ANTHROPIC_AUTH_TOKEN`） | 必填 |
| `ANTHROPIC_BASE_URL` | 自定义网关 / 代理 | 空 = `api.anthropic.com` |
| `LLM_FAST_MODEL` | 对话 / 提示 / 排程 / 生成场景 | `claude-sonnet-5` |
| `LLM_SMART_MODEL` | 复盘报告 | `claude-opus-5` |

客户端 `Anthropic` 实例是单例，`maxRetries: 2`，`timeout: 120_000`（`src/lib/llm.ts`）。

## 构建命令

```bash
cd app
pnpm install
pnpm dev            # 开发 → http://localhost:3000
pnpm build && pnpm start   # 生产
pnpm lint
```

### 2026-09-07 语料扩充

`corpus/index.ts` 聚合既有语料与 `scenarios-c` / `theories-c` / `cases-c`，因此目录、排程与复盘检索共用新增内容。`sources.ts` 集中维护本轮查证的 8 个来源；知识 source 新增可选 `url`，共享正文组件在知识页与复盘中呈现依据链接。旧数据无需迁移。新增案例的标题、情境和要点明确标注教学示例，避免被检索后误当作真实报告。完整清单见 [来源记录](./refs/corpus-sources-2026-09.md)。

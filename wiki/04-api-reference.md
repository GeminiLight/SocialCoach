<!-- Last verified: 2026-09-03 | Current stage: B -->

# API 参考

> 设计决策见各 stage 文件，本文件只记录活跃 API 的完整契约。架构位置与数据流见 [02-system-architecture.md](./02-system-architecture.md#数据流)。

## 概览

| 方法 | 路径 | 用途 | 模型 | 返回形态 | maxDuration | 引入阶段 |
|---|---|---|---|---|---|---|
| POST | `/api/schedule` | 处方 → 角色相容性 → 受约束检索 → 简报适配 | fast | JSON | 120 | A |
| POST | `/api/roleplay` | NPC 对话回合 | fast | 文本流（自定义协议） | 60 | A |
| POST | `/api/assess` | 复盘报告 | smart | 文本流 + `@@final` JSON | 180 | A |
| POST | `/api/reflect` | 反思回应 | fast | 文本流 | 30 | A |
| POST | `/api/hint` | 对话中提示 | fast | JSON | 30 | A |
| POST | `/api/rehearse` | 从真实处境生成场景 | fast | JSON | 120 | A |
| POST | `/api/pattern` | 跨场次的反复模式 | smart | JSON | 60 | B |

**全局约定**

- 所有路由都是 Node runtime，无鉴权（本产品无账号体系）。
- `lang` 由 `asLang()` 收敛：只有 `"en"` 判为英文，其余一律 `"zh"`。
- 错误统一走 `fail(e)` → `{ "error": "<message>" }`，状态码由 `toHttpError()` 映射。
- 三条流式路由的错误在流内以 `\n@@error\n<message>` 追加，HTTP 状态码仍是 200 —— **客户端必须解析流尾，不能只看状态码**。

---

## 排程

### `POST /api/schedule`

产出今日练习。传 `scenarioId` / `scenario` 时跳过处方与检索，只做角色适配（arena / rehearse 流程用）。

**请求：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `profile` | `Profile` | ✅ | 含 `goals: SkillId[]`、`contexts`、`bio`、`lang` |
| `proficiency` | `Proficiency` | ✅ | `Partial<Record<SkillId, 1–5>>` |
| `history` | `HistoryItem[]` | ✅ | 只取最近 12 条喂给模型 |
| `lang` | `string` | ✅ | |
| `scenarioId` | `string` | — | 指定场景，跳过处方 |
| `scenario` | `Scenario` | — | 直接传入场景对象（`/rehearse` 生成的） |

`HistoryItem`：`{ scenarioId, title, skills[], context, outcome?, stars?, scoringVersion?: 2, at }`

**响应：**

| 字段 | 类型 | 说明 |
|---|---|---|
| `scenario` | `Scenario` | 检索或指定的场景 |
| `prescription` | `Prescription?` | 跳过处方时不返回 |
| `adaptation` | `Adaptation` | 个性化 briefing / objectives / focus / why |
| `retrieval` | `RetrievalTrace?` | `{ relaxed[], candidates, chosen, roleFit?: { characterId, fit: "compatible"\|"uncertain", reason } }`，记录角色相容性与约束放松 |

```json
{
  "scenario": { "id": "salary-raise", "title": { "zh": "…", "en": "…" }, "…": "…" },
  "prescription": {
    "query": "asking for a raise when budget is tight",
    "core_constraints": { "target_skills": ["negotiation"], "contexts": ["workplace"] },
    "optional_constraints": { "difficulty": 2 },
    "rationale": "你上次在对方施压时让步了，这次练住立场。"
  },
  "adaptation": { "learnerCharacterId": "you", "briefing": "…", "objectives": ["…"], "focus": "…", "why": "…" },
  "retrieval": { "relaxed": ["relationship_types"], "candidates": 4, "chosen": "salary-raise" }
}
```

---

## 练习

### `POST /api/roleplay`

推进一个对话回合。**流式，自定义文本协议，不是 SSE、不是 JSON。**

**请求：** `{ scenario, learnerCharacterId, messages: ChatMessage[], lang, learnerName? }`

`messages` 里可以出现 `{ role: "event", kind: "silence", seconds }`：限时应答里用户到点没开口。它占用户的位置进入回合（`(名字 says nothing for 15 seconds.)`），**不计入 `maxTurns`**；服务端按连续沉默次数追加一行系统提示，第二次连续沉默要求 NPC 收场（`ended: true`）。→ [spec-timed-reply](./specs/spec-timed-reply.md)

**响应：** `text/plain` 流。格式严格如下：

```
@@meta
{"objectives":[true,false],"ended":false,"outcome":null,"stance":42,"revealed":false,"note":"你先复述了他的顾虑"}
@@<characterId>
<台词>
（可选第二个 @@<characterId> 块）
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `objectives` | `boolean[]` | 与 `scenario.objectives` 等长，严格按用户实际说出的话判定 |
| `ended` | `boolean` | 模型提出收尾；提前结束还需 `closure` 引文通过校验。目标未达成、遭到拒绝或触发原失败示例不再自动终止 |
| `closure` | `{ kind, learnerQuote?, npcQuote }?` | kind 为 agreement / boundary / deferred / withdrawal。前三者需最近用户原话 + 本回合 NPC 原话；单方离场允许缺用户引文。回合上限、手动结束和限时沉默仍独立生效 |
| `outcome` | `"success"\|"partial"\|"failure"\|null` | `ended` 为 true 时给值 |
| `stance` | `number` 0–100 | 对方离答应还有多远。**这是对方的立场，不是用户的分数**，允许下降；正当边界也可能让对方更抗拒。存进 `session.stanceTrail` |
| `revealed` | `boolean` | 本回合 NPC 是否把 `hidden` 明确说出口。只标事件发生的那一回合，之后回到 false |
| `note` | `string` | ≤12 词的中立舞台提示，第二人称 |

**`@@meta` 必须在台词之前。** 放在末尾时快模型六个回合只输出两次，目标追踪因此长期静默失效。→ [80-known-pitfalls.md](./80-known-pitfalls.md)

**协议约束（改 prompt 时必须保住）：** NPC 不得跳出角色、不得提及目标或 App、不得提前吐露 `hidden`；用户敌意时真实升级或退让，用户用对技能时按比例软化而非立刻投降。→ 详见 [00-product-proposal.md#不做什么](./00-product-proposal.md#不做什么)

---

### `POST /api/track`

匿名使用统计入口。**客户端先 `GET` 询问 `{ available }`，未配置的部署不会收到 POST。**

**请求：** `{ id: uuid, device: uuid, lang, events: TrackEvent[1..20] }`，`events` 是十个事件（`app_open` / `onboarding_done` / `briefing_view` / `session_start` / `session_end` / `debrief_view` / `reflect` / `pattern_view` / `api_error`）的严格联合类型（见 `src/lib/analytics/schema.ts`），多任何字段整批 400。

**响应：** `202 { ok: true }`，写入在 `after()` 里完成；未配置 `204`；跨站 `403`；超 16 KB `413`；每 IP 每小时 240 次后 `429`。

落点是飞书 Base 按月建表，配置见 `.env.example` 的 `ANALYTICS_FEISHU_*`。→ [spec-analytics](./specs/spec-analytics.md)

---

### `POST /api/hint`

对话中的一条提示。

**请求：** `{ scenario, learnerCharacterId, messages, lang, learnerName? }`
**响应：** `{ "hint": "先复述他的顾虑，再提你的诉求。可以说「我理解预算的压力……」" }`

约束：≤40 词，点出动作名 + 可选起头句，**不代写整句**，无夸奖无铺垫。

---

## 复盘

### `POST /api/assess`

生成复盘报告。**沿用文本流协议，但等模型完成并验证引文后才发正文；末尾 `@@final` 追加同一份校验后的 `Report` JSON。** 等待期间 UI 显示已有分析进度；不展示未校验评价。托管与 BYOK 共用 `runAssess()`。

**请求：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `scenario` | `Scenario` | ✅ | |
| `learnerCharacterId` | `string` | ✅ | |
| `messages` | `ChatMessage[]` | ✅ | 完整转录 |
| `goals` | `SkillId[]` | ✅ | 用于把弱项映射到目标技能 |
| `lang` | `string` | ✅ | |
| `learnerName` | `string` | — | |
| `objectiveDone` | `boolean[]` | — | |
| `outcome` | `string` | — | |

**响应：**

```
<校验后的报告 JSON>
@@final
{"scoringVersion":2,"ratings":[{"skill":"communication","level":2,"evidence":"实际用户原话","reason":"情境中的效果"}],"verdictEvidence":"实际用户原话","stars":2,"outcome":"partial","verdict":"你拿到了时间点，代价是把底线交了出去。","summary":"…",
 "strengths":[…],"weaknesses":[…],
 "alternatives":[…],"knowledge":{"theoryIds":[…],"caseIds":[…],"whyThis":"…"},
 "reflectionQuestions":["…","…"],"nextStep":"…","deltas":{"communication":0.4}}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `scoringVersion` | `2` | 新报告的评分口径；旧报告缺失此字段，保留旧目标星数 |
| `ratings` | `{skill, level: 0–3, evidence, reason}[]` | 实际练习的目标技能；无目标交集时取场景主技能。每技能一项，必须有用户原话，缺证据不评分 |
| `stars` | `0–3` | 有效 ratings 均值四舍五入，与目标数独立；ratings 为空时数值占位 0，UI 显示未评分 |
| `outcome` | `success / partial / failure` | 初始目标结果，不能从 stars 推导 |
| `verdictEvidence` | `string?` | 经过转录校验的用户原话，显示在判决前 |
| `verdict` | `string` | 有证据的简短判断；无有效 verdictEvidence 时显示证据不足，隐藏 summary |
| `weaknesses[].deficit` | `"acquisition" \| "performance"` | **产品定位的核心字段**，不会 vs 会但没做到 |
| `weaknesses[].evidence` | `string` | 必须是转录里的原话 |
| `knowledge` | `{theoryIds, caseIds, whyThis}` | 由 `retrieveKnowledge()` 检索，非模型编造 |
| `deltas` | `Proficiency` | 有界、非负；服务端 clamp 后才发出 |

共享任务层会校验技能范围、引文确实来自用户（沉默事件只用于行为条目）、去重评分、过滤无证据评价/改写，并限定有证据的技能增量。引文存在不等于解释必然正确，语义公正性仍需行为评测。NPC 私有设定与预设成功/失败模板不传入复盘。

---

### `POST /api/reflect`

对用户的反思作答给出教练回应。

**请求：** `{ scenario, question, answer, lang, summary? }`
**响应：** `text/plain` 流（纯文本，无协议标记）。

---

## 生成

### `POST /api/rehearse`

把用户描述的真实处境变成一个全量打标的场景。

**请求：** `{ description, lang, profile?: { name?, bio?, goals? } }`
**响应：** `{ "scenario": Scenario }` —— 服务端会校验并纠正 `skills` / `context` / `competencies` 是否为合法 id，输出场景带 `custom: true`。

`custom` 场景**不进排程池**（`retrieveScenario` 过滤掉），只能从 `/rehearse` 或历史进入。

---

## 跨场次

### `POST /api/pattern`

在多场已复盘的练习里找**一个**反复出现的行为。产品提案称之为 A→B 的转化引擎：看见它是习惯而不是运气，急性问题才会变成慢性问题。

**请求：** `{ lang, goals: SkillId[], sessions: PatternSession[] }`

`PatternSession` 是把一场练习压平成「可以据以立论的证据」：`{ title, at, outcome?, verdict?, gaveGroundOn: number[], turns, weaknesses: {behavior, evidence, skill, deficit}[] }`。`gaveGroundOn` 是 `stanceTrail` 里下降的那些回合号——同一个回合号在不同场次反复出现，往往就是同一个习惯。

**响应：** `{ found, pattern, why, evidence: {title, quote}[], skill?, nextStep }`，`found: false` 时其余字段为空。

**两条守卫写在代码里而不是 prompt 里**（`src/lib/tasks/pattern.ts`）：

1. 每条 `quote` 必须真的出现在请求发出的 `evidence` 里（标点与空白归一化后比对），编造的引文一律丢弃。
2. 存活的引文必须横跨**至少两个不同场次**，否则退回 `found: false`。

这两条不能只靠 prompt，因为这段话比任何单场复盘都更有说服力，编造出来的破坏也更大。回归测试见 `app/scripts/check-pattern-guard.ts`（5 个断言，含「改了标点的真引文不算编造」这条假警报）。

结果缓存在 store 的 `patternInsight`，键是读过的 session id 集合，只有出现新场次才重跑。**`partialize` 是白名单**，新状态不显式加进去就不会持久化。

---

## 错误码

| 状态码 | 触发 |
|---|---|
| 400 | 入参不合法（如 `/api/rehearse` 的 `description` 少于 8 字符） |
| 401 | `Anthropic.AuthenticationError` —— 凭证无效 |
| 429 | `Anthropic.RateLimitError` |
| 500 | 未归类异常 |
| 502 | `LLMError` 默认值 / `Anthropic.APIError` 无状态码时 |
| 503 | `Anthropic.APIConnectionError` —— 连不上模型 |

流式路由的模型错误发生在流开始之后，只能从流尾的 `@@error` 拿到。


## 用户反馈

### `GET /api/feedback`

返回 `{ available: boolean }`，仅检查四项收件配置是否齐全，不返回凭证，`Cache-Control: no-store`。

### `POST /api/feedback`

JSON：`{ id: UUID, category: bug|character|assessment|idea|other, detail?: string, contact?: string, tags?: string[], rating?: helpful|unhelpful, page: 页面类型, lang: zh|en }`。页面白名单为首页、arena、learn、progress、settings、rehearse、onboarding、practice；practice 不包含会话 ID。标签白名单详见 `feedback/schema.ts`。未知字段拒绝；描述 ≤2000、联系方式 ≤160、标签 ≤3、实际请求体 ≤16 KB。

成功 `{ ok: true, id }`；错误 `{ error: 稳定错误码 }`：400 invalid_request、403 跨站、409 id_conflict、413 too_large、415 非 JSON、429 rate_limited（Retry-After）、503 unavailable、502 delivery_failed。没有真实上游成功响应不会回报送达。Node runtime，maxDuration=30；内存限流和上游幂等限制见 [反馈方案](./archive/specs/spec-user-feedback.md)。

### 通用策略的兼容性补充（2026-09-21）

- `/api/schedule` 核心候选为空或所有角色与用户明确背景冲突时返回 422，提示调整偏好/使用排练。角色匹配模型输出不完整返回 502，不随机换场景。
- `/api/track` 的 `debrief_view` 可新增 `scoring_version: 2`、`rated: boolean`；无版本的旧客户端继续接受。飞书新增「评分口径」「评分状态」两列，分别标识沟通表现/目标达成、已评分/证据不足。历史未标口径行按旧目标星数解释，不能混合比较。
- 引文、评分理由、档案与聊天内容不进入统计事件，严格 schema 继续拒绝多余字段。

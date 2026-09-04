<!-- Last verified: 2026-09-03 | Current stage: B -->

# API 参考

> 设计决策见各 stage 文件，本文件只记录活跃 API 的完整契约。架构位置与数据流见 [02-system-architecture.md](./02-system-architecture.md#数据流)。

## 概览

| 方法 | 路径 | 用途 | 模型 | 返回形态 | maxDuration | 引入阶段 |
|---|---|---|---|---|---|---|
| POST | `/api/schedule` | 处方 → 受约束检索 → 角色适配 | fast | JSON | 120 | A |
| POST | `/api/roleplay` | NPC 对话回合 | fast | 文本流（自定义协议） | 60 | A |
| POST | `/api/assess` | 复盘报告 | smart | 文本流 + `@@final` JSON | 180 | A |
| POST | `/api/reflect` | 反思回应 | fast | 文本流 | 30 | A |
| POST | `/api/hint` | 对话中提示 | fast | JSON | 30 | A |
| POST | `/api/rehearse` | 从真实处境生成场景 | fast | JSON | 120 | A |

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

`HistoryItem`：`{ scenarioId, title, skills[], context, outcome?, stars?, at }`

**响应：**

| 字段 | 类型 | 说明 |
|---|---|---|
| `scenario` | `Scenario` | 检索或指定的场景 |
| `prescription` | `Prescription?` | 跳过处方时不返回 |
| `adaptation` | `Adaptation` | 个性化 briefing / objectives / focus / why |
| `retrieval` | `RetrievalTrace?` | `{ relaxed[], candidates, chosen }`，放松过哪些约束 |

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

**响应：** `text/plain` 流。格式严格如下：

```
@@<characterId>
<台词>
（可选第二个 @@<characterId> 块）
@@meta
{"objectives":[true,false],"ended":false,"outcome":null,"note":"你先复述了他的顾虑"}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `objectives` | `boolean[]` | 与 `scenario.objectives` 等长，严格按用户实际说出的话判定 |
| `ended` | `boolean` | 目标全达成 / 失败条件触发 / 到达 `maxTurns` |
| `outcome` | `"success"\|"partial"\|"failure"\|null` | `ended` 为 true 时给值 |
| `note` | `string` | ≤12 词的中立舞台提示，第二人称 |

**协议约束（改 prompt 时必须保住）：** NPC 不得跳出角色、不得提及目标或 App、不得提前吐露 `hidden`；用户敌意时真实升级或退让，用户用对技能时按比例软化而非立刻投降。→ 详见 [00-product-proposal.md#不做什么](./00-product-proposal.md#不做什么)

---

### `POST /api/hint`

对话中的一条提示。

**请求：** `{ scenario, learnerCharacterId, messages, lang, learnerName? }`
**响应：** `{ "hint": "先复述他的顾虑，再提你的诉求。可以说「我理解预算的压力……」" }`

约束：≤40 词，点出动作名 + 可选起头句，**不代写整句**，无夸奖无铺垫。

---

## 复盘

### `POST /api/assess`

生成复盘报告。**流式：先流正文供 UI 展示进度，末尾以 `@@final` 追加服务端校验并 clamp 过的完整 `Report` JSON。**

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
<正文流…>
@@final
{"stars":2,"outcome":"partial","summary":"…","strengths":[…],"weaknesses":[…],
 "alternatives":[…],"knowledge":{"theoryIds":[…],"caseIds":[…],"whyThis":"…"},
 "reflectionQuestions":["…","…"],"nextStep":"…","deltas":{"negotiation":0.4}}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `weaknesses[].deficit` | `"acquisition" \| "performance"` | **产品定位的核心字段**，不会 vs 会但没做到 |
| `weaknesses[].evidence` | `string` | 必须是转录里的原话 |
| `knowledge` | `{theoryIds, caseIds, whyThis}` | 由 `retrieveKnowledge()` 检索，非模型编造 |
| `deltas` | `Proficiency` | 有界、非负；服务端 clamp 后才发出 |

服务端会校验 `skill` 是否在 `SKILLS` 里、数值是否越界，**客户端可以信任 `@@final` 的每个字段**。

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

<!-- Last verified: 2026-10-06 | Current stage: B -->

# API 参考

> 设计决策见各 stage 文件，本文件只记录活跃 API 的完整契约。架构位置与数据流见 [02-system-architecture.md](./02-system-architecture.md#数据流)。

## 概览

| 方法 | 路径 | 用途 | 模型 | 返回形态 | maxDuration | 引入阶段 |
|---|---|---|---|---|---|---|
| GET | `/api/health` | 模型连接的免费元数据检查 | — | JSON | 默认 | A24 |
| POST | `/api/schedule` | 处方 → 角色相容性 → 受约束检索 → 简报适配 | fast | JSON | 120 | A |
| POST | `/api/roleplay` | NPC 对话回合 | fast | 文本流（自定义协议） | 60 | A |
| POST | `/api/assess` | 复盘报告 | smart | 文本流 + `@@final` JSON | 180 | A |
| POST | `/api/reflect` | 反思回应 | fast | 文本流 | 30 | A |
| POST | `/api/hint` | 对话中提示 | fast | JSON | 30 | A |
| POST | `/api/rehearse` | 从真实处境生成场景 | fast | JSON | 120 | A |
| POST | `/api/dinner/direct` | 3D 实景模型回合 | fast | JSON | 40 | A23 |
| POST | `/api/pattern` | 跨场次的反复模式 | smart | JSON | 60 | B |

**全局约定**

- 所有路由都是 Node runtime，无鉴权（本产品无账号体系）。
- `lang` 由 `asLang()` 收敛：只有 `"en"` 判为英文，其余一律 `"zh"`。
- 错误统一走 `fail(e)` → `{ "error": "<message>", "modelIssue": "<category>" | null }`，状态码由 `toHttpError()` 映射。
- 三条流式路由的错误在流内以 `\n@@error\n{"error":"…","status":401,"modelIssue":"credentials"}` 追加，HTTP 状态码仍是 200 —— **客户端必须解析流尾，不能只看状态码**。

---

## 模型连接

### `GET /api/health`

返回 `{serverKey:boolean, requireByok:boolean, state:"available"|"unverified"|"unavailable", issue?:ModelIssue}`，只返回安全状态，不返回密钥、地址或服务商原始错误。`ModelIssue` 为 `setup|credentials|quota|model|rate_limit|service|network`。缺少部署密钥 / 强制 BYOK 返回 unavailable/setup。

通过服务商认证的 `GET /models`，必要时 `GET /models/{id}` 验证 fast / smart 两档名称和别名；总时限 5 秒、零重试，只读取元数据。绝不退回生成调用。某档未确认时继续核对另一档，不用弱模型的成功推定强模型可用，也不因弱模型未确认而跳过强模型。任一档明确认证、额度、限流或模型不存在返回 unavailable；两档均未发现明确故障但至少一档不支持元数据、CORS 或超时，返回 unverified，允许用户在实际练习中确认。此检查不保证余额或生成权限。

同一进程缓存 120 秒、合并并发检查；实际模型失败在进程内保留 120 秒，浏览器另有独立的即时失败状态。单用户限流不写入全站观察。`?retry=1` 可显式重新免费检查，不自动重试付费生成。Vercel 实例间不共享内存观察。

HTTP / 流式错误的 `modelIssue:null` 明确表示任务自身错误，例如格式 / 引文校验，不因此禁用模型。新版客户端兼容旧版纯文本 `@@error`。方案和验收见 [模型连接](./archive/specs/spec-model-availability.md)。

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

**请求：** `{ scenario, learnerCharacterId, messages: ChatMessage[], lang, learnerName?, turnLimit? }`

`turnLimit` 是当前段落的累计用户回合边界，缺省至少 12 回合；客户端选择续聊后增加 8。场景原来的 `maxTurns` 仍可读取旧档案，但不再触发结束。完整回复的最后一条 NPC 消息可带 `meta`，用于保留已生成的进度与输出格式；旧档案没有这个字段也能继续。

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
| `ended` | `boolean` | 模型提出收尾；必须有有效 `closure` 引文才能提示用户选择。任何模型标志都不自动进入复盘 |
| `closure` | `{ kind, learnerQuote?, npcQuote }?` | kind 为 agreement / boundary / deferred / withdrawal。前三者需最近用户原话 + 本回合 NPC 原话；单方离场允许缺用户引文。有效收尾、段落回合数、两次已回应沉默只显示续聊 / 复盘选项；用户决定是否结束 |
| `outcome` | `"success"\|"partial"\|"failure"\|null` | `ended` 为 true 时给值 |
| `stance` | `number` 0–100 | 对方离答应还有多远。**这是对方的立场，不是用户的分数**，允许下降；正当边界也可能让对方更抗拒。存进 `session.stanceTrail` |
| `revealed` | `boolean` | 本回合 NPC 是否把 `hidden` 明确说出口。只标事件发生的那一回合，之后回到 false |
| `note` | `string` | ≤12 词的中立舞台提示，第二人称 |

**对外协议保持 `@@meta` 在前。** 模型内部改为生成 `{meta,utterances}` JSON，`roleplay-output.ts` 经 `extractJSON()` 和字段校验后转成上述文本流；片段只作可见预览，整个 JSON 完整闭合才进入存档。元信息真实结束后才发送其流前缀，兼容模型把 `meta` 放在末尾。若尚未显示任何 NPC 台词且格式失败，只修复一次；已显示的失败片段不能重新生成并当作原对话保存。→ [80-known-pitfalls.md](./80-known-pitfalls.md)

`office-quick-favor` 另有已复现的狭义时间检查：用户自己的 16:30 报告截止不是帮同事的约定，NPC 建议不能建立承诺。该场景等完整 JSON 通过检查后才发可见台词，首段可能更晚；失败仍只用原有一次未展示修复。再次无效走现有错误流（`RoleplayFactError` 状态 502），保留用户原话，不提交 NPC 回复。请求 / 成功响应字段不变，其他场景仍流式预览；不覆盖所有事实与隐含承诺。

**协议约束（改 prompt 时必须保住）：** NPC 不得跳出角色、不得提及目标或 App、不得提前吐露 `hidden`；用户敌意时真实升级或退让，用户用对技能时按比例软化而非立刻投降。→ 详见 [00-product-proposal.md#不做什么](./00-product-proposal.md#不做什么)

---

场景可带私有双语 `simulationDirection?: L`，供条件式剧情模拟使用；适配 / 提示 / 评价不读取。旧请求缺字段兼容，公有文本协议不变。本轮双人物多写姓名的捕获格式只在准确 ID / 姓名匹配时机械修正，不改原台词；未知人物仍报错。

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
| `sceneContext` | `SceneContext` | — | 3D 的公开现场记录；文字练习省略，仍走同一个任务与评分口径 |

**响应：**

```
<校验后的报告 JSON>
@@final
{"scoringVersion":2,"ratings":[{"skill":"communication","level":2,"evidence":"实际用户原话","reason":"情境中的效果"}],"verdictEvidence":"实际用户原话","stars":2,"outcome":"partial","verdict":"你拿到了时间点，代价是把底线交了出去。","summary":"…",
 "strengths":[…],"weaknesses":[…],
 "alternatives":[…],"knowledge":{"theoryIds":[…],"caseIds":[…],"whyThis":"…"},
 "reflectionQuestions":["…","…"],"nextStep":"…","deltas":{}}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `scoringVersion` | `2` | 新报告的评分口径；旧报告缺失此字段，保留旧目标星数 |
| `ratings` | `{skill, level: 0–3, evidence, reason}[]` | 实际练习的目标技能；无目标交集时取场景主技能。每技能一项，必须有用户原话，缺证据不评分 |
| `stars` | `0–3` | 有效 ratings 均值四舍五入，与目标数独立；ratings 为空时数值占位 0，UI 显示未评分 |
| `outcome` | `success / partial / failure` | 新报告按 objectiveResults 中 met 的项数计算，unknown 仍单列；不能从 stars 推导 |
| `objectiveResults` | `{index,status,evidence,npcEvidence?,reason}[]?` | 新生成报告必需，与初始目标同序；status 为 met/unmet/unknown。evidence 必须是用户原话，npcEvidence 若提供须是 NPC 原话。旧报告可不含 |
| `verdictEvidence` | `string?` | 经过转录校验的用户原话，显示在判决前 |
| `verdict` | `string` | 有证据的简短判断；无有效 verdictEvidence 时显示证据不足，隐藏 summary |
| `weaknesses[].deficit` | `"acquisition" \| "performance"` | **产品定位的核心字段**，不会 vs 会但没做到 |
| `weaknesses[].evidence` | `string` | 必须是转录里的原话 |
| `knowledge` | `{theoryIds, caseIds, whyThis}` | 由 `retrieveKnowledge()` 检索，非模型编造 |
| `deltas` | `Proficiency` | API 返回空对象；设备 store 按近期独立证据估计变化，不接受单场模型奖励，可为负 |
| `sceneNotes` | `{evidence, observationId, note}[]?` | 3D 补充点评，最多三条；引文必须来自该 observationId 对应的同一次用户发言 |

共享任务层会校验技能范围、引文确实来自用户（沉默事件只用于行为条目）、去重评分、过滤无证据评价/改写，并由设备端按独立证据更新估计。引文存在不等于解释必然正确，语义公正性仍需行为评测。NPC 私有设定与预设成功/失败模板不传入复盘。

`SceneContext = {kind:"3d", practiceId?:UUID, sceneId, openingId, observations:[{id,turn,learnerQuote,facts:string[]}], actions?:[{id,afterTurn,action}]}`。turn 为从 1 起的用户发言序号；afterTurn 为已完成的用户发言数，0 表示开口前。最多 24 组观察 / 动作；观察须精确匹配同一回合原话，ID 不重复，动作不能在转录之外的未来回合。仅含发言时的地点 / 坐立、明确对象和实际动作，不传镜头、NPC 私有设定、未发草稿或声音表情推断。3D 没有逐目标追踪，不传空数组冒充失败；点评仍核对真实转录。

practiceId 标识设备上的同一局，继续后仍沿用、重练才更换；同局能力变化需引用新增发言，并去除已经计入的技能增量，实际值在 applyReport 后写入本地报告。取消会传递到模型任务，卸载后的结果不能写回。共享点评进一步区分最后一条 NPC 的待回答问题与用户已发生的执行问题，不因用户还没下一回合就扣分；改写只能使用原句之前已知事实，保持原有边界与承诺。

---

### `POST /api/reflect`

对用户的反思作答给出教练回应。

**请求：** `{ scenario, question, answer, lang, summary? }`
**响应：** `text/plain` 流（纯文本，无协议标记）。

---

### `POST /api/debrief-chat`

围绕本次报告的多轮复盘咨询，部署与 BYOK 共用 `runDebriefChat()`。与固定反思题 `/api/reflect` 并存。

**请求：** `{lang, practice:{title,background,roles:[{name,role,learner}]}, transcript:[{role:"learner"|"npc",name,text}], report:{verdict,summary,nextStep,strengths:[{evidence,behavior}],weaknesses:[{evidence,behavior,whyItMatters}],alternatives:[{original,better,why}],knowledge:{theoryIds,caseIds}}, history:[{question,answer}], question}`。

`buildDebriefInput()` 排除 NPC 私有设定、教练提示和评分字段。最多六组历史、100 条转录、1000 字符问题、160 KB 请求；Zod 白名单剥离额外字段。既有速率限制适用。

3D 可附同一 `sceneContext`，任务在调用前再次核对原话与观察。走近仍是公开谈话，举杯不推定饮酒 / 同意，坐立不推定逃避；问答使用真实回复判断效果，不能用 NPC 接受推定其内心感受。

**响应：** `{evidence:string, answer:string, example:string, sources:[{kind:"theory"|"case",id:string}]}`。`example` 可为空；非空内容在 UI 明确标为示范，不进入真实转录。sources 只能来自本次检索，展示作者 / 书名 / 链接取自本地语料。有用户发言时 evidence 必须是连续真实原话；零发言时必须为空且只作概念指导。来源与引文不合规返回 502；请求不合规 400 / 超大 413。不呈现未验证的模型文本。

服务端时限 60 秒、fast 模型、2400 输出 token；客户端 55 秒后显示重试，问题保留。`Session.debriefChat?` 只在设备保存完成问答，不更新报告 / 熟练度。AI 的语义解释仍须核对，校验不是对所有建议正确性的保证。参考 [方案](./archive/specs/spec-debrief-assistant.md)。

## 生成

### `POST /api/rehearse`

把用户描述的真实处境变成一个全量打标的场景。

**请求：** `{ description, lang, profile?: { name?, bio?, goals? } }`。`description` 去首尾空白后须为 8–8000 字符，托管与 BYOK 使用同一 schema。分项与核对后的附件文字由客户端合并为此字段；不接收原文件、文件名、图片或头像。
**响应：** `{ "scenario": Scenario }` —— 服务端会校验并纠正 `skills` / `context` / `competencies` 是否为合法 id，输出场景带 `custom: true`。

`custom` 场景**不进排程池**（`retrieveScenario` 过滤掉），只能从 `/rehearse` 或历史进入。

---

## 跨场次

### `POST /api/pattern`

在多场已复盘的练习里找**一个**反复出现的行为。产品提案称之为 A→B 的转化引擎：看见它是习惯而不是运气，急性问题才会变成慢性问题。

**请求：** `{ lang, goals: SkillId[], sessions: PatternSession[] }`

`PatternSession` 是把一场练习压平成「可以据以立论的证据」：`{ sessionId, practiceId?, title, at, outcome?, verdict?, gaveGroundOn: number[], turns, weaknesses: {messageId, behavior, evidence, skill, deficit}[] }`。`gaveGroundOn` 是 `stanceTrail` 里下降的那些回合号——立场变化只提供检查线索，不能据此判用户失误或习惯。

**响应：** `{ found, pattern, why, evidence: {sessionId, messageId, title, quote}[], skill?, nextStep }`，`found: false` 时其余字段为空。

**两条守卫写在代码里而不是 prompt 里**（`src/lib/tasks/pattern.ts`）：

1. 每条 quote 按 sessionId/messageId 在指定原话中定位。标点容错只用于定位，返回真实字面片段；反向包含、错绑与跨场兜底不通过。
2. 存活引文必须横跨至少两个独立 sessionId；同 practiceId 的快照算同一局。同标题不影响成立。

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

## 3D 实景

### `POST /api/dinner/direct`

2026-10-06 本地扩展：可选 `contentSnapshot.direction.cast[].voice` 是双语口吻方向，新局冻结、旧档可缺省，只用于模拟。服务端从已有 history 派生 `lastObservedReactions` 给模型，不接受它作为另一个请求字段，也不用于评价。长句整句复播与已复现的称谓 / 时间 / 语言问题共用原有未展示修复；明确复述与重复同一用户问题仍可重复台词。见 [NPC 方案](./specs/spec-npc-craft.md)。

请求 `{scenarioId: "work"|"family"|"school"|"elevator"|"office", contentSnapshot?, briefVersion?:1, variantId?, maxTurns?, targetId?, lang: "zh"|"en", text, history, room?, dinner?, heard?}`。`text` 非空且最多 500 字；`history` 为 1–47 条 NPC / 用户交替记录，起止为 NPC。`maxTurns` 默认 12，上限 24（兼容旧四回合），达到预算后客户端先延长再请求。`variantId` 是当前场景的两个原创开局之一；`targetId` 指定当前回复人，不赋予其替别人承诺的权限。历史保留话题、原话、空间 / 动作证据及用户开口前实际听到的 `heard:{speakerId,text,cue?}`，不得剥掉这些字段或截断成最后四轮。角色、开局、话题与事件交叉校验。正文最多 192 KiB（检查实际字节，不只信任请求头）。

返回 `{replyTo,speakerId,text,cue,reactions:[{characterId,emotion,gesture}],story?:{topic,event?,beat?},interjection?:{speakerId,text},closure?:{kind,learnerQuote?,npcQuote}}`，恰好包含当前场景三名角色的反应。`replyTo` 是当前输入的 1–120 字符原文片段，由任务层核验，用来发现错答上一句，不显示为用户评价。可用表情 `neutral|pressing|annoyed|thinking|supportive`；动作 `idle|toast|lean|fold|nod`。`cue` 从实际支持的动作派生，模型编造的吃饭 / 手机操作不进入舞台说明。`story.event` 只能是当前开局允许、未出现且未被拒绝的动作插曲；不再在固定回合自动播放。可选 `interjection` 是另一名在场 NPC 在主回复之后的一句可听见插话，必须不同于主回复人，不能跨场景或替他人承诺。中文最多 45 字符；英文最多 25 词 / 160 字符。该字段嵌入同一个 NPC message，存档 / 完整历史 / 下一次请求都保留原话，不消耗额外玩家回合。无分数 / 隐藏动机。

模型同时接收十种可查阅的原创开局资料和只包含玩家既有原话的 `playerEvidence`，帮助区分 NPC 建议与玩家决定。拒绝、时间、个人信息的语义仍由模型理解，不能把结构校验宣称为语义保证。模型输入把完整历史放在前面，单独的 `current_player_turn` 放在最后；各开局事实分离，防止相亲线混入工作变动。新生成台词要求 1–2 个短句，中文目标 25–70 字符、硬上限 120；英文目标 15–35 词、上限 60 词且 400 字符。旧转录仍按原长度读取，不截断原话。回复角色、引文、长度或事件校验失败时最多修复一次，仍失败则返回错误，绝不提交无效回合或静默换成内置剧情。

2026-10-04 新增可选 `story.beat`（1–30 字符，必须属于当前开局 `arcs.ts` 的转折 ID）。它描述这句实际发挥的剧情机会，不代表成功、同意或评分。旧记录可不含此字段；新记录与原话一起保存并传回 `history.story`，用户消息不得伪造转折进度。`topic` 仍只允许当前场景的话题枚举，不能拿转折 ID 代替。已复现的串场事实 / 无依据承诺经狭义检查，失败共用原有一次修复预算，不增加第二套模型或公开端点。

重复请求当前或历史已见的本开局 `event` 时，本地移除冗余字段，保留正常台词，不重放动作。若 `topic===beat` 且该值是本开局有效转折但非允许话题，本地按实际台词与此前话题重新归类；不修改原话。其他外来 / 未知字段仍走原有校验与修复。`jsonCall` 的格式重试独立存在，不能将“最多一次场景修复”理解为所有失败都只有两个底层请求。

新增空间：`elevator-privacy/elevator-blame` 与 `office-overtime/office-interruption`，各自独立资料、角色与话题；`responsibility` 和 `speaking` 新增话题。办公室、电梯口拒绝 `toast` 动作，禁止饭局道具。空间证据 `room` 新增可选 `space:"dinner"|"elevator"|"office"`、`liftDoors:"open"|"opening"|"closing"|"closed"`；`zone` 允许 `lobby/cabin/desk/board`，并与场景交叉校验。现场事件新增 `elevator-door/office-task/office-floor`；动作 `hold-door/release-door/step-aside/inspect/request/board`。它们只有实际抵达后才写入动作记录，保持 `silent:true`，不生成自动同意台词。门仍停在同层，不把关门当作私聊。客户端 v1 档案的 `room.space` 与 `room.lift:{openness,target}` 是可选扩展；旧饭桌不需要这些字段。

错误：400 输入 / 状态无效；413 过长；429 沿用主站限流；503 部署无密钥或强制 BYOK；模型错误沿用 `fail()`，无剧本静默替代。服务器请求 30 秒取消、路由 `maxDuration=40`；客户端 35 秒取消，草稿保留。响应 `Cache-Control: no-store`。

BYOK 在浏览器运行同一任务，密钥不发送到此路由。可用性复用 `/api/health` 的连接状态与浏览器统一的运行时失败状态，无新增公开配置端点。


### 反馈修订协议补充（2026-10-05，本地开发）

`/api/assess` 保留现有流格式，但只有完整结构、引文与独立语义检查通过后才发正文/`@@final`。完整格式最多修复一次；语义最多修订两次、每次复核整个报告，仅合并被指出有问题的顶层字段。修订后尚未用过的格式修复预算可以使用。总计至多一个初稿、一次格式修复、两次语义修订与三次语义检查；拒绝/网络错误不消耗这些修复来盲重试。verdictEvidence 不得引用 NPC；修复提示一次列明错误引文字段与实际原句。常规引号/已知 NPC 标签只有在正文逐字匹配时才可剥去，不能拼接或模糊修复。解释中显式归给用户的引文也核对逐字内容；书名与假设新说法不当成用户原话。语义核对关注已回答/未接受、意图改变、未知权限、未来安排与已完成事件、改写时可用信息及自主权。仍失败返回 502/可重试任务错误，不生成空报告、不触发模型不可用门控、不计熟练度；原转录保留。中断/拒绝/服务商错误保持原类型。需要特别注意：核对模型通过仍不代替人工语义验收。

3D `briefVersion:1` 表示新局公共资料；省略时沿用旧局背景，不补入办公室默认项目。`closure.kind` 与文字版同为 agreement/boundary/deferred/withdrawal；前三种需要当前用户和本轮主回复/插话中的实际引文，单方离场允许缺用户引文。它只提供暂停选择，不能直接评分或强制复盘。档案可附 `continuedAtTurn`，用于记录用户已经选择继续的收尾。预算延长保持完整历史，最大仍为 24。

## 质量修订协议（2026-10-06，本地）

- 所有 LLM 请求按共享 schema 验证，入口逐块读取并限制为 192,000 字节；缺 Content-Length 不绕过。场景/角色/转录不完整返回 400，过长 413，不调用模型。托管与 BYOK 有相同任务 deadline/调用次数和 256,000 输入字节预算；流取消传 SDK。
- roleplay `meta.objectiveEvidence?:{index,learnerQuote,npcQuote?}[]` 只支持真实原话；无对应证据的 true 变 false，不作为最终判定。`disclosures?:{characterId,quote}[]` 必须来自这个角色本轮台词，才保存消息/回合指针；`revealed` 由存活的证据计算，旧全局标记不再生成行为评价。目标/立场显示为模拟估计，含引文仍不保证解释正确。
- reflect 请求增加 `learnerCharacterId?`、`messages?`、`responseFormat?:"json"`。新客户端请求 JSON，响应 `{reply:string}`；旧客户端可沿用文本协议。回复必须先引用本次答案的字面片段，理论/策略用检索到的来源；通过验证才交付。编辑重试按本地 reflection revision 绑定，不写回旧答案。
- pattern 按 `sessionId/messageId` 定位，只在指定证据中查找并恢复原转录片段；不跨场兜底，不接受“原话加编造后缀”。至少两独立局；同标题合法，同一 practiceId 快照不重复。
- 排程 history 可带 sessionId/practiceId、diagnosis、nextStep、reflections；原话、模型诊断与自述分开解释。场景和适配输出经完整 schema 验证，最多一次有界 schema 修复，不补 NPC/开场占位。
- dinner 新请求/存档可带 `contentSnapshot`，公开场景与私有方向分开；模拟读取原角色/开场事实，复盘只读公开快照。旧档缺快照兼容，但不承诺历史内容已冻结。
- track 增加严格 `practice_stage`，仅 `{mode:"3d",practice:uuid,scenario,stage,duration_ms,turns,byok}`；stage 为 loaded/started/first_reply/review/restart。debrief_view 可带 mode/practice，session 接受 UUID。模型调用运维信息不包含对话/设备身份。
- 生产共享模型必须有共享预算配置，未配时 GET health 的 requireByok 为 true。预算服务不可用返回 503，日预留用尽 429 quota，并发满 429 rate_limit；修复和 SDK 重试容量纳入预留。金额上限需供应商配置，详见 [预算边界](./reviews/review-2026-10-06-repo-quality.md#发布前预算配置)。

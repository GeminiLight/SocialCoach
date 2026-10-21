# 真实模型完整对练与复盘验收

日期：2026-10-22（Asia/Shanghai）。模型：`glm-5.3-flash` 对练 / 反思 / 追问，`glm-5.3` 报告。全部输入是专为验收编写的虚构话语，不含真实用户、密钥或论文材料。原件只保留可见内容，不收集模型思考。

## 范围

| 场景 | 语言 | 完整路径 |
|---|---|---|
| `office-quick-favor` | 中文 | 真实简报 → 六轮对练 → 报告 → 反思 → 两轮追问 |
| `partner-location-pressure` | 英文 | 真实简报 → 六轮对练 → 报告 → 反思 → 两轮追问 |
| `family-privacy` | 中文 | 六轮 3D 模型对话 → 现场记录转换 → 报告 → 反思 → 两轮追问 |
| `office-overtime` | 英文 | 六轮 3D 模型对话 → 现场记录转换 → 报告 → 反思 → 两轮追问 |

每条路线包含有限让步、拒绝、反问、玩笑、修复与继续讨论。六轮后由验收者主动结束，不把它称为跑满 12 回合。3D 使用真实 director、公开空间证据、内容快照和路由同样的 30 秒 deadline；这些四条批量路线直接调用共享任务，不能当作四条浏览器或线上实测。

另外通过浏览器真实走完中文办公室场景：目录 → 真实简报 → 六轮交互 → 结束 → 报告 → 一条反思 → 三轮追问 → 刷新。首次报告核对失败后保留了完整对话；主动重试后完成，不能写成首轮成功。`browser-session.json` 保存最终设备记录。

## 原件与开发迭代

- `baseline/`：四条初始完整任务全部结束，但人工审阅发现内容错误。不能将 JSON 成功率视为语义通过率。
- `initial-verification/`、`verification/`、`deadline-verification/`：加入核对过程中的失败、修复草稿和核对结果。包括示范混入正文、额外承诺、误读后续责任、模型空输出 / 形状问题和 55 秒取消。
- `acceptance/`：85 秒预算后的四例复测；英文文字与两条 3D 路线完成；中文文字在示范数组形状处被拒绝。
- `followup/text-zh.json`：示范数组无损归一化、事实问题不额外编示范后，原中文文字转录完成反思及两轮追问。
- `socialcoach-live-negative-checks.json`：真实错误回复原样重放，中文擅自承诺发送与英文擅自提前通知均被拒绝。
- `ownership-regression.json`：遗漏后续 NPC 自行核实提议的真实回复，修订后的核对拒绝。
- `socialcoach-live-npc-replay.json`：页面第四轮原输入重新调用模型，修订后不再声称已有采购单。

重放阶段通过 `LIVE_WORKFLOW_COACHING_ONLY=1` 复用原报告和转录，只重新生成反思与追问；这些不是新做了四份报告。各目录是开发中的不同版本，不是独立同分布的成功率评估。最终确定性引文位置检查还覆盖了已被模型核对漏过的中文 `例如先说「…」` 反例：新台词不得因模型说 approved 就进入解释正文。

## 本轮结论与边界

修复了已复现的材料来源、示范位置、承诺扩张的交付校验缺口，以及段落 / 示例数组误拒；新增核对的时间预算同步到任务、UI 与路由。失败不会交付未核对草稿，原对话与问题可重试。

常规反思 / 追问由一次生成增加为生成加核对，失败最多再生成并核对一次；总调用上限仍为四次，85 秒内结束。并非零延迟或所有输出都能一次完成。生成和核对都可能漏报 / 误报，尤其“达成约定”和“实际完成”的措辞、可选示范是否仍扩大承诺，需要继续盲评。本轮未覆盖所有 58 个场景、自定义排练、其他供应商、真实手机、生产共享预算和国内网络，不作相关成功声明。

## 复现

在 `app/` 配置自己的模型环境，明确运行下面的付费实测。每次使用新输出目录；脚本拒绝覆盖已有案例原件。

```sh
LIVE_WORKFLOW_DIR=/tmp/socialcoach-live-new \
node --env-file=.env.local --import tsx scripts/check-full-workflow-live.ts

LIVE_WORKFLOW_REPLAY_DIR=/tmp/socialcoach-live-new \
LIVE_WORKFLOW_DIR=/tmp/socialcoach-live-replay-new \
LIVE_WORKFLOW_COACHING_ONLY=1 \
node --env-file=.env.local --import tsx scripts/check-full-workflow-live.ts
```

可用 `LIVE_WORKFLOW_CASE=text-zh,text-en,dinner-zh,dinner-en` 缩小范围。人工应核对整段转录、每次原始输出与最终交付，不能只看脚本退出码。每例每阶段写盘，并保留空输出和错误，独立对话并发最多两条。

程序回归：`pnpm check`、`pnpm build`、`scripts/check-roleplay-facts.ts`、`scripts/check-debrief-assistant.ts`。浏览器脚本 `scripts/check-debrief-assistant-browser.ts` 的响应使用固定夹具，专测持久化、失败重试、取消、双语 / 主题 / 窄屏可用性；它与上述真实模型验收分开计数。

本地结果：95 项 core、256 项 dinner 检查通过；复盘页面 38 项检查通过（包含中英文 × 明暗主题 × 360 / 1440 宽度的自动可访问性检查）。10 项 roleplay 事实回归与 23 项复盘契约检查通过。生产构建通过；远端检查与合并记录见关联 PR。

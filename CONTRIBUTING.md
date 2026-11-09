# 参与 SocialCoach · Contributing

[简体中文](#简体中文) · [English](#english)

## 简体中文

谢谢你愿意帮忙。最有价值的贡献，往往是**一场你自己真的难开口的对话**。

### 1. 提一个场景（不用写代码）

用 [场景投稿](https://github.com/GeminiLight/SocialCoach/issues/new?template=scenario-proposal.yml) 表单描述一场对话：你是谁、对方是谁、对方想要什么、有什么没说出口的顾虑、怎样算谈成。维护者会把它整理成双语场景，并按下方验收要求测试后再上线。

好的场景通常有这几个特点：

- **开场就有具体冲突**：不是「和老板聊聊」，而是「下班前十分钟，经理让你今晚留下」。
- **对方有真实的立场和底线**：不会因为你礼貌就让步；态度好可以缓和气氛，但条件要靠交流本身争取。
- **用户的选择会改变后续**：让步、拒绝、反问、开玩笑、道歉修复，都会带来不同的压力或关系变化。
- **有出处**：受某篇研究、某本书、某个公开机构的指南启发，请附上链接；你自己的真实经历也可以，写清楚是「原创虚构练习」。没有出处的「技巧」不会被收录。

### 2. 实现一个场景（TypeScript）

场景在 `app/src/data/corpus/`，类型见 `types.ts`，参考 `scenarios-d.ts` 里的写法。提交前请确认：

- [ ] 所有面向用户的文字都是 `L(中文, English)` 双语。
- [ ] `source` 写明出处；原创虚构练习也要标明。
- [ ] 角色有 `stance`，需要时有 `hidden`（用户问到才透露的信息），NPC 不提前说出 `hidden`、不跳出角色当教练。
- [ ] 在 `text-scene-directions.ts` 写分支说明：让步、拒绝、反问、玩笑、修复、续聊后分别怎样发展，不靠编造紧急事件或重复施压推进剧情。
- [ ] 实际对练至少覆盖：让步、拒绝、反问、玩笑、修复与续聊，不只测标准答案。在 PR 里贴出关键回合。
- [ ] `cd app && pnpm check` 通过。

### 3. 修复和改进

带 [`good first issue`](https://github.com/GeminiLight/SocialCoach/labels/good%20first%20issue) 标签的问题适合第一次参与。本地运行见 [README](README.md#本地运行)。动代码前请读 `AGENTS.md` 和 `app/AGENTS.md`；这几条是产品定位，不是代码风格：

- NPC 不讨好用户；复盘的每条评价都先引用用户原话。
- 不引入账号体系或服务端存储，练习记录留在设备上。
- 颜色只在 `app/src/app/globals.css` 定义；面向用户的静态文案用 `{zh, en}` 双语对象。

## English

Thank you for helping. The most valuable contribution is often **a conversation you genuinely find hard to start**.

### 1. Propose a scenario (no code)

Use the [scenario proposal](https://github.com/GeminiLight/SocialCoach/issues/new?template=scenario-proposal.yml) form: who you are, who the other person is, what they want, what they are not saying, and what a good outcome looks like. A maintainer turns it into a bilingual scenario and tests it against the acceptance checks below before it ships.

Good scenarios usually:

- **Open on a concrete conflict**: not "talk to your boss", but "ten minutes before you leave, your manager asks you to stay tonight".
- **Give the other side a real position and limits**: politeness alone does not win; good manners can ease the mood, but terms are earned through the exchange.
- **Let choices change what follows**: conceding, refusing, asking back, joking and repairing each lead somewhere different.
- **Have a source**: a study, book or public guideline that inspired it, with a link; your own experience works too, labelled as an original fictional practice. Unsourced "tips" are not accepted.

### 2. Implement a scenario (TypeScript)

Scenarios live in `app/src/data/corpus/`; see `types.ts` and follow `scenarios-d.ts`. Before opening a PR:

- [ ] All user-facing text is bilingual: `L(中文, English)`.
- [ ] `source` names the origin, including for original fictional practice.
- [ ] Characters have a `stance` and, where useful, `hidden` information revealed only when asked; NPCs never volunteer `hidden` or step out of character to coach.
- [ ] Add branching direction in `text-scene-directions.ts` for conceding, refusing, asking back, joking, repairing and continuing, without invented emergencies or repeated pressure.
- [ ] Play it through covering concession, refusal, a question back, a joke, a repair and a continuation, not just the textbook answer. Paste the key turns in the PR.
- [ ] `cd app && pnpm check` passes.

### 3. Fixes and improvements

Issues labelled [`good first issue`](https://github.com/GeminiLight/SocialCoach/labels/good%20first%20issue) are a good start. See the [README](README.en.md#run-locally) to run locally, and read `AGENTS.md` and `app/AGENTS.md` before changing code. These are product commitments, not style preferences:

- NPCs do not simply give in; every piece of feedback quotes the learner's own words first.
- No accounts or server-side storage; practice records stay on the device.
- Colours are defined only in `app/src/app/globals.css`; static user-facing copy is a `{zh, en}` object.

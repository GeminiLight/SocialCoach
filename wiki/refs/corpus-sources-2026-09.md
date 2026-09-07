# 语料多样化与来源记录 · 2026-09-07

用户明确要求增加场景与知识、提高多样性。本轮新增 12 场景、8 知识、6 教学示例；总计 46 / 42 / 30。原始 Stage A 交付数量作为历史记录保留，当前 README、路线图与 Stage C 页面规划同步到 118 条 / 双语 236 页。

## 来源与改编边界

以下是方法依据，不是新场景中事件真实发生的证据。所有新增场景为原创虚构练习，source 明确写明；所有新增案例在标题、情境、要点中标为教学示例，未伪造研究结果、人物访谈或书中引语。方法用中英简要转述，不提供成功率承诺。

| 知识 | 主要来源（2026-09-07 查阅） | 配套应用 |
|---|---|---|
| 接住好消息 | [Capitalizing on Positive Events · UC Berkeley GGSC](https://ggia.berkeley.edu/practice/capitalizing_on_positive_events) | 朋友喜悦与自己的失落 |
| 核实复述 | [Active Listening · UC Berkeley GGSC](https://ggia.berkeley.edu/practice/active_listening) | 语言角、线上语气、家庭隐私、聚会拒酒；场景中的边界设计是原创练习安排 |
| 多套可接受方案 | [MESOs · Harvard PON](https://www.pon.harvard.edu/daily/business-negotiations/how-to-use-mesos-in-business-negotiations/) | 旅行预算、假期安排；将商业谈判方法转用于低风险生活协商 |
| 共同判断标准 | [Creating Value · Harvard PON](https://www.pon.harvard.edu/daily/negotiation-skills-daily/crafting-joint-gains-in-negotiation/) | 社区活动室分配 |
| 责任与补救 | [The art of a heartfelt apology · Harvard Health](https://www.health.harvard.edu/blog/the-art-of-a-heartfelt-apology-2021041322366) | 泄露朋友秘密；仅日常道歉练习，不涉及临床判断 |
| 暂停与恢复联系 | [Learning When to Take a Break · Gottman Institute](https://www.gottman.com/blog/love-smarter-learning-take-break/) | 伴侣独处需求；时间安排为原创应用，不将独处等同于关系异常 |
| 尊重自我称呼 | [LGBTQ+ communication best practices · U-M Spectrum Center](https://spectrumcenter.umich.edu/education-resources/lgbtq-communication-best-practices) | 校园称呼；对原来源尊重姓名原则的跨处境应用，不推断角色性别身份 |
| 询问参与需要 | [Meet people’s accessibility needs · Disability Gateway](https://www.disabilitygateway.gov.au/ads/strategy/good-practice-guidelines/accessibility-needs) | 社区活动无障碍核实；不提供法规合规判断 |

链接集中在 `app/src/data/corpus/sources.ts`，新知识与案例通过 source.url 在知识页及复盘正文显示「查看方法依据」。未给既有书籍语料随意补入未经核对的网址。

## 覆盖变化

| 情境 | 原有 | 当前 |
|---|---:|---:|
| 职场 | 14 | 15 |
| 家庭 | 5 | 7 |
| 友情 | 3 | 6 |
| 恋爱 | 3 | 4 |
| 校园 | 3 | 5 |
| 公共 / 陌生人 | 3 | 4 |
| 社交场合 | 3 | 5 |

新增难度：入门 3、进阶 6、挑战 3。成功条件允许明确拒绝、暂不原谅、确认尚待核实的条件；不以讨好 NPC 或强行达成一致为唯一结果。NPC 均有立场、阻力和不主动披露的背景。

## 验证

`app/scripts/check-corpus.ts` 检查全库唯一 ID、合法技能 / 情境 / 关系、角色与开场引用、学习者注入及目标数量；对新增内容检查完整双语、能力与技能对应、中文关键词、图标、来源链接格式与教学示例标记。运行：在 app/ 中执行 `npx tsx scripts/check-corpus.ts`。

验收结果：全库及新增语料检查通过；按「社交场合 + 为他人发声 + accessibility wheelchair event」检索到新无障碍场景，中文 / 英文 session 均以 you 为学习者；好消息主题能检索到新知识及示例。浏览器搜索「无障碍」得到新场景并进入正确身份的简报；知识页显示 42 理论 / 30 案例，「好消息」可找到两类新增条目，方法链接与教学示例标注正确。ESLint、TypeScript 与生产构建通过。未额外调用模型测试完整对话；NPC 的实际多轮表现仍依赖运行时模型。

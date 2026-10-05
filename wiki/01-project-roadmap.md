<!-- Last verified: 2026-10-04 | Current stage: B -->

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
| A1 | 三层语料库（理论 / 案例 / 场景，双语，全部带 `source`） | ✅ | 42 / 30 / 58（2026-10-03 再增 12 个原创虚构场景，覆盖 7 个情境）；`src/data/corpus/` |
| A2 | 多面分类体系（5 CASEL × 34 技能 × 7 情境 / 26 类型） | ✅ | `src/data/taxonomy.ts` |
| A3 | 自适应排程 `/api/schedule`（处方 → 受约束检索 → 适配） | ✅ | 固定放松顺序，核心约束不放松 |
| A4 | 沉浸式角色扮演 `/api/roleplay`（流式、隐藏动机、目标追踪、可续聊段落、可失败） | ✅ | 对外 `@@characterId` / `@@meta`；内部 JSON 校验，至少 12 回合、续段 +8，由用户结束；十二场景条件式后续与双人物格式修复见 [本轮评审](./reviews/review-2026-10-04-text-play.md) → [文字验收](./reviews/review-2026-10-03-text-practice.md) |
| A5 | 证据式复盘 `/api/assess`（引用原话、acquisition/performance 归因、有界增量） | ✅ | 2026-09-21 改为先验证引文再发正文与 `@@final`，新星数评沟通表现 |
| A6 | 知识检索卡片 + 苏格拉底式反思 `/api/reflect` | ✅ | 报告内嵌理论 / 案例 |
| A7 | 对话中提示 `/api/hint` | ✅ | ≤40 词，只点动作不代写 |
| A8 | `/rehearse` 生成真实处境场景 | ✅ | ~15s，输出全量打标场景 |
| A9 | 本地持久化 store + 导出 / 重置 | ✅ | Zustand persist，零注册；排练描述有标签页草稿，重置时同步清理；2026-09-09 头像选择支持本地保存与导出 |
| A10 | 能力雷达 / 熟练度 / 时间线 / 反思日志 | ✅ | `/progress` |
| A11 | 8 个路由页面 + 移动优先 PWA | ✅ | manifest + service worker；2026-09-07 打磨首页、场景目录、排练表单及共享导航 / 弹窗；2026-09-09 重绘人物头像，加入预览、精选与外观微调；2026-10-04 共享视觉、首屏筛选与首页优先级精修 → [验收](./reviews/review-2026-10-04-refined-ui.md)；同日进一步去除重复线条、加入柔和材质与连续交互，163 项检查 → [动效验收](./reviews/review-2026-10-04-material-motion.md) |
| A12 | 中英双语 UI，模型输出跟随用户语言 | ✅ | `src/lib/i18n.ts` |
| A13 | 底牌揭示（对方 `hidden` 的判定与揭示屏，含「第几回合问出来的」） | ✅ | 2026-10-03 核对：语料 41/58 有 `hidden`，其余优雅降级 |
| A14 | 对方立场表盘（`@@meta.stance`，允许下降并标出退让位置） | ✅ | 同批把 `@@meta` 移到回合最前，修掉长期静默失效的目标追踪 |
| A15 | 判决式复盘开场 + 对话地图（按回合画推进 / 没动 / 让了一步） | ✅ | `Report.verdict`；地图数据来自 `session.stanceTrail` |
| A16 | 跨场次模式识别（`/api/pattern`，引文防伪 + 至少两个场次） | ✅ | 产品提案里的 A→B 转化引擎，此前无实现 |
| A17 | 限时应答（可选模式：对方耐心 10 / 15 / 20 秒，三段升级，沉默进转录，连续两次对方离场） | ✅ | 2026-09-09；默认关闭，`role: "event"` 沉默事件不计回合 → [spec](./specs/spec-timed-reply.md) |
| A18 | 通用练习策略：角色匹配、信息边界、收尾证据、表现/结果分离 | ✅ 已部署 | 2026-09-21 双平台上线；真实模型小样本通过，仍需扩大盲测 → [方案](./archive/specs/spec-general-practice-policy.md) |
| A19 | 核心练习路径 UI/UX 精修 | ✅ 已部署 | 2026-09-21 今日 / 目录 / 准备 / 对话 / 复盘统一路径，草稿与目录状态恢复、真实等待、触控与可访问性 → [评审](./archive/reviews/review-2026-09-21-product-ux.md) |
| A20 | 首次进入与重复练习闭环精修 | ✅ 已部署 | 2026-10-02 Vercel / ModelScope 更新；快速排练 / 选场景、按需推荐、待完成复盘续接、知识关联场景、明确重练及触控修复；中英明暗浏览器矩阵 → [评审](./reviews/review-2026-10-01-product-maturity.md) |
| A21 | 练习中断与本地档案恢复 | ✅ 已部署 | 2026-10-02 双平台更新；准备失败禁止开练、完整回复才写记录、刷新 / 暂停恢复、完成回复前锁定、复盘只应用一次、损坏档案保护与恢复页；国内公共浏览器验收待复核 → [发布记录](./specs/spec-modelscope-deployment.md#体验精修与中断恢复更新2026-10-02) |

| A23 | SocialCoach 3D 饭局入口与原型接入 | ✅ 已部署 | 主站 `/3d`、首页 / 导航 / 欢迎入口、共享模型与 BYOK、独立本地存档和导出；人物面部 / 身体连接已发布。2026-10-03 连续剧情修复双平台发布：六开局，默认 12 回合、最多 24，指定对象与完整上下文。紧凑对象选择、短句生成和完整对话历史已双平台发布；三桌九人的脸型 / 发型 / 体型 / 服装区分已双平台发布；人物区分 100 项检查、中英真实模型与手机验证通过。语音随时切回编辑、迟到回调保护与手机输入高度修复已完成，110 项检查通过，见 [语音编辑验收](./reviews/review-2026-10-03-voice-edit.md)。首页首屏大幅预览与欢迎页直接入席已完成，见 [入口验收](./reviews/review-2026-10-03-3d-home-entry.md)；主站本轮沉浸体验新增旁人插话、六份可查看资料、有限动作和浏览器朗读，106 项检查通过，完成 98 次真实回复复测；发布见 [沉浸验收](./reviews/review-2026-10-03-3d-immersion.md)。线上视觉复核受网络限制。见 [人物区分验收](./reviews/review-2026-10-03-3d-cast.md)、[对话区验收](./reviews/review-2026-10-03-3d-conversation-ui.md)、[剧情验收](./reviews/review-2026-10-03-3d-story.md)、[接入说明](./archive/specs/spec-3d-integration.md)、[人物验收](./reviews/review-2026-10-03-3d-anatomy.md)；主站性能优化饭桌绘制次数 614 → 289，126 项检查通过，见 [性能验收](./reviews/review-2026-10-03-3d-performance.md) |
| A22 | 本次练习的多轮复盘 AI 助手 | ✅ 已部署 | 2026-10-02 Vercel / ModelScope 更新；概念解释 / 具体说法 / 连续追问、知识卡片入口、证据和来源验证、本地保存与 BYOK；23 项任务 + 38 项 UI 检查、真实模型三问和线上接口检查 → [评审](./reviews/review-2026-10-02-debrief-assistant.md) |

| A24 | 模型可用性、免费检查与接入恢复 | ✅ Vercel 已部署 | 元数据检查、运行时错误分类与门控、精简配置、默认 API 失效自动弹出可关闭接入窗（同标签页去重）、计时暂停、保留历史 / 浏览、3D 无静默脚本替代；2026-10-04 补齐强 / 弱两档检查，不因一档未确认而跳过另一档，分别验收对话与复盘失效弹窗 → [方案与验收](./archive/specs/spec-model-availability.md) |

| A25 | 3D 电梯口与办公室 | ✅ 主站实现、验证通过 | 两种独立空间 / 六位新人物 / 四开局；电梯内外面板、门防夹、家具导航、白板 / 资料、主站入口、历史与旧档案兼容；117 项检查通过 → [方案](./archive/specs/spec-3d-places.md)、[体验验收](./reviews/review-2026-10-03-3d-places.md) |

| A26 | 3D 与文字共用证据式复盘 | ✅ 主站实现、验证通过 | 原话评价 / 改写 / 知识 / 反思 / 多轮咨询、现场观察补充、主站历史与导出、访客直达、返回续聊 / 同开局重练；154 项 3D + 23 项原助手检查、中英真实模型与手机浏览器 → [方案](./archive/specs/spec-3d-debrief.md)、[验收](./reviews/review-2026-10-03-3d-debrief.md) |

| A27 | Blender 人物与五类空间重建 | ✅ 主站实现、浏览器验证通过 | 15 NPC / 玩家 / 手臂、24 GLB、12 姿态 / 人、统一材质尺度、眼高 / 电梯镜头与群体举杯；161 项检查、格式 0 errors / 0 warnings；真实手机性能待补测；操作入口 / 手机摇杆收敛已实现并验证 → [方案](./specs/spec-3d-blender-assets.md)、[资产验收](./reviews/review-2026-10-03-3d-blender.md)、[操作验收](./reviews/review-2026-10-04-3d-controls.md)；2026-10-05 五空间明亮室内 / 时段窗景 / 局部浅色字幕已本地实现与验证，尚未发布 → [光照验收](./reviews/review-2026-10-05-3d-lighting.md)；同日近景材质 / 摆盘 / 植物与陈设细化本地完成，24 GLB 格式无错误或警告，尚未发布 → [细化验收](./reviews/review-2026-10-05-3d-craft.md) |

| A28 | 饭桌文化首局与重玩流程 | 📋 产品方案已完成，待实现 / 试玩 | 《鱼头该对着谁？》单桌转盘 / 身份线索 / 可补救后果 / 接续敬酒与自由对话；验证主动重玩后再扩地域、倒酒和角色 → [方案](./specs/spec-3d-table-culture.md) |

| A29 | 可玩剧情的共同调性与十开局精修 | ✅ 核心实现 / 模型回放，网页待补验 | 十开局的条件式转折、内部剧情记忆、事实 / 承诺边界；文字与排练共用标准。172 项 3D 检查及 217 条接受模型回复；点击 / 连续网页验收因浏览器连接异常未通过 → [评审](./reviews/review-2026-10-04-scene-craft.md)、[方案](./specs/spec-scene-craft.md) |

| A30 | 用户反馈全链路修订 | 🚧 本地实现，验收中 | 公共简报/自然暂停/当前意图与原目标/独立证据核对、分项与本地附件、分享卡/头像裁切/宽历史分栏；215 项行为测试与生产构建通过；核心网页、三条 3D 复盘/英文文字路线完成回放与人工阅读，真实设备/更多盲测待补。本轮尚未发布 → [方案](./specs/spec-feedback-refinement.md)、[当前核验](./reviews/review-2026-10-04-user-feedback.md) |

| A31 | 手机倾斜视角与视线选人 | 🚧 本地实现，真机待验 | 当前握姿校准 / 权限与横竖屏 / 两视角 / 稳定停留选人 / 手工优先 / 草稿与收音锁定；222 项检查、正式构建、受控方向与实际模型对象回应已验证；模拟 / 手机视口不代替真机，本轮尚未发布 → [方案](./specs/spec-3d-tilt-look.md)、[验收](./reviews/review-2026-10-05-3d-tilt.md) |

### Stage B — 定位与对外物料

| # | 功能 | 状态 | 备注 |
|---|---|---|---|
| B1 | 核心定位陈述（敌人是「建议」；知道≠做到；A/B 客户分层） | ✅ | → [00-product-proposal](./00-product-proposal.md#产品定位) |
| B2 | 主句定稿并三处对齐 | ✅ | README / `layout.tsx` / `manifest.webmanifest` |
| B3 | README 按开源产品惯例重排 | ✅ | 2026-10-03 中英首屏突出 3D，新增真实场景预览、共用复盘说明；News 保留 3D 上线与首个版本发布两条里程碑；同步 58 个文字场景与续聊说明，维护规则见 [README 结构](./11-stage-b.md#b3-readme-结构)。2026-09-21 基础精修 → [评审](./reviews/review-2026-09-21-readme.md) |
| B4 | 品牌 banner（明暗双版 SVG，色值由 `globals.css` OKLCH 精确换算） | ✅ | `docs/banner.svg` / `banner-dark.svg` |
| B5 | 产品截图（首页 / 场景目录 / 对话中 / 复盘 / 今日推荐） | ✅ | `site/scripts/screenshots.mjs` 对线上正式版自动拍摄，中英各五张，存 `docs/screenshots/` 与 `site/assets/`；官网四步流程各配对应截图 |
| B6 | LICENSE 文件与 README 章节 | ✅ | 2026-09-09 用户选定 Apache-2.0；根目录加入官方 LICENSE 全文，README 增加许可及第三方材料说明 |
| B7 | Live 站点地址替换 README 占位符 | ✅ | 2026-09-21 README 入口统一为 `https://socialcoach.aurax.live`，已验证跳转至当前 Vercel 站点；保留 ModelScope 备用入口 |
| B8 | wiki 文档体系 | 🚧 | 本次建立 |
| B9 | 官网（`site/`：双语静态站，首页首屏与末节指向论文） | ✅ | 2026-09-08 上线 `https://tianfuwang.tech/SocialCoach/`（GitHub Pages，Actions 来源，账号自定义域）；含 JSON-LD / hreflang / sitemap / `llms.txt` / OG 图 / 真实截图；2026-09-23 补充 SEL 说明及五个双语场景练习预览 → [11-stage-b](./11-stage-b.md#b9-官网) |
| B10 | ModelScope 公开体验入口 | ✅ | 2026-09-09 `GeminiLight/SocialCoach`；免费 CPU Docker 创空间，Apache-2.0；页面与线上对话 / 复盘流式验证通过 → [部署记录](./specs/spec-modelscope-deployment.md) |

| B11 | 用户反馈 → 飞书 | ✅ | 双部署真实提交通过；2026-09-17 本人 Base 可管理权限已添加并读回确认 → [反馈方案](./archive/specs/spec-user-feedback.md) |
| B12 | 匿名使用统计 → 飞书（四个事件、按月建表、留存脚本） | ✅ | 2026-09-10 Vercel 生产上线并跑通一局无错误；ModelScope 通过 OpenAPI 加变量并重建，`/api/track` 已可用 → [spec-analytics](./specs/spec-analytics.md) |
| B13 | 品牌教练 IP 与关键触点 | ✅ 已部署 | 2026-10-05 Vercel / ModelScope 同步；用户提供的小猫形象：欢迎页完整展示、首页教练问候、复盘助手肖像；统一透明素材、克制展示、双语 / 双主题 / 短屏 / 减少动效与访客入口；141 项浏览器检查 → [接入评审](./reviews/review-2026-10-04-coach-identity.md) |

### Stage C — 可索引化与 GEO

| # | 功能 | 状态 | 备注 |
|---|---|---|---|
| C1 | 语料落地页 SSG（`corpus` 130 条 × 双语 = 260 页，独立 `generateMetadata`） | 📋 | 当前 8/8 路由 `use client`，爬虫拿到空壳 |
| C2 | `app/` 的 `sitemap.ts` / `robots.ts` / `metadataBase` | 📋 | 官网已有静态 sitemap 和 robots |
| C3 | `app/` 的动态 OG 图（`opengraph-image.tsx`） | 📋 | 官网已有静态 OG 图 |
| C4 | `app/` 的 JSON-LD：`SoftwareApplication` + `ScholarlyArticle` | 📋 | 官网已有产品与 arXiv 预印本结构化数据 |
| C5 | `app/` 的 `llms.txt` 与可直接读取的语料结构 | 📋 | 官网已有产品和论文摘要；应用内语料待开放 |
| C6 | `app/` 的 hreflang（zh / en） | 📋 | 官网已有双语 hreflang，应用内需 i18n 路由方案 |

## 里程碑

| 日期 | 里程碑 | 状态 |
|---|---|---|
| 2026-09-03 | Stage A 全量交付（首个 commit `bae956f`） | ✅ |
| 2026-09-03 | 定位定稿 + 主句三处对齐 + README 重排 + banner | ✅ |
| 2026-09-03 | wiki 体系建立 | 🚧 |
| — | 线上可访问 + LICENSE + 截图（Stage B 收口） | 📋 |
| — | 236 个落地页可被 LLM 爬虫读到（Stage C 收口） | 📋 |

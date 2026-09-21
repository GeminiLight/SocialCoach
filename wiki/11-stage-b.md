<!-- Last verified: 2026-09-03 | Current stage: B -->

# Stage B — 定位与对外物料

> 进行中。本阶段不写代码逻辑，产出是**定位判断**和**对外物料**。定位结论已上升为 [00-product-proposal.md](./00-product-proposal.md#产品定位)，本文件记录得出结论的过程与被否决的方案——防止后续重新掉进同一个坑。

## 功能汇总

| # | 功能 | 状态 | 备注 |
|---|---|---|---|
| B1 | 核心定位陈述 | ✅ | 敌人是「建议」；知道≠做到；A/B 客户分层 |
| B2 | 主句定稿并三处对齐 | ✅ | README / `layout.tsx` / `manifest.webmanifest` |
| B3 | README 按开源产品惯例重排 | ✅ | |
| B4 | 品牌 banner（明暗双版） | ✅ | `docs/banner.svg` / `banner-dark.svg` |
| B5 | 产品截图 | ✅ | 中英各三张，`site/scripts/screenshots.mjs` 对线上版自动拍摄 |
| B6 | LICENSE | 📋 | 需要用户选定许可证 |
| B7 | Live 站点地址 | ✅ | `socialcoach-app.vercel.app`，README 两处 + 仓库 homepage |
| B8 | wiki 文档体系 | 🚧 | 本次建立 |
| B9 | 官网 | ✅ | `site/` → `https://tianfuwang.tech/SocialCoach/`（GitHub Pages，Actions 来源） |

---

## B1: 核心定位

### 三个被否决的定位，以及为什么

| 否决的定位 | 为什么错 |
|---|---|
| **「一个不顺着你的 ChatGPT」**（以 ChatGPT 为对手） | 跟工具比，产品永远只能是它的一个模式。把差异化讲成功能，讲不出为什么要单独存在 |
| **以同类 App 为对手** | 用户的真实替代方案是「在脑子里演」「找朋友吐槽」「让 ChatGPT 扮演对方」，没人在两个练社交的 App 之间做选择 |
| **以机制词为卖点**（练 / 陪练 / 阻力 / 复盘 / 还手） | 那是「你怎么做到的」，不是「用户要什么」。用户不是来买练习的 |

### 最终定位

**敌人是「建议」。** 品类里所有钱都花在让你知道；用户已经买过书、知道该怎么说，然后对方一叹气他就让步了。知道与做到之间那道沟，就是论文的 acquisition / performance 区分，全品类没人管。

**这不是编出来的巧思，它写在 `/api/assess` 里** —— `WeaknessItem.deficit` 字段就是这个区分。产品是唯一把它当第一性问题来建的。

附带收益：买过书还是说不出口的人**已被预筛**——承认痛点、付过费、失败过，不需要被说服存在问题。

→ 完整陈述与 A/B 客户分层见 [00-product-proposal.md](./00-product-proposal.md#目标用户)

---

## B2: 主句

| 决策点 | 选择 | 原因 | 放弃的方案 |
|---|---|---|---|
| 主句 | **Say the thing you've been not saying.** / 想说的话，说出来。 | 卖结果与行动，传播性好；命中「有件事拖了几周还没说」这个真实状态。2026-09-08 用户把中文从「把一直没说的那句话，说出来。」缩成「想说的话，说出来。」，更短更口语 | `You know what to say. You just can't say it yet.` —— 卖共鸣、转化更好，保留作落地页副本 / 广告变体 |
| 门槛句 | 不设 | 用户判断「只在推门前一秒生效的句子产品并不需要」 | `Before you knock.` / 敲门之前 —— 已否决 |
| 发布火力句 | 暂不启用 | 点名对手会把品牌绑在别人名字上；留给发布帖而非产品自身 | `ChatGPT will agree with you. Your boss won't.` —— 保留待用 |

**三处同源，改一处必须改三处：**

| 文件 | 字段 |
|---|---|
| `README.md` | banner SVG 内的文字 + 支撑段落 |
| `app/src/app/layout.tsx` | `metadata.description` |
| `app/public/manifest.webmanifest` | `description` |

---

## B3: README 结构

2026-09-21 按用户确认的 “Your personal EQ coach” 定位重排中英 README；原有品牌主句和 banner 保留。目标是先说明产品、展示练习，再提供开发与部署信息。

```
banner → EQ coach 定位 + 一句用途 → 体验 / 论文 / Apache 2.0 徽章 → 语言切换
章节导航
What you can practice（四类用途 + 真实语料场景）
How it works（三步体验 + 同语言截图 + 体验入口）
Key features（六条，区分沟通表现与对话结果）
Quick start（环境要求、模型配置表、自带模型折叠说明）
Deployment（部署方式表、Compose 折叠步骤）
Data and privacy（本地记录、模型调用、可选统计与反馈）
Architecture（简化数据流 + 源码入口 + 技术栈与设计）
Research（论文说明 + 折叠 BibTeX）
Contributing → Friends → License / 使用边界
```

| 决策点 | 选择 | 原因 |
|---|---|---|
| 首屏定位 | `Your personal EQ coach.` + 用户认可的用途句 | 第一屏先让读者知道是什么，不要求读者从痛点长段落里归纳产品 |
| 品牌主句 | 保留 banner 中的原句 | 本轮只调整 README 的信息顺序，不改四处同源主句 |
| 体验入口 | `socialcoach.aurax.live` 为主，ModelScope 入口放部署表 | 与仓库 About 域名一致；已验证当前跳转 |
| 徽章 | 用户确认采用在线体验 / 论文 / Apache 2.0 三枚统一 `for-the-badge` 徽章，删除重复文字入口 | 覆盖试用、研究与开源许可；色值从 `globals.css` 的 ink / moss / accent-deep / teal 脚本换算 |
| 产品截图 | 英文页用英文截图，中文页用中文截图；可点击查看原图 | 与页面语言一致，小屏可放大查看；素材仍为 2026-09-08 版本，刷新见 backlog |
| 阻力表述 | 保留角色立场和真实异议，强调练习与反馈 | 阻力是训练机制，不把沟通包装成打败对方 |
| 技术细节 | 架构后移，部署细节折叠 | 读者可以先理解体验，再选择本地运行或贡献代码 |
| 隐私与成本 | 区分本地持久化、模型传输、可选统计与反馈；自带 key 只转移模型费用 | 清除“一切都在设备上”“运营成本为零”等过度承诺 |
| 章节视觉 | 保留简洁标题、真实截图、原有明暗 banner | 不增加图标卡片阵列、装饰 emoji 或 Star History |

验证与未完成事项见 [README 评审](./reviews/review-2026-09-21-readme.md)。

---

## B4: 品牌 banner

`docs/banner.svg`（浅色）/ `docs/banner-dark.svg`（暖调低亮），1200×340，README 用 `<picture>` + `prefers-color-scheme` 自动切换。

| 决策点 | 选择 | 原因 |
|---|---|---|
| 色值来源 | 由 `globals.css` 的 OKLCH **脚本精确换算**成 hex | 手调近似色会和 App 内不一致 |
| 字体 | `Georgia,'Iowan Old Style',serif` 栈 | Young Serif 在读者机器上不存在；SVG 文字用的是查看者的字体 |
| 构成元素 | 手稿左边距竖线、赭石波浪批注下划线、右侧五边形雷达（顶点色 = `taxonomy.ts` 的 5 个真实 `hue`） | 全部来自设计 brief 的三个记忆点，不是通用装饰 |
| 下划线长度 | 收在文字末端之内约 14 单位 | 批注线超出文字会被读成渲染 bug |
| 深色版 | 暖调低亮 `#1b1510`，非发光暗色 | 设计原则：夜间也用温暖低亮度，不做发光暗色 |
| mermaid 图 | 只注入 `fontFamily`，**不锁颜色** | 锁品牌色会让深色模式读者看到刺眼浅色块；GitHub 默认主题自己适配 |

**改 banner 必须重新渲染确认**，不能只看 SVG 源码——文字宽度依赖字体回落，下划线与雷达的相对位置会漂。

---

## B9: 官网

`site/` 是独立于 `app/` 的纯静态一页站：`content.mjs`（`L(zh, en)` 文案）+ `build.mjs`（零依赖）→ `dist/`，中文在 `/`，英文在 `/en/`。用户要求「前面 highlight 有论文，最后一节 Research 链接论文」，对应首屏的 arXiv 药丸和末节「这个产品来自一篇论文」。

| 决策点 | 选择 | 原因 | 放弃的方案 |
|---|---|---|---|
| 放哪 | 仓库 `main` 的 `site/`，GitHub Pages 用 **GitHub Actions 来源**部署 | 源码和产品同仓同分支；不用维护孤儿分支；`configure-pages` 会把最终域名（含自定义域）传给构建，canonical / hreflang / sitemap 自动正确 | 单独 `gh-pages` 分支（老做法，多一个要同步的分支）；塞进 Next 应用的 `/about`（官网 URL 难看，且 `/` 已被产品占用并重定向到 onboarding） |
| 双语 | 两个独立 URL + `hreflang` + `x-default` 指向中文 | 搜索引擎和 LLM 爬虫都能拿到完整文本；与 Stage C 的 i18n 方向一致 | 单页 JS 切换语言（爬虫只见一种） |
| 视觉 | 复用 `globals.css` 的 OKLCH 色板（浅 / 深）、banner 的衬线字标与赭石波浪线、五边形雷达 | 与 README banner 和产品一眼同源 | 单独设计一套「官网风」 |
| 截图 | `assets/screenshot-01-home-*.png` / `screenshot-03-evidence-debrief-*.png` 存在才渲染，同时次要 CTA 切成「先看一次真实复盘」 | 不允许占位框上线；截图是 B5 的产物，到位即生效 | 用概念插画或伪造对话（资产计划明确禁止） |
| 论文边界 | 「研究」一节和 `llms.txt` 都写明：论文研究系统 ≠ 当前产品；43,170 条研究语料 ≠ 产品内置 46/42/30 | 避免把论文结果读成产品效果证明 | — |
| 部署保护 | workflow 先查 Pages 是否已启用，未启用则绿色跳过并给 notice | 私有仓库未开 Pages 时不在每次推送上留红叉 | `configure-pages` 的 `enablement: true`（会替用户把站点公开） |

2026-09-08 第二轮（用户反馈「太纯文本」）：加了纸纹底、`*词*` 手绘下划线标记、「不会 / 没做到」两张抽象批注示意图（灰条 + 赭石下划线 + 引出线，刻意不放伪造对话）、四步各配单线图标或真实手机截图、论文卡片加 arXiv 印章、滚动进场（仅 transform / opacity，尊重 reduced-motion）。截图由 `site/scripts/screenshots.mjs` 用 DevTools 协议对线上版自动拍：种一个演示档案 → 首页（展开「为什么是这个」）→ 对练两轮（先含糊后清晰）→ 结束 → 复盘；复盘取滚到「可以更好的」的一帧，因为它同屏有原话、判断、「知道但没做到」归因与换一种说法。

第三轮（用户反馈：语言切换别用纯文字、章节名太随意、要亮暗切换、多用图标）：导航右侧改成「中 | EN」分段控件（仍是真实链接，保住 hreflang）加主题按钮（跟随系统 → 浅 → 深，`localStorage` 记住，`<head>` 内联脚本先于绘制应用 `data-theme`，避免闪烁）；深色 token 同时挂在 `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])` 和 `:root[data-theme="dark"]` 两处。章节改为编号加功能名：01 问题所在 · 02 流程 · 03 语料与出处 · 04 数据与边界（从 03 拆出，四张卡）· 05 常见问题 · 06 研究；导航用两字词：流程 · 依据 · 隐私 · 常见问题 · 论文（用户 2026-09-08 从三组候选里选定，「与」字四字并列被判为说明书腔）。图标是一套自绘单线 SVG（48 视窗、1.6 描边、currentColor），铺在首屏要点、五个数字、四张卡、每条问答和论文链接上。

2026-09-08 用户看过后：主 CTA 从「练明天那场对话」改为「练一场对话」（英文不变），桌面左侧的页边线去掉，论文卡片改成「预印本 · cs.HC · 2026」抬头加 arXiv 印章、按钮只写 arXiv，英文页去掉字标下的「SOCIAL COACH」。首屏下方新增场景滚动条：46 个真实场景标题分两行反向循环滚动，情境用色点区分，悬停暂停，reduced-motion 时不动；数据在构建时从 `corpus/scenarios-*.ts` 正则读取。

2026-09-08 用户点名「熟练度是模型估计」那张卡是废话，要求清掉全站的过度防御。清理结果：04 章改为「数据与部署」三张正向卡（记录在设备上 / 用自己的模型 / 可自部署），删掉「模型估计」和「不做的事」两张；FAQ 从六条减到五条，删「哪些事情不适合用」，「分数可信吗」改成「熟练度是怎么算的」并去掉招聘条款，其余答案去掉「不会。」式开头和自贬结尾；论文卡旁的「边界」改为「论文与产品」，只讲关系，不再写「不应被读成效果证明」；页脚免责压成两句，保留危机求助那句。语料标注、招聘用途等边界仍在产品界面与 wiki/00 里，只是不再在官网反复说。

未做：正式域名（目前挂在账号自定义域 `tianfuwang.tech` 下）。

---

## 遗留项

- **B5 截图**是当前 README 最大的缺口。banner 解决「第一眼有设计感」，但决定是否试用看的是复盘页长什么样。
- **B6 LICENSE 缺失**是实际采用阻碍：团队与公司看到无许可证仓库会直接放弃。需要用户选定。
- **B7** README 两处 `REPLACE-WITH-YOUR-URL` 必须在推送前替换，否则第一个徽章点下去 404。注：`socialcoach.vercel.app` 已被他人占用。→ [80-known-pitfalls.md](./80-known-pitfalls.md#部署)

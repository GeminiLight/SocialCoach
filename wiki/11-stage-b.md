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
| B5 | 产品截图 | 📋 | 首页 / 对话中 / 复盘，三张手机截图 |
| B6 | LICENSE | 📋 | 需要用户选定许可证 |
| B7 | Live 站点地址 | 📋 | README 两处占位符 |
| B8 | wiki 文档体系 | 🚧 | 本次建立 |

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
| 主句 | **Say the thing you've been not saying.** / 把一直没说的那句话，说出来。 | 卖结果与行动，传播性好；命中「有件事拖了几周还没说」这个真实状态 | `You know what to say. You just can't say it yet.` —— 卖共鸣、转化更好，保留作落地页副本 / 广告变体 |
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

按 LobeChat / Open WebUI / Dify 的实际章节命名重排（三者均无 `Why` / `Screens` 这类散文式标题）：

```
banner → 导航链接行 → 徽章 → pitch 段落
Key features（全文最大一节，8 条）
  └ <details> Every screen（路由表折叠）
Architecture（mermaid 流程图）
Quick start
Deployment
Tech stack
Design
Contributing
Disclaimer（GitHub 原生 [!IMPORTANT] 告示块）
Research（论文 + BibTeX，压到最后）
```

| 决策点 | 选择 | 原因 |
|---|---|---|
| 论文内容位置 | 压到最后的 `Research` 一节 | 用户明确要求整体从产品角度出发；`Paper → product` 对照表是研究复现清单，读者是审稿人不是用户，已删除 |
| 徽章数量 | 2 个（Live + arXiv），`for-the-badge` 大号样式，统一深墨底 `#2B2018` | 12 个小徽章分散重点；技术栈信息在 `Tech stack` 段落里已有 |
| 章节名 emoji | **不加** | 三个参考项目都加，但与 banner 的编辑感排版打架，且违反设计反参考。破例需显式决定 |
| 图标卡片阵列 | **不排** | 设计反参考明确禁止「同尺寸图标卡片阵列」，即使它是 README 变好看最常用的手段 |
| Star History 图 | 暂不加 | 新仓库 star 少，空图表反而露怯 |
| `app/README.md` | 已删除 | 44 行里 30 行与根 README 重复，两份必然漂移。历史在 `bae956f` |

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

## 遗留项

- **B5 截图**是当前 README 最大的缺口。banner 解决「第一眼有设计感」，但决定是否试用看的是复盘页长什么样。
- **B6 LICENSE 缺失**是实际采用阻碍：团队与公司看到无许可证仓库会直接放弃。需要用户选定。
- **B7** README 两处 `REPLACE-WITH-YOUR-URL` 必须在推送前替换，否则第一个徽章点下去 404。注：`socialcoach.vercel.app` 已被他人占用。→ [80-known-pitfalls.md](./80-known-pitfalls.md#部署)

<!-- Last verified: 2026-09-03 | Current stage: B -->

# 踩坑记录

> 单点问题记这里；同一模块连续 3+ 相关 bug 时新建 `81-postmortem-{topic}.md`。

## API 集成

### 网关不支持 `output_config.format`
- **现象：** 用 SDK 的结构化输出 / JSON mode 会失败。
- **原因：** 在用的网关不支持该参数（`src/lib/llm.ts` 有注释记录）。
- **解决方案：** 在 prompt 里要求 JSON，用 `extractJSON()` 宽松解析——剥 ``` 代码围栏、容忍前后散文、`fixUnescapedQuotes()` 修未转义引号。
- **教训：** 任何「让模型返回结构化数据」的新代码都要走 `jsonCall()` / `extractJSON()`，不要直接用 SDK 的 format 参数。

### 流式响应的错误拿不到状态码
- **现象：** 模型在流开始后报错，客户端只看到 HTTP 200 和一段截断的文本。
- **原因：** 响应头已发出，无法再改状态码。
- **解决方案：** `textStream()` 与 `/api/assess` 在流内追加 `\n@@error\n<message>`。
- **教训：** 消费任何流式路由时**必须解析流尾**，不能只判断 `res.ok`。

### 模型返回的技能 id / 数值不可信
- **现象：** 报告里出现不存在的 `SkillId`，或 `deltas` 越界。
- **原因：** prompt 约束不等于类型安全。
- **解决方案：** `/api/assess` 服务端对照 `SKILLS` 校验并 clamp，之后才发 `@@final`。
- **教训：** 任何要写进持久化状态的模型输出，都在服务端 clamp 后再交给客户端。

## 前端

### 8/8 页面 `use client` 导致零可索引性
- **现象：** 爬虫（尤其 GPTBot / ClaudeBot / PerplexityBot，基本不渲染 JS）拿到空 `<body>`。
- **原因：** Stage A 只考虑交互，全部页面走客户端渲染 + localStorage。
- **解决方案：** 未修复。方案见 [12-stage-c.md](./12-stage-c.md)。
- **教训：** 有内容型语料的项目，从第一天就要把「内容页」和「交互页」分开——内容页 server render，交互页 client。

### 把结构挂在分布倾斜的类别上
- **现象：** 场景封面按 `context` 各配一套构图，首页四张并排却是同一张图。
- **原因：** 34 个场景里 14 个是 `workplace`（41%）。类别分布倾斜时，「每类一套」在最常见的那类里等于「只有一套」。
- **解决方案：** 结构改由场景自身内容（`opening.text`）决定，类别只用来定颜色。
- **教训：** 做「按类别变化」的视觉系统前先数一下各类的实际条数。倾斜超过 ~30% 就不要把结构挂在它上面。

### Tailwind v4 不认识的工具类会静默失效
- **现象：** 写了 `decoration-accent` 却没有颜色，构建和 lint 都不报错。
- **原因：** Tailwind v4 对无法从 token 生成的工具类不报错，只是不生成规则。
- **解决方案：** 关键视觉（尤其颜色）用 inline style 引 CSS 变量，或先确认 token 已在 `@theme` 注册。
- **教训：** 「构建通过」不等于「样式生效」。新工具类要么亲眼验证，要么用 inline style。

### 绝对定位子元素不设水平锚点
- **现象：** 胶囊开关的 knob 在 ON 态被推出轨道外。
- **原因：** knob 只写了 `top-1`，没有 `left`。水平位置退回「静态位置」，而静态位置受 `<button>` 默认 `text-align: center` 影响，`translate-x` 的起点不确定。
- **解决方案：** 显式写 `left`。另外加 1px 边框后 `box-sizing: border-box` 会改变内框尺寸，内边距要跟着重算（48×28 带 1px 边框 → 内框 46×26 → 20px knob 的对称内边距是 3px，行程 20px）。
- **教训：** 绝对定位元素的两个轴都要显式锚定，不要依赖静态位置。

## 构建 / 部署

### `socialcoach.vercel.app` 已被他人占用
- **现象：** 该域名返回 HTTP 200，但页面是 `lang="es"` 的深蓝暗色应用，与本项目无关。
- **原因：** Vercel 子域先到先得，同名撞车。
- **解决方案：** 换子域（`socialcoach-app` 等）或绑自有域名。**不要凭直觉假设子域可用**。
- **教训：** 对外物料里写任何 URL 前先 `curl` 验证内容特征，不能只看状态码——200 不代表是你的站。

### Vercel Root Directory 必须设为 `app`
- **现象：** 直接部署仓库根目录会找不到 Next.js 项目。
- **原因：** 应用在 `app/` 子目录，仓库根只有 `docs/` `wiki/` 和 README。
- **解决方案：** Vercel 项目设置里 Root Directory = `app`。
- **教训：** monorepo 式布局的部署说明必须写在 README 的 Deployment 一节（已写）。

### 临时夹具路由差点上线
- **现象：** `/api/dev-seed` 是调复盘页布局用的假数据端点，文件首行写着 *delete before committing*，但**没有任何 `NODE_ENV` 守卫**。
- **原因：** 「稍后删」依赖人记得，而 Next.js 的 `app/api/**` 是约定式路由——文件存在就是线上端点。
- **解决方案：** 已删除（2026-09-03）。
- **教训：** 临时端点从写下第一行起就加 `if (process.env.NODE_ENV === "production") return new Response(null, {status: 404})`，不要依赖注释和记性。

## 对外物料

### SVG 里的自定义字体在他人机器上不存在
- **现象：** banner 用 Young Serif 会回落成系统默认字体，排版走形。
- **原因：** SVG 作为图片加载时，`<text>` 用的是**查看者**机器的字体。
- **解决方案：** 对外 SVG 一律用 `Georgia,'Iowan Old Style',serif` 广泛可用栈。
- **教训：** 改完 SVG 必须实际渲染确认（`qlmanage -t` → 读 PNG），不能只看源码——文字宽度依赖字体，装饰线的相对位置会漂。

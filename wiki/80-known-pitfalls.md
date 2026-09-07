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

### 回合末尾的 `@@meta` 会被模型丢掉
- **现象：** 对话里的目标进度条一格都不填，复盘却判「达成 3/3」。表盘、`revealed` 同样收不到值。
- **原因：** roleplay 的 sidecar 协议把 `@@meta` 放在台词**之后**。实测六个回合，快模型只输出了两次；很多回复连 `@@角色` 标记都没有，是 `parseRoleplay` 的「无标记文本归给第一个 NPC」兜底把这件事掩盖成了「看起来正常」。
- **解决方案：** 把 `@@meta` 移到回合最前面，并在 prompt 里写明它必须第一、不可省略、不可包代码围栏。改完 6/6 全中。`parseRoleplay` 相应要用「是否还在 meta 块内」的状态来判断边界，而不是靠缓冲区是否存在——否则下一个 `@@角色` 之后的台词会继续被灌进 meta。
- **教训：** 让模型在一次回复里既产出内容又产出结构时，**结构放前面**。放末尾就是在赌它写完内容还有耐心。另外「有兜底」和「没出错」是两回事，兜底会把协议失效伪装成正常。

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

### HTML 里不加引号的属性会把 `/>` 吞进值
- **现象：** SVG 的 `clipPath` 完全不生效，整个被裁剪的分组一个像素都不渲染，且无任何报错。
- **原因：** 写的是 `<circle cx=12 cy=12 r=12/>`。这是 HTML 而不是 XML 解析，无引号属性值一直读到空白为止，所以 `r` 的值是 `12/`——非法长度，裁剪区域为空。而 SVG 规范里 `clip-path` 指向无效目标时元素**不渲染**，于是失败表现为「什么都没有」。
- **解决方案：** 属性值加引号，或在 `/>` 前留一个空格。最后一个属性带引号时正好躲过这个坑，所以问题会时有时无。
- **教训：** 手写 SVG 字符串时属性一律加引号。「一部分图形不显示」先查解析而不是查几何。

### 颜色 token 不是工具类
- **现象：** `<blockquote className="slab … text-slab-ink">` 里的文字在浅色下完全看不见，DOM 里文本却存在。
- **原因：** `globals.css` 注册的是 `--color-slab` / `--color-slab-ink`，对应的工具类是 `bg-slab` / `text-slab-ink`。`slab` 单独写不匹配任何规则，背景没上，而 `text-slab-ink` 在浅色下是接近纸白的颜色，正好落在纸面上。
- **解决方案：** 写 `bg-slab text-slab-ink`。仓库里 `Debrief` 的「下一步」区块就是正确用法，可以对照。
- **教训：** 这是「Tailwind v4 不认识的工具类会静默失效」的一个具体形态，而且更隐蔽：文字仍在无障碍树里，截图才看得出来。深浅两色都要各看一眼。

### 绝对定位子元素不设水平锚点
- **现象：** 胶囊开关的 knob 在 ON 态被推出轨道外。
- **原因：** knob 只写了 `top-1`，没有 `left`。水平位置退回「静态位置」，而静态位置受 `<button>` 默认 `text-align: center` 影响，`translate-x` 的起点不确定。
- **解决方案：** 显式写 `left`。另外加 1px 边框后 `box-sizing: border-box` 会改变内框尺寸，内边距要跟着重算（48×28 带 1px 边框 → 内框 46×26 → 20px knob 的对称内边距是 3px，行程 20px）。
- **教训：** 绝对定位元素的两个轴都要显式锚定，不要依赖静态位置。

### 关闭的双语弹窗也可能触发水合错误
- **现象：** 将 `Sheet` 换成原生 `dialog` 后，刷新中文页面出现服务端 `Model` 与客户端「模型」不一致。
- **原因：** 浏览器原生关闭状态只是隐藏元素；如果始终输出内容，服务端默认语言与客户端档案语言仍会参与 React 水合。
- **解决方案：** `Sheet` 在 `open=false` 时返回 `null`，打开后才渲染并调用 `showModal()`。不要依赖原生隐藏状态跳过水合。
- **教训：** 无障碍组件改造要同时验证首次加载、刷新和语言切换，不能只检查客户端点击打开。

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

### 本机 headless Chrome 截图写完文件却不退出
- **现象：** `Google Chrome --headless --screenshot=x.png …` 产出了 PNG，但进程一直挂着，工具超时。`--headless=new`、`--timeout`、`--virtual-time-budget` 都没用。
- **原因：** 未定位（Chrome 152 / macOS 25.5）。文件在几秒内就写好了，是退出卡住。
- **解决方案：** 后台启动，轮询文件出现后 `kill`。另外 Chrome 桌面窗口有最小宽度，`--window-size=390,…` 实际按约 500px 排版再裁到 390，**手机宽度必须用一个 390px 的 `<iframe>` 包起来截**（要加 `--allow-file-access-from-files`）。
- **教训：** 截图工具的输出尺寸对不代表排版视口对；核对一次真实断点行为再下结论。

### pnpm 不会把 `sharp` 提升到 `app/node_modules/sharp`
- **现象：** `createRequire(app/package.json)('sharp')` 报 `Cannot find module 'sharp'`，虽然 Next 依赖它、构建也能用。
- **原因：** pnpm 只把直接依赖放到 `node_modules/` 顶层，`sharp` 是 Next 的可选依赖，只在虚拟仓 `node_modules/.pnpm/` 里。
- **解决方案：** `require(join(appDir, 'node_modules', '.pnpm', 'node_modules', 'sharp'))`——`.pnpm/node_modules/` 是 pnpm 的「隐藏提升」目录，所有传递依赖都在。`site/scripts/og.mjs` 用的就是这条路径。
- **教训：** 借 app 的依赖做脚本时，按 pnpm 的目录结构解析，不要假设 npm 的扁平布局。

## 协作

### 有并发编辑者时，验证「工作区」等于没验证
- **现象：** 按路径整文件 `git add` 之后本地 `tsc` / `build` 全绿，推上去 HEAD 却构建不了（2026-09-04 发生过一次；2026-09-07 同一个坑在提交前被拦住）。
- **原因：** 工作区里同时有自己的改动和另一个编辑者未完成的改动。整文件暂存会把对方的半成品一起带上，而对方依赖的**其他**文件没被暂存。工作区能构建，因为那些文件在工作区都存在；`HEAD` 不能，因为它们不在。行数也不能当判据——2026-09-07 那次 `Chat.tsx` 的 32 行改动**看起来**刚好等于自己的量，其实里面混了对方新加的七个 i18n 键。
- **解决方案：** 两步。先按内容标记逐个 hunk 暂存（`git diff -U0` 取出属于自己的 hunk，`git apply --cached --unidiff-zero`），再验证**暂存树本身**：
  ```bash
  T=$(git write-tree); C=$(git commit-tree "$T" -p HEAD -m verify)
  git worktree add --detach /tmp/verify "$C"
  cp -Rc app/node_modules /tmp/verify/app/node_modules   # 不能用 ln -s
  cd /tmp/verify/app && pnpm exec tsc --noEmit && pnpm build
  ```
  Turbopack 拒绝跨文件系统根的 `node_modules` 软链，所以用 APFS 克隆 `cp -Rc`（秒级，不额外占空间）。
- **教训：** 提交前要验证的是**将要提交的那棵树**，不是手边的工作区。这两者在多人同时改一个仓库时经常不同。

## 对外物料

### SVG 里的自定义字体在他人机器上不存在
- **现象：** banner 用 Young Serif 会回落成系统默认字体，排版走形。
- **原因：** SVG 作为图片加载时，`<text>` 用的是**查看者**机器的字体。
- **解决方案：** 对外 SVG 一律用 `Georgia,'Iowan Old Style',serif` 广泛可用栈。
- **教训：** 改完 SVG 必须实际渲染确认（`qlmanage -t` → 读 PNG），不能只看源码——文字宽度依赖字体，装饰线的相对位置会漂。

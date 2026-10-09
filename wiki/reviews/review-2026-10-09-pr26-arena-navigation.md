# PR #26：练习场筛选与导航审核

2026-10-09。结论：**当前补丁不合并**，正式构建复现连续筛选丢条件；保留已发布实现。没有修改贡献者分支、发布应用或发送外部评审消息。

- PR：[fix: sync arena filters with route state](https://github.com/GeminiLight/SocialCoach/pull/26)
- 审核提交：`f5f69f246f6451e6b372df680bb685b6004faba9`。
- 对照主线：`8603873a8df107d7c8ebe8602e06d7a931293e53`；本地将 PR 合入该主线，完整差异仅 `app/src/app/arena/page.tsx` 两处 History API 改为 `router.replace`。验收后已撤销临时合并。

## 已复现问题

**P2，`page.tsx:47`：连续筛选读取尚未更新的地址，后一次覆盖前一次。** `setFilter` 仍从 `window.location.search` 构造条件，但 `router.replace` 的导航提交晚于下一次输入。先点击“职场”，随后点击“本次新增”，最终只剩 `collection=recent`，`context=workplace` 丢失。正式构建和开发构建、Chromium / WebKit、375px / 1440px 四组均复现。用户因此看到所有情境的新场景，而非自己选择的职场新场景。对照实现四组均保留两项条件。

同一行还在**开发构建**复现受控搜索框丢字：以 12ms 间隔输入 `manager`，最后搜索框与查询仅剩 `r`。`q` 直接取异步路由快照，每次输入后 React 恢复旧值；对照实现保留完整输入。**正式构建此次四组均保留 `manager`，不能把开发构建反例写成已复现的生产丢字故障。**

建议保留当前同步 History API；如确需异步路由，应先独立维护即时输入与尚未提交的完整筛选状态，并补连续输入、组合筛选及返回恢复验收。原 PR 所称“地址更新但界面不更新”在本次对照环境没有复现，需保留其具体版本、进入路径和操作证据，再定位原因。

## 原因与范围

当前安装 Next.js `16.3.8` 的本地指南与 `app-router.js` 都明确接入原生 `pushState` / `replaceState`，会更新 `useSearchParams`，不能按“原生 History API 不会通知 Next.js”直接替换。上游说明：[Native History API](https://nextjs.org/docs/app/getting-started/linking-and-navigating#native-history-api)。

沿调用链核对搜索、情境、新场景集合、技能、难度、练习状态、分页、清除条件及 `rememberArenaLocation` / `arenaReturnPath`。本补丁未变更模型、共享额度、手机反馈入口或 3D 实现。

## 验证与限制

- 每个构建 / 修订组合分别运行 Chromium 与 WebKit、375px 与 1440px，共 16 个浏览器案例。为重现快速连续操作，RSC 导航请求增加 350ms 延迟；所有 API 为隔离桩，没有付费生成、真实反馈提交或用户档案修改。
- PR 合入主线后的页面 lint、类型检查、差异空白检查及正式构建均通过；主线正式构建也通过。这些检查不能替代上述交互验收。本轮没有重跑无关的完整模型 / 3D 测试集。
- GitHub 应用工作流 `37873888195` 为 `action_required`，未运行通过；Vercel PR 状态为贡献者部署授权失败，不能当成应用编译失败。
- WebKit 正式构建案例还记录了导航离开时的预取 access-control 错误；没有据此归因为本 PR 缺陷，也没有宣称控制台零错误。未测试真实 iPhone / 微信或修改线上版本。

原始结果见 [证据目录](../../docs/reviews/pr26-arena-navigation-2026-10-09/README.md)。重新审核门槛：明确原故障复现路径，修改后保留快速输入和连续组合条件，并运行实际应用检查。

# PR #26 交互审核原件

审核提交 `f5f69f2`，对照主线 `8603873`；详细判断见 [Wiki 审核](../../../wiki/reviews/review-2026-10-09-pr26-arena-navigation.md)。这些是本地受控验证，没有发布补丁或调用付费模型。

| 原件 | 构建 | 搜索结果 | 连续选择职场 / 本次新增 |
|---|---|---|---|
| [baseline.json](./baseline.json) | 原实现，开发 | 四组均为 manager | 四组均保留两项 |
| [proposed.json](./proposed.json) | PR，开发 | 四组仅剩 r | 四组丢职场 |
| [production-baseline.json](./production-baseline.json) | 原实现，正式 | 四组均为 manager | 四组均保留两项 |
| [production-proposed.json](./production-proposed.json) | PR，正式 | 四组均为 manager | 四组丢职场 |

每份覆盖 Chromium / WebKit × 375px / 1440px。脚本 [browser-review.mjs](./browser-review.mjs) 创建隔离档案、屏蔽 API，并在 RSC 请求上增加 350ms 延迟；文字逐字输入间隔 12ms。原始输出保留控制台错误，正式 WebKit 的离开预取错误没有计为补丁缺陷。

复跑：在 app/ 启动相应修订的开发或正式服务器；给脚本设置 REVIEW_BASE_URL、PLAYWRIGHT_MODULE（与已安装浏览器匹配的 Playwright 模块）并传入案例标签。结果写入系统临时目录。运行时按 JSON 中的实际行为审核，脚本不会把存在结果文件当成全部通过。此次环境的 Playwright Core 从已安装依赖只读加载，未给产品增加浏览器依赖。

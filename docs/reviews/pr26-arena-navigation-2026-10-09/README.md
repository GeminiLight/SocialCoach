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

## 2026-10-10 修订

原作者为 Yi Zhan（[@USTChandsomeboy](https://github.com/USTChandsomeboy)）；集成保留原始提交 `f5f69f2`，详细修订见 [验收](../../../wiki/reviews/review-2026-10-10-pr26-arena-revision.md)。

- [本轮原补丁反例](./red-revision.json)：再次复现，未据此推断原用户设备的具体故障。
- [修订后的快速操作](./green-revision.json)：四组均保留完整 manager 及两个条件，额外关闭框架 History 通知。
- [开发构建完整回归](./revision-dev.json)：八组，包含全部关键流程断言。
- [正式构建完整回归](./revision-production.json)：相同验收边界。
- [修订验收脚本](./revision-browser.mjs)：使用真实浏览器、断言和隔离档案，不以结果文件存在作为通过。脚本仅接受本地服务器；PLAYWRIGHT_MODULE 指定与已安装浏览器匹配的只读依赖。

关闭框架通知是受控代理：保留真实 History 写入及其路由状态，只绕过 Next.js 对 replaceState 的通知。它不能代替真实微信设备验收。

## 合并与公开页面

PR #26 经维护者修订 PR #30 保留历史合入；两项均为 MERGED，主线 `c347a8a`。原作者 Yi Zhan / @USTChandsomeboy 的 `f5f69f2` 保留，GitHub Contributors 已列出该用户。远端 PR 与主线质量检查均通过。

Vercel 生产 Ready；ModelScope 来源 `c347a8a`、镜像 `6cf21c9`、411 个构建输入一致、Running。公开页面分别用主站 WebKit / 国内嵌入页 Chromium 的手机视口复核快速输入、组合选择和实际列表；额外关闭框架通知，确认发布修订确实生效，没有生成请求。

- [发布与 credit 原件](./release.json)
- [主站公开浏览器](./live-main.json)
- [国内公开浏览器](./live-studio.json)
- [WebKit 返回后输入的八次针对性回归](./focused-webkit.json)；首次未定位的自动化现象及真机边界保留在 Wiki，不把复跑当成根因修复。

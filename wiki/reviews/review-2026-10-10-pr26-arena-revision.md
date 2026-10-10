# PR #26 筛选修订与贡献署名

2026-10-10，用户要求精审、修订后合并，并给贡献者 credit。原贡献：[Yi Zhan / @USTChandsomeboy](https://github.com/USTChandsomeboy)，PR [#26](https://github.com/GeminiLight/SocialCoach/pull/26)，原始提交 `f5f69f246f6451e6b372df680bb685b6004faba9`。集成分支保留该提交与作者，不把贡献改写成维护者独自完成。

## 最终修订

原补丁的异步 `router.replace` 读取旧地址，连续筛选会覆盖前一项；开发构建还复现受控搜索丢字。修订保留同步 History API，并在写地址 / 目录返回位置之后发布本地通知；页面通过 `useSyncExternalStore` 直接订阅稳定查询字符串和 `popstate`，SSR 快照仍来自 Next.js 查询。搜索、清空和组合筛选因此立即刷新，不依赖框架对 History 的通知，也不增加按键级网络请求。

没有新增持久化字段、模型调用、账号、存储服务或视觉文案。现有模型接入、手机反馈、共享额度和 3D 流程不变。相同读旧地址模式只在该页面发现，本轮没有扩大到无关路由。

## 证据与边界

- 原补丁在本轮再次复现：四组开发浏览器均丢情境和搜索字符，原件保留。原始故障的具体设备 / 进入路径仍未知；本轮采用关闭框架 History 通知的受控代理，验证地址已变化时界面仍即时刷新，不声称已定位任意浏览器内核的问题。
- Chromium / WebKit × 375px / 1440px × 中文 / 英文，开发与正式构建分别验证；检查组合筛选、刷新、前进后退、场景返回、清空焦点、分页重置、快速逐字输入、中文输入、空结果恢复及缺失框架通知。
- 新增核心回归核对：通知时地址与返回位置已经提交，`popstate` 可刷新订阅，卸载移除监听，History 写入失败不伪造已保存位置。
- 66 项核心与 256 项 3D 检查、lint / 类型与正式构建通过；开发 / 正式各八组，共 16 组浏览器验收，覆盖上述全部关键流程。所有生成 API 被隔离，不发生付费生成或真实反馈提交。真实 iPhone / 微信仍未测试。
- 首次正式 WebKit 375px 英文自动化案例曾读到空输入，未采到该次键盘 / 焦点事件；随后完整八组及该组合八次针对性回归均通过。保留这一未定位的自动化现象，不把复跑当成根因修复，也不据此宣称真实设备故障已解决；后续真机验收需继续观察返回后的快速输入。

原件与复跑脚本见 [审核证据](../../docs/reviews/pr26-arena-navigation-2026-10-09/README.md)。合并 / 发布状态以该目录追加的真实检查结果为准。

## 合并

原 Fork 的部署授权受限，修订经维护者仓库 [PR #30](https://github.com/GeminiLight/SocialCoach/pull/30) 验证；审核头 `2b24a69`、GitHub Actions `38043441241` 与 Vercel 预览 `dpl_DEsddGxRjioTwAHnzVVxq6TL3Cwb` 均通过。采用保留历史的 merge 合入，主线为 `c347a8a47157d3707581f36d2a91ac5c5c6e322c`，两项 PR 均显示 MERGED。

原始贡献提交 `f5f69f2` 是主线祖先，GitHub 将作者识别为 `USTChandsomeboy` / Yi Zhan。README 的 Contributors 使用 GitHub 贡献列表生成圆形头像，无需另建手工作者名单；平台列表缓存可能稍晚更新。

## 发布复核

主线 CI `38043624789` 通过。Vercel 生产 `dpl_Ch7EnBh5xfDkFDq7Gcr81cktH3qd` Ready；ModelScope 镜像 `6cf21c9`、来源 `c347a8a`，411 个构建输入与主线逐项一致，Running，保留公开免费硬件。

主站 WebKit / 国内公开嵌入页 Chromium 的 375px 视口分别验证完整 `manager` 输入、职场与新增并选、三个结果均为职场；额外绕过框架 History 通知，确认实际发布包含显式订阅修订。没有调用生成 API 或发送真实反馈。原件见 [发布记录](../../docs/reviews/pr26-arena-navigation-2026-10-09/release.json)、[主站](../../docs/reviews/pr26-arena-navigation-2026-10-09/live-main.json)、[国内站](../../docs/reviews/pr26-arena-navigation-2026-10-09/live-studio.json)。GitHub Contributors API 已列出 `USTChandsomeboy`，贡献计数 1。

Skill evolution：无需修改技能；同步地址、订阅与异步导航之间的边界已记录到本仓库架构和 pitfalls。

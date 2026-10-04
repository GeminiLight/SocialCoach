# ModelScope 界面同步发布 · 2026-10-05

已验证的应用来源 `8b337d59892962d40f0e9decfece11f831039fd4` 已同步至国内镜像 `71b01e384f673accb47d985c2780488e1c420863`。本轮带入教练 IP 与紧凑语言切换，沿用主线已有工作区界面与文字剧情。Vercel 对应生产部署 Ready，国内显式重建后 Running；没有发布主仓库并行中的未提交功能。

- [同步核对](./source-sync.json)：231 个源码 / 素材文件逐项一致，空间 README 未改变，无环境文件或凭证进入镜像仓库。
- [云端构建与启动](./runtime.json)：镜像 tag 含 `71b01e38`，构建完成，服务监听 7860，空间 Running。
- [Vercel 生产检查](./vercel.json)：应用来源相同，正式域名别名指向 Ready 部署。
- [认证 API 检查](./authenticated-resources.json)、[不带凭证的公共入口检查](./public-resources.json)：每侧 8 项页面 / 配置 / 图片 / health 及 22 个引用资源为 200，小猫原图哈希及新版 CSS / JS 特征通过。
- [实际浏览器检查](./browser.json)：公开全屏入口加载小猫与新版语言选择；两个选项各 50×44px、间距 4px；切换英文与返回中文正常，英文偏好在 iframe 重新加载后保留。见 [中文截图](./onboarding-zh.png)、[英文截图](./onboarding-en.png)。

默认系统代理下首次公共 iframe 连接中断；同机直连公共 host 和仅该测试浏览器使用 `--no-proxy-server` 后通过。没有关闭 TLS 证书校验或修改系统代理，不能把这一局部网络失败归为部署失败。此差异见 [运维踩坑](../../../wiki/80-known-pitfalls.md#modelscope-公共-iframe-访问会受本机系统代理影响)。

本轮没有计费推理请求，也没有发送反馈；浏览器匿名事件接口已拦截。免费 health 的 `available` 是连接检测结果，不等于完成整轮模型对话。本记录只覆盖部署、资源及桌面欢迎页关键交互，不代替整轮练习、3D 操作或手机端验收。

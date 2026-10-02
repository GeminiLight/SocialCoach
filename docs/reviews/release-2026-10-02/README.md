# 双平台发布 · 2026-10-02

发布范围为前两轮体验精修与六组可靠性修复。应用提交 GitHub `adaae5c` / ModelScope `52c5b78`；同步后 102 个源码 / public 文件逐文件一致。完整经过及验证限制见 [部署记录](../../../wiki/specs/spec-modelscope-deployment.md#体验精修与中断恢复更新2026-10-02)。

- [Vercel 发布摘要](./vercel-deployment.json)：生产 Ready，应用 SHA 与正式别名一致。摘要来自 CLI 的部署列表与 inspect，不包含账户凭证。后续仅文档提交可能触发自动部署，应用源码仍为同一快照。
- [ModelScope 线上接口](./modelscope-smoke.json)：Running；页面与引用资源正常；合成 roleplay / assess 返回当前协议与证据校验后的报告。不保存测试转录到真实用户档案，没有提交反馈或统计。
- [公共资源版本检查](./public-resource-check.json)：以普通浏览器请求头读取公开 HTML / JS，确认恢复功能的三个标记。
- [公共嵌入页异常画面](./modelscope-browser-connection.png)：一次性 Chromium 中 iframe 显示连接异常。后台正常与公开资源更新，均不等于完整浏览器验收通过；此项仍在 backlog。

正式入口：[统一网址](https://socialcoach.aurax.live/)、[Vercel](https://socialcoach-ai.vercel.app/)、[ModelScope](https://modelscope.cn/studios/GeminiLight/SocialCoach?mode=full)。统一网址继续按已有地区规则分流，没有改变用户数据所在域名。

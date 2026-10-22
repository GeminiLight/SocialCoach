# 现有练习体验精修验收

本目录只包含合成档案的产品测试，未使用真实用户对话或未公开研究材料。

- `edge-checks.json` / `narrow-en.png`：320px 长原话展开、请求暂停后刷新续接、模型等待不误报启动失败。
- `checks.json`：首次资源故障、慢加载、禁用脚本、双语局部重试闭环；响应在浏览器拦截，真实模型调用 0。
- `blocked-zh.png` / `blocked-en.png`：应用脚本 503 时仍可重新加载，语言来自邀请 URL。
- `slow-start.png`：减少动效设置下的慢加载状态。
- `entry-zh.png` / `entry-en.png`：原句在前、明确的局部重试和整场重练。
- `review-zh.png` / `review-en.png`：回顾后的原句对照与返回入口。

[范围与发布记录](../../../wiki/reviews/review-2026-10-22-experience-polish.md)。模拟手机视口不代表实体手机或微信内置浏览器验证。

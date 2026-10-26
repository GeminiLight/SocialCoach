# 五期 H 视频接入验收原件

- `web-media-qa.json`：五支压缩影片完整解码与缩放后 SSIM、源 / 导出体积。
- `video-network-proof.json`：实际 Chrome 操作前后，媒体请求的服务端记录摘要；测试入口屏蔽匿名统计，未发送模型请求。
- `mobile-playing.png`：390px 浏览器内 iframe 实际播放，不代表实体手机测试。

功能与限制见 [Wiki 评审](../../../wiki/reviews/review-2026-10-26-five-video-lessons.md)。两端已发布：应用源 `1995e1e`，Vercel `dpl_3QJwrtmC5FQU2kkyZZTgzFBRrBvJ` Ready；ModelScope `a16f061` / 镜像 `363578-a16f061c-2026-10-26-11-33-27` Running。

- `deployments.json`：源提交、平台版本、CI和浏览器验收范围。
- `vercel-production-media.json` / `modelscope-production-media.json`：各五片完整GET SHA256、206 Range、immutable缓存，及封面 / 字幕字节匹配。国内记录来自平台专用认证地址；没有保存凭证。
- `modelscope-runtime.json`：白名单运行状态，原公开性及免费硬件。
- `modelscope-public-http.json`：公开展示host的普通浏览器请求头检查，独立于认证地址。

真实Chrome桌面与390px本地交互通过；本轮正式页面互动因扩展读取超时 / 原生浏览器控制中断未完成。HTTP资源通过不替代公开浏览器或实体手机播放验收。

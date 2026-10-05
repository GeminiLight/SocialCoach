# SocialCoach 当前版本发布核对

2026-10-06，用户授权更新当前版本。Vercel 正式发布 Ready，国内 ModelScope 显式重建后 Running。应用源码 `d55a2b2`，Docker 打包修复 `c2a8211`；国内源 `e6e5275`。本轮使用隔离的已提交版本，正在进行的架构审核改动继续留在工作区。

正式入口：[主站](https://socialcoach.aurax.live)、[3D](https://socialcoach-ai.vercel.app/3d)、[国内空间](https://modelscope.cn/studios/GeminiLight/SocialCoach)。

- 231 项饭局检查、生产构建与类型检查通过。
- Vercel 源提交 / Ready / production / 正式别名均由平台 API 核对，详见 `release.json`。
- 国内成功构建镜像 `363578-e6e52759-2026-10-06-00-33-42`；Next.js 7860 Ready / Running 已确认。255 份源 / 公共文件与发布源逐个一致。
- 国内认证后端 24 GLB、3D 清单、山水纹理和首页预览共 27 项线上 SHA256 匹配，首页 / 3D / health / 本地读取清单均 HTTP 200，详见 `ms-assets.json`。
- 构建准备脚本必须与 `.dockerignore` 白名单一起同步；自动生成的本地文档读取资源由云端构建生成。

本次内置浏览器及 Chrome 连接超时，线上画面人工复核未完成，未重新发送线上模型对话。人物与参考图的质量差距、真实手机体验仍待验收。免费生成白模仅是本地候选，没有替换线上 NPC。

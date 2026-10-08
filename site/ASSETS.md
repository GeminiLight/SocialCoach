# 首页素材来源

2026-10-09 更新。所有产品画面均来自实际产品；截图做矩形裁切与 WebP 压缩，没有修改画面中的内容或伪造 UI。

| 素材 | 来源与处理 |
|---|---|
| `arena-{zh,en}.webp` | 当日 Vercel 正式应用 `/arena`，独立浏览器中的演示档案，1440×1000 截图裁切场景目录为 1152×820。无需模型调用 |
| `scene-work-{zh,en}.webp` | 当日正式应用 `/3d` 的职场敬酒开局、第三人称，1600×1000 截图裁切场景区域为 1200×400。首页注明局部实景；下方文字摘自该开局台词 |
| `scene-elevator-{zh,en}.webp` | 当日正式应用电梯 HR 开局，1440×900 截图裁切场景与开场台词为 1440×510。中英文台词换行不同，分别裁切 |
| `coach.webp` | `app/public/images/coach/socialcoach-cat.webp`，缩至 192×256 内 |
| `video-dinner-toast.webp` / `video-elevator-hr.webp` | `app/public/videos/learning/*-frame.jpg`，缩至 540×960；虚构示范，中文配音，产品提供中英字幕 |
| `screenshot-03-evidence-debrief-{zh,en}.png` | 已有真实演示复盘截图。引用原话保持一致，页面明确标注为示例 |
| `og-{zh,en}.png` | `node site/scripts/og.mjs` 从上述职场实景、猫咪与双语主句生成；色彩从应用 OKLCH token 转换 |

拍摄时共享额度已用尽，页面仍允许浏览内容和切换场景。官网展示场景区域，不把截图当作当时模型服务可用的证据；FAQ 说明共享额度和自带模型。3D 画面未发送模型消息。

原始拍摄保留在本次本地浏览器会话及 `/tmp/sc-*`，正式版只提交经过压缩的上述素材。后续更新应重新拍摄真实产品，不拼接模型输出或修改对话文字。旧截图保留供历史链接访问。

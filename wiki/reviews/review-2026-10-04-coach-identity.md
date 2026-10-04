<!-- Last verified: 2026-10-04 | Current stage: B -->

# SocialCoach 教练 IP 接入

## 目标与设计选择

用户提供了带耳机、穿双色外套的黑白小猫海报，希望建立产品的 IP 记忆。沿用已打磨的暖纸与柔和材质，给形象一个固定的教练身份；首次欢迎展开完整形象，首页和复盘用同一只小猫的肖像。

欢迎页移除与教练形象争夺主位的大幅 3D 推广卡，3D 仍可通过文字链接以访客身份直达。排练为唯一主动作，选场景、目标设置继续可用。首页明确写出「SocialCoach 教练」，避免把形象误认为用户头像；复盘助手保留原话证据、来源、输入草稿、停止与追问行为。

## 素材来源与维护

- 来源：本轮用户提供的 SocialCoach 海报 `codex-clipboard-4c668614-7468-4aac-919a-e1debcab430f.png`。
- 使用 imagegen 整理透明背景，保留黑白毛色、绿眼睛、赭橙耳机、左右分色外套和奶油色鞋。没有给角色另取名字或重新定义其身份。
- 最终素材：`app/public/images/coach/socialcoach-cat.webp`，1024 × 1536，159,916 bytes，带 alpha；转换仅做 WebP 编码，未改变构图。响应尺寸由 `next/image` 提供。
- `CoachMascot` 管理完整形象与肖像；肖像用 CSS 裁切同一素材。长宽比预留空间，装饰图不会产生额外焦点或重复的屏幕阅读器播报。
- 完整形象仅在首次欢迎出现，首页与复盘肖像静止。欢迎角色进入为 260ms / 6px；减少动效关闭动画。

## 验证

浏览器检查使用独立会话和受控接口，不调用付费模型。包括欢迎页的中英、浅深主题、360 × 600 / 390 × 844 / 1440 × 900；排练与场景直达、3D 访客入口、完整目标设置、自评保留、减少动效、插图请求失败时仍可开练。复盘继续检查证据优先、来源、草稿、停止、追问、失败重试、导出与无障碍。

复现入口（从 `app/` 运行，设置 `UX_BASE_URL` 为本地服务）：

```sh
pnpm exec tsx scripts/check-coach-identity-browser.ts
pnpm exec tsx scripts/check-debrief-assistant-browser.ts
pnpm exec tsx scripts/check-refined-workspace-browser.ts
pnpm exec tsc --noEmit
pnpm run build
```

共 141 项浏览器检查通过：教练接入 34 项、复盘助手 38 项、工作区 69 项。44 次自动无障碍扫描没有报告违规；类型、修改文件的 lint 与正式构建通过。串行复测前，并行浏览器检查曾受连接中断影响；目标设置的自动化选择器与减少动效模拟参数修正后，完整串行验收通过。检查范围为本地浏览器与生产构建，不包含真实设备实测或模型语义评测。

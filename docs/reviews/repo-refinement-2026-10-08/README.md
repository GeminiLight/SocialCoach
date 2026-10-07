# 全仓修订证据 · 2026-10-08

对应 [审查与修订记录](../../../wiki/reviews/review-2026-10-08-repo-refinement.md)。代码在独立工作区修订，保留主仓库其他会话的预算记录与已合并的慢请求提醒。只有虚构档案/密钥和匿名计数，无平台凭证、真实用户档案或论文材料。

- check.txt / build.txt：lint、类型、42 core + 250 dinner 检查及正式构建通过。
- production-dependency-audit.txt：生产依赖无已知公告；dependency-summary.json：全量仍有 braces 开发工具链公告，没有上游补丁。
- budget-policy-regression.json：独立 Redis 测试命名空间，同样的中央 100 / 旧环境 2，旧实现拒绝并降 cap、新实现预留成功且政策保留。测试后清除仅测试自己的键，没有模型生成。
- central-budget-policy.json：用户最新批准 1 亿，中央政策落地，计数保留，未重置并发。
- draft-conflict.json / png：正式本地构建，旧窗口改草稿/视角不能覆盖设备新值；未保存草稿留在窗口并有下载。
- key-deletion.json / png：实际清除界面后，另一窗口打开模型弹窗，设备键仍 null、密钥框为空。
- backup-recovery.json：坏 3D 原件的健康主档案实际恢复 1 场，保留原件下载，不写坏 3D。
- initial-default-model-probes.json：额度恢复后的正式主站 2D / 3D 真实生成均 200；为新代码发布前的恢复检查，不能当作新投影或长期模型语义验收。
- offline-recovery-page.png：恢复说明页真实渲染；回退逻辑有 VM 行为测试。浏览器断网模拟中 worker/缓存仍可能返回页面，未将其写成真机断网验收。
- site-build.txt / site-seo.txt：12 个双语产品页与 13 个地图目标（含公开论文）通过。

早期浏览器回归受旧构建资源和会话重新启动影响，不作为产品失败；清理并启动正式 standalone 后重复关键流程。桌面 Chromium / 模拟视口不代替真实 iPhone、微信或读屏。

最终代码 main ad7225ba，PR #13 / #14 均合并。release.json 记录两站最终版本；fact-boundary-live-retest.json 与 modelscope-final-probes.json 为新边界发布后的真实请求。原始历史中的未知事实未当作新的安排证据。

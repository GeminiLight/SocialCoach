# 全仓审查证据 · 2026-10-07

源码基线：`a1b10f1e3c75cd3a4fcf4948830af6f30a7efc46`。结论与优先级见 [综合审查](../../../wiki/reviews/review-2026-10-07-whole-repo.md)。本目录只含产品审查、虚构数据与脱敏观察，不含真实 API Key、平台凭证或用户练习记录。

## 现有检查

- [quality-check.txt](./quality-check.txt)：lint、类型、24 core＋249 dinner 测试及现有检查。
- [production-build.txt](./production-build.txt)：应用正式构建通过。
- [site-build.txt](./site-build.txt)、[site-seo.txt](./site-seo.txt)：12 个官网页面、13 个地图目标含公开论文文件，通过。
- [inventory.txt](./inventory.txt)：327 文件清单，非逐行覆盖声明。
- [dependency-summary.json](./dependency-summary.json)：审计元数据、公告 ID、修复范围与依赖路径；10 条记录、5 个包，非十个已可利用入口。

## 函数边界反例

在仓库 `app/` 目录运行：

```bash
pnpm exec tsx ../docs/reviews/whole-repo-2026-10-07/reproduce-algorithm.ts
pnpm exec tsx ../docs/reviews/whole-repo-2026-10-07/reproduce-backup.ts
pnpm exec tsx ../docs/reviews/whole-repo-2026-10-07/reproduce-output.ts
```

- [algorithm-results.jsonl](./algorithm-results.jsonl)：最新续聊被八次窗口排除；保守预留的上界计算。算法 fixture 仅含函数读取字段，不是完整 wire-schema 档案。
- [backup-results.jsonl](./backup-results.jsonl)：健康主档案单独可解析，加入自身导出的损坏 3D 包装后整体失败；[synthetic-archive.json](./synthetic-archive.json) 为虚构练习。
- [output-results.jsonl](./output-results.jsonl)：备注越界仍被接受、控制标记被预览/解析后最终拒绝、完整 completion 地址被 SDK 重复拼接。URL 用假域名与拦截 fetch，无真实模型请求。这些反例不估计模型实际发生率。

## 正式网页和只读线上观察

- [browser-observations.json](./browser-observations.json)：独立 Chromium 会话中，3D 草稿覆盖/关闭后丢失、实际清除界面后的旧密钥复活、表单重选、双语错位及断网刷新；全部为虚构数据。
- [draft-loss.png](./draft-loss.png)：新标签现场页面；草稿输入在截图下缘，准确恢复值以 browser-observations.json 的读回为据。B 已关闭后，A 再切视角，新标签恢复 A 旧草稿。B 仍在内存时刷新有机会由离页保存救回，记录中保留了这一观察。
- [credential-reset.png](./credential-reset.png)：另一标签已实际清除，旧标签仍重新写回关闭状态的虚构密钥。截图不含真实凭证。
- [mixed-language.png](./mixed-language.png)：英文 3D 与中文共享模型窗。
- [offline-reload.png](./offline-reload.png)：已有 SW controller 时，断网刷新进入浏览器错误页；未宣称 README 承诺离线 AI。
- [accessibility-sample.json](./accessibility-sample.json)：一次移动视口抽样，1 minor violation、1 incomplete 类型；不是全站或读屏验收。
- [budget-observation.json](./budget-observation.json)：2026-10-07 21:54 北京时间只读计数，余量 1,535，未修改。
- [health-and-generation.json](./health-and-generation.json)：元数据前后 available，实际生成 429。未取得新的真实 NPC/复盘语义通过证据。

本轮没有改应用代码、测试或配置，未恢复额度、部署或提交 PR。截图来自桌面 Chromium；未代替真实手机验收。

# 2026-10-06 质量修订证据

对应 [本轮复核](../../../wiki/reviews/review-2026-10-06-repo-quality.md)，原始失败见 [上一轮证据](../repo-audit-2026-10-05/README.md)。所有数据为合成，模型/统计请求被拦截，未读取真实练习档案或调用付费模型。

- `quality-check.txt`：免费集中检查，包含 22 个核心反例、既有任务脚本、231 个 3D 测试、lint 与类型。
- `build.txt`：正式构建结果。
- `browser-check.txt` / `browser-probe.ts`：实际 Chromium 配额/重试、备份预览/合并/ID 冲突、两个窗口的写权限交接；截图为 430×932 与 1280×900 视口，不替代真机。
- `reflection-result.jsonl` / `reflection-probe.ts` / `reflection-fixed.png`：改答重试后答案和回复一致。旧错误截图仍保留在上一轮目录。
- `recovery-check.txt` / `recovery/`：原有 14 项网页中断恢复。
- Redis 原子脚本的隔离集成检查：`app/scripts/check-shared-budget-redis.ts`。12 并发请求在限额 2 时只接受 2；应用重启保留总量；更高配置的实例不能抬高本日 token 上限。

复跑：从 `app/` 执行 `pnpm check` 与 `pnpm build`。网页探针需要 `agent-browser` 和 `localhost:3101` 的当前正式构建；构建期间应停止服务器，构建结束后重启再测，避免旧 manifest 指向被替换的资源。

```bash
pnpm start --port 3101
```

在另一终端运行：

```bash
pnpm exec tsx ../docs/reviews/repo-quality-2026-10-06/browser-probe.ts
pnpm exec tsx scripts/check-practice-recovery.ts
```

Redis 检查只用于本轮创建的隔离测试容器，不指向生产数据库。预算 REST/账单与部署配置、真实模型语义/学习效果和真实手机尚未在本轮验证。

# 2026-10-05 全仓评审证据

对应 [评审报告](../../../wiki/reviews/review-2026-10-05-repo-architecture.md)，基线 `d55a2b2`。

这些是边界故障探针，不是产品准确率评估。所有模型返回、转录、档案与存储故障均为合成数据，没有调用真实模型，没有读取用户实际档案或密钥。网页探针使用独立浏览器会话，并拦截模型、健康检查和统计请求。

## 文件

- `contract-probes.ts` / `contract-results.jsonl`：跨场次身份、伪造引文、自定义场景结构、模拟元数据、反思证据、熟练度累加与写入配额。
- `bad-schema-error.txt`：合法 JSON 的坏档案结构进入 hydrate 后的错误堆栈。
- `reflection-probe.ts` / `reflection-result.json` / `reflection-answer-mismatch.png`：正式版页面中编辑后重试，保存答案与回复错配。
- `browser-recovery.txt`：现有中断恢复脚本的 14 项通过记录。

## 复跑

先安装仓库已有依赖，再从 `app/` 运行：

```bash
pnpm exec tsx ../docs/reviews/repo-audit-2026-10-05/contract-probes.ts
```

返回的 `true` / `false` 是当前边界行为，不代表探针“通过”。其中坏结构探针单独启用，预期产生非零退出和错误堆栈；它仅改当前进程内的模拟存储：

```bash
pnpm exec tsx ../docs/reviews/repo-audit-2026-10-05/contract-probes.ts --bad-schema
```

网页探针需要已安装的 `agent-browser` 和在 `http://localhost:3101` 运行的本地正式构建。分别启动服务、运行探针：

```bash
pnpm build
pnpm start --port 3101
```

```bash
pnpm exec tsx ../docs/reviews/repo-audit-2026-10-05/reflection-probe.ts
```

截图默认写到 `/tmp/socialcoach-review-reflection.png`，可用 `REVIEW_SCREENSHOT` 指定位置。浏览器会话在探针结束时关闭。`browser-recovery.txt` 对应 `app/scripts/check-practice-recovery.ts`，需要同一端口的正式服务。

这些探针证明边界可接受错误数据，不能说明真实模型错误的频率、真实设备表现或学习效果。实现修复后应把对应不变量纳入正式回归，保留这里的基线证据。

# 产品质量修订同步（2026-10-06）

用户要求同步其余产品变更，论文材料保留在本地。应用来源 `7eebd89`；后续合入主线的官网 SEO 提交，保留已有产品与公开资料入口。运行代码未因预算接入而放宽保护。

- 已上传 [PR #10](https://github.com/GeminiLight/SocialCoach/pull/10)，包含档案保护／恢复、证据绑定、运行时契约、近期表现估计、双语检索、3D 场景快照、调用限制和自动检查。
- 本地 lint、Next 类型生成、TypeScript、22 项核心测试、既有任务检查、231 项饭局测试与正式构建通过；应用代码与通过检查的快照一致，仅清理了测试尾部空格。GitHub Linux 自动检查及构建 [37359254564](https://github.com/GeminiLight/SocialCoach/actions/runs/37359254564) 已通过。
- 已创建并读回确认 Upstash **Free** 套餐，`autoUpgrade=false`、`prodPack=false`、`eviction=false`。原默认日额度与并发参数保持不变。Vercel production／preview 和 ModelScope 已配置同一预算服务，凭证仅写入平台环境配置，不进入 Git。
- 真实 Redis REST 上使用独立随机命名空间测试，12 并发仅 2 获准，日额度／跨客户端计数／更高实例额度拒绝／释放均通过；测试计数已清理，不占用应用日预算。见 [预算测试](./budget-verification.json) 与 [套餐及配置读回](./budget-resource.json)。这不是供应商金额硬上限的验证。
- ModelScope 构建同步范围扩展为应用源码、公开资源、配置、全部构建检查脚本与测试；保留空间 README、公开性和免费硬件。
- `docs/research/` 与 Marketplace 自动安装的本地代理工具已由 Git 忽略规则排除。修订的网页材料为合成档案；真实模型整体语义、真实手机与学习效果仍按 [修订复核](../../../wiki/reviews/review-2026-10-06-repo-quality.md) 跟踪。

正式合并与平台发布状态将在完成后补充。

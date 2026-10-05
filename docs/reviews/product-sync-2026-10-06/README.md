# 产品质量修订同步（2026-10-06）

用户要求同步其余产品变更，论文材料保留在本地。应用来源 `7eebd89`；后续合入主线的官网 SEO 提交，保留已有产品与公开资料入口。运行代码未因预算接入而放宽保护。

- 已上传 [PR #10](https://github.com/GeminiLight/SocialCoach/pull/10)，包含档案保护／恢复、证据绑定、运行时契约、近期表现估计、双语检索、3D 场景快照、调用限制和自动检查。
- 本地 lint、Next 类型生成、TypeScript、22 项核心测试、既有任务检查、231 项饭局测试与正式构建通过；应用代码与通过检查的快照一致，仅清理了测试尾部空格。GitHub Linux 自动检查及构建 [37359254564](https://github.com/GeminiLight/SocialCoach/actions/runs/37359254564) 已通过。
- 已创建并读回确认 Upstash **Free** 套餐，`autoUpgrade=false`、`prodPack=false`、`eviction=false`。原默认日额度与并发参数保持不变。Vercel production／preview 和 ModelScope 已配置同一预算服务，凭证仅写入平台环境配置，不进入 Git。
- 真实 Redis REST 上使用独立随机命名空间测试，12 并发仅 2 获准，日额度／跨客户端计数／更高实例额度拒绝／释放均通过；测试计数已清理，不占用应用日预算。见 [预算测试](./budget-verification.json) 与 [套餐及配置读回](./budget-resource.json)。这不是供应商金额硬上限的验证。
- ModelScope 构建同步范围扩展为应用源码、公开资源、配置、全部构建检查脚本与测试；保留空间 README、公开性和免费硬件。
- `docs/research/` 与 Marketplace 自动安装的本地代理工具已由 Git 忽略规则排除。修订的网页材料为合成档案；真实模型整体语义、真实手机与学习效果仍按 [修订复核](../../../wiki/reviews/review-2026-10-06-repo-quality.md) 跟踪。

## 正式发布结果

- 主线 `d92e586`，PR #10 已合并；GitHub Linux 检查与构建再次通过，运行 [37360002049](https://github.com/GeminiLight/SocialCoach/actions/runs/37360002049)。
- Vercel 生产 `dpl_7QtdChVwdZXYaNA9knryHzvC1GhG` Ready，`socialcoach-ai.vercel.app` / `socialcoach-app.vercel.app` 已关联到该提交。后续补验正式地址：health 为 `available`，合成提示生成 200，约 5.69s。
- ModelScope `a0a6381`，镜像 `363578-a0a6381c-2026-10-06-03-02-13`；真正 Docker 构建的检查与构建通过，7860 Ready、平台 Running，公开性与原免费硬件保留。371 个同步输入逐项一致，构建脚本与测试均在包内。
- 国内专用认证后端：首页、3D、设置、22 个静态资源全部 200；health 为 `available`、`serverKey=true`、`requireByok=false`。合成文字对练与指定陈总的 3D 回复均 200，分别约 4.42s / 5.11s，格式及当前原文绑定检查通过。见 [线上检查](./ms-smoke.json)、[同步范围](./modelscope-sync.json) 与 [发布元数据](./release.json)。
- 初次发布验收发起 3 次合成生成请求，后续预算启用复核另有 2 次提示请求：第一次验收脚本误用人物标记的占位名，修正断言后完成文字与 3D 检查，没有修改应用或放宽输出契约。没有发送反馈／统计或上传真实练习记录。
- 未重测公共 iframe、真实手机及浏览器整局；上述接口检查不替代这些验收，也不证明模型总体语义或学习效果。

## 共享预算启用复核

两端 production 补齐并核对同一 Redis REST 配置，每个 UTC 日最多 2,000,000 个保守预留 token、并发 8。真实原子限额再次通过；Vercel 正式地址与 ModelScope 专用认证后端均返回实际默认模型提示，分别约 5.69s / 3.65s，详见 [启用记录](./shared-budget-activation.json)。没有发送真实练习档案，临时凭证副本已清理。已发布源码与隔离构建一致，因此保留已验证的正式部署，没有提升重复构建。

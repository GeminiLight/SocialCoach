# 用户反馈 → 飞书

状态：专用飞书应用、收件表、ModelScope 与 Vercel 均已上线，真实提交验收通过；待用户确认给本人添加表格管理权限（2026-09-09）。

## 已确认边界

用户明确同意新增外部反馈收件：零注册，用户主动点击发送后，所填反馈与可选联系方式进入团队飞书多维表格。此例外不适用于练习档案、用户资料或模型凭证；不会自动上传转录、场景描述、URL 查询参数、会话 ID 或设备指纹。IP 仅用于服务器内存限流，不写入飞书或日志。

## 交互

- 普通页面右下方反馈按钮，移动端避开底部导航；对话内放在页头，避免遮住输入框。
- 复盘完成后显示「有帮助 / 帮助不大」，点击后打开同一弹窗，确认发送。
- 五类反馈：故障、角色、点评、建议、其他。前三类提供相关可多选项；描述与联系方式均选填。只选择类型也能提交。
- 描述最多 2000 字符，联系方式最多 160 字符。发送中禁止编辑和重复点击；失败保留内容并重用提交编号，成功明确显示送达。未连接收件端时明确显示不可用。
- 草稿只保留在当前页面内存，关闭弹窗可恢复，刷新/关闭标签页不会持久化。语言沿用已有 `useLang()`；所有新文案用双语对象和 `pick()`。

## 数据流与配置

浏览器 → 本部署 `POST /api/feedback` → 飞书 tenant_access_token → Bitable 新增记录。

环境变量（均不使用 `NEXT_PUBLIC_`）：

- `FEEDBACK_FEISHU_APP_ID` / `FEEDBACK_FEISHU_APP_SECRET`：专用应用凭证，后者进入部署 Secrets。
- `FEEDBACK_FEISHU_BASE_TOKEN` / `FEEDBACK_FEISHU_TABLE_ID`：固定收件表，客户端不能指定目的地。
- `FEEDBACK_DEPLOYMENT`：ModelScope / Vercel / Self-hosted。
- `FEEDBACK_VERSION`：自托管版本标识；Vercel 优先取提交 SHA。

表结构：文本字段 `反馈编号`、`类型`、`问题选项`、`描述`、`联系方式`、`页面`、`语言`、`平台`、`版本`、`帮助程度`；自动创建时间字段 `提交时间`；单选字段 `状态`（待处理 / 处理中 / 已解决）。

应用需具有新增多维表格记录的权限，并获得目标表编辑权限。Vercel 和 ModelScope 共用同一收件表；不配置群发通知。

## 防护与验证

严格 schema 拒绝多余字段；实际请求体最多 16 KB；只接受 JSON；拒绝浏览器跨站请求。应用凭证仅服务端使用；不记录反馈正文、上游响应或密钥。

每 IP 每小时 5 次、每实例每小时 200 次，内存窗口；重启会清空，Vercel 多实例不共享，不能当成全站硬配额。提交 UUID 在本实例复用 Promise，飞书 `client_token` 提供上游幂等；更改正文后生成新编号。

浏览器已核验中英弹窗、分类联动、Esc 关闭后焦点恢复、重新打开保留草稿。首次引导页语言选择改为共享内存状态，使反馈弹窗同步切换；刷新前未保存的选择仍回到浏览器默认。发送按钮固定于弹窗底部，联系方式折叠选填。

验证：`npx tsx scripts/check-feedback.ts`，覆盖未配置、schema/大小/来源拒绝、并发重复、失败重试、错误脱敏、限流；TypeScript、相关 ESLint 和生产构建通过。真实飞书写入、相同 `client_token` 重复写入去重及双部署 API 提交均通过。

来源：[飞书新增记录 API](https://open.feishu.cn/document/server-docs/docs/bitable-v1/app-table-record/create)、[自建应用 tenant_access_token](https://open.feishu.cn/document/server-docs/authentication-management/access-token/tenant_access_token_internal)。

## 上线记录（2026-09-09）

- 专用应用：SocialCoach，`cli_aa2a82cceef8dccd`；使用 bot 身份和 `bitable:app` 权限调用 v1 API。
- 收件表：[SocialCoach 用户反馈](https://my.feishu.cn/base/GacZbXwTyaScAqsP62jcqaZQn1g?table=tbliIN24jTnzw4fj&view=vew2c7rLJu)。`状态` 支持待处理 / 处理中 / 已解决。
- Vercel：`dpl_5X2dSqKvdn7YuKjZ3LEhw1EkTv23` 为当前正式版本（完整功能更新后再次验证配置可用；此前版本真实提交通过），`https://socialcoach-ai.vercel.app/api/feedback` 返回 `available=true`；真实 POST 返回 200，表中平台为 Vercel。health 正常，原模型配置保留。
- ModelScope：空间 Running，反馈配置可用；专用 API host 的真实 POST 返回 200，表中平台为 ModelScope。
- 三条明确标注的上线验收记录保留，状态已置为「已解决」；重复提交未产生重复记录。
- 本地浏览器交互与生产构建已验证；线上最后验收使用 HTTP/API，未重复完成线上浏览器整轮发送。
- 当前表协作者仅专用应用；用户账号管理权限待明确确认。反馈接收已可用，不配置任何群发通知。

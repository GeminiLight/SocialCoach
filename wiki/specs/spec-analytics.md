# 匿名使用统计 → 飞书

状态：已上线 Vercel 生产（PR #6 合并，2026-09-10）。生产 `/api/track` 返回可用；用浏览器在线上跑了一局，4 次 POST 全部 202，运行日志无 `[track]` 错误，即建月表与写入未报错。ModelScope 空间代码已同步（`ceee413`），等 Secrets 里加 `ANALYTICS_FEISHU_TABLE_PREFIX=events` 后生效。

测试那一局来自设备 `5cc1c7e0-b946-4bfe-939b-4d3a0b1fcec9`、会话 `qnassz7oxuoe`，Base 里 `events_2026_09` 表中这四行是测试数据，可删。

## 为什么，以及边界

产品提案里「不做服务端存储」的第二个限定例外。目的只有一个：在第一次推广前知道进来的人去了哪些场景、打了多久、有没有回来。没有它，流量来了等于没来。

- 上传的只有元数据：打开应用、进入了哪个场景、结束方式与时长、报告星数。**不传转录、不传排练描述、不传名字、不传 IP。** 自定义场景只传 `custom`。
- 设备 ID 是浏览器里的随机 UUID（`socialcoach.device`），按域名隔离，「重置数据」时一并清除。
- 设置页「数据」区有开关，默认开；关于页说明了上传的内容。关掉后连已排队的事件也不发。
- 服务端严格 schema，多一个字段就整批拒收；日志只记短错误码，不记请求体和飞书回包。
- 用户端只和本部署通信，跨境的是服务器到飞书那一跳。国内部署数据留境内；海外部署的匿名事件进入国内飞书，关于页已写明。

## 事件

四个事件，`app_open` 每台设备每个本地日只发一条，表里天然是「设备 × 日」。

| 事件 | 时机 | 字段 |
|---|---|---|
| `app_open` | 有档案后的每日首次打开 | — |
| `session_start` | 简报页「进入对话」 | session, scenario, origin, context, difficulty, timed |
| `session_end` | 场景结束（`ended_by`: engine / cap / silence / user） | session, scenario, outcome, turns, silences, duration_s, ended_by |
| `debrief_view` | 复盘报告生成 | session, scenario, stars, outcome |

没有 `session_abandon`：`session_start` 与 `session_end` 的差就是放弃数。

## 数据流

```
浏览器 track() 内存队列 ──(2.5s 或页面隐藏时 sendBeacon)──▶ POST /api/track ──after()──▶ 飞书 batch_create
                                                          ▲
                                          首次发送前 GET /api/track 询问是否已配置
```

- 客户端：`src/lib/analytics/track.ts`。每批最多 20 条，`id` 是幂等键；未配置的部署一次 POST 都不会发。
- 服务端：`src/app/api/track/route.ts`。同源检查、16 KB 上限、每 IP 每小时 240 次、全站 20000 次；写入放在 `after()` 里，响应 202 不等飞书。
- 落点：`src/lib/analytics/feishu.ts`。**按月建表** `<prefix>_YYYY_MM`，缺表时服务端自动创建（需要 `bitable:app` 权限）。多维表格单表上限 20,000 行（错误码 1254103），一天一百局两个月就满，所以不用单表。设 `ANALYTICS_FEISHU_TABLE_ID` 可钉死一张表并关闭轮换，上限自己盯。
- 飞书客户端抽到 `src/lib/feishu.ts`，反馈功能改为复用；`FEISHU_BASE_URL` 只用于测试指向 mock。

表字段（与反馈表同风格的中文列名）：事件、时间（日期）、设备、会话、场景、来源、情境、难度、限时（复选框）、结果、回合、沉默、时长秒、星数、结束方式、语言、平台、版本。单选列传入新值会自动建选项。

## 看板

- 场景分布、每日局数、平均时长、结束方式：飞书仪表盘直接按字段分组画。
- 留存：`npx tsx scripts/retention.ts [--days 30] [--tz Asia/Shanghai] [--csv]`，按设备首见日分队列，输出 T+1、T+7 访问复访和 7 日内再练比例。需要 Base 的读权限。

现在只看两个数：`session_start` 的日计数，和 7 日内再练比例。

## 换落点

事件 schema 与落点分离，飞书是第一个适配器。量到每天几百局时，把各月表导出 CSV 灌进 Postgres，`deliverEvents` 换实现，客户端一行不改。Postgres 的成本在 backlog 里记着。

## 验证

- `npx tsx scripts/check-track.ts`：未配置时 GET 报不可用、POST 204 丢弃；严格 schema 拒绝多余字段、非法场景 id、超过 20 条、跨站、超大；首次写入自动建月表，同月复用缓存，跨月各写各表；`client_token` 等于批次 id；飞书失败不影响 202；钉死表跳过发现；每 IP 限流。
- `npx tsx scripts/check-feedback.ts` 在飞书客户端抽出后仍通过。
- 端到端：本机起 mock 飞书（`FEISHU_BASE_URL`）加生产构建，浏览器跑一局，mock 收到建表与四类事件的记录。
- 生产：Vercel 运行日志只有 `λ POST /api/track` 的 info 行，没有 `[track]` 错误行；写入在 `after()` 里完成，失败会以短错误码落日志，所以「无错误行」是建表与写入成功的证据，但没有从 Base 读回核对。
- 未验证：`scripts/retention.ts` 用到的 `search` 接口过滤语法以真实调用为准；ModelScope ���在 Secret 配好后再跑一局核对。

<!-- Last verified: 2026-10-03 | Current stage: B -->

# SocialCoach 3D 接入验收

将独立原型 `SocialCoach-3D@60cd20a` 导入主站 Next.js，保留原仓库。源码位置 `app/src/features/dinner`；路由 `/3d`；不依赖原型的开发服务器。

## 已验证

- 68 项 3D 交互 / 语音生命周期 / 导演任务测试通过，包含未知人物、重复演员、非法历史、未来事件、完整反应、取消及模型失败不替代。
- 主站档案恢复、19 项练习策略、23 项复盘助手检查通过。变更源码与测试 ESLint、生产 TypeScript 和正式构建通过。
- 本地开发及实际 standalone 生产服务中，欢迎页 / 首页 / 桌面导航可进入 3D；首次公告主动作固定可见，关闭或进入后不重复。
- 实际模型返回该桌三名人物的反应和有效台词；用户回复不会自动触发教练评分或结束。本轮样本为测试者生成的虚构回复，不是用户转录。
- 390×844 手机视窗检查：首页卡片与五个导航、3D 返回按钮、输入、视角与移动控制。草稿、第三人称、站立位置、对话回合刷新后恢复；返回主站保留本局。
- 原型颜色在 Next 优化后变成 Lab 的兼容问题已修正，正式构建中材质与皮肤恢复；HUD 动态高度变量的前缀同步后，手机移动控件不覆盖顶部导航。
- 截图见 `docs/reviews/3d-integration-2026-10-03/`，均为合成测试档案。正常练习页不加载 WebGL 场景入口代码。

## 验证范围

当前人物仍是程序建模，真实麦克风、真实手机与全部模型输出未穷举。模型动作旁白加了仅描述可呈现动作的限制，不能将提示词当成所有输出均符合的保证。不同域名 / 端口的原型存档不会自动迁移；原存档仍保留。

## 发布

- 主仓库 `main`：功能提交 `8791f44ef0a227163b3a7aec926f6fc9e04319a8` 已推送。独立 `SocialCoach-3D@60cd20a` 仓库及本地原型保留。
- Vercel：生产部署 `dpl_8fiTijQ7VLWweUYKmiNyKJX8b6Mt` 状态 `READY`，对应上述功能提交；生产别名包含 `socialcoach-ai.vercel.app`。入口：[SocialCoach 3D](https://socialcoach-ai.vercel.app/3d)。
- ModelScope：同步提交 `70ce67e` 已推送到既有 Studio，部署状态与 runtime 均为 `Running`；构建日志确认 `/3d` 与 `/api/dinner/direct`，运行日志确认 `Ready`。继续使用原免费 Docker 硬件与模型配置。入口：[国内主站](https://modelscope.cn/studios/GeminiLight/SocialCoach?mode=full)。
- 正式构建实际场景截图：`docs/reviews/3d-integration-2026-10-03/production-scene.png`。本地 standalone 的主站入口和 3D 页面验收完成。
- 线上浏览器访问 Vercel 多次超时；当前网络直接请求 ModelScope 应用域名出现 TLS EOF。未据此修改证书、代理或平台配置；线上状态由平台发布结果与构建 / 运行日志确认，线上浏览器交互仍待可访问网络复核。

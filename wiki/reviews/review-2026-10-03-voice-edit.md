# 浏览器语音草稿编辑验收（2026-10-03）

## 问题与修复

用户报告 3D 饭局使用浏览器语音后，输入框不能编辑。正式构建中复现：确认或中间识别回调到来时，textarea 的 disabled 为 false、readOnly 为 true。代码在所有非 idle 阶段显式设只读，避免不可变 base 的识别回调与修改冲突，却让开始收音、收音、结束等待期间都无法改字。

修复后的交互：点麦克风开始；随时点输入框即停止收音并保留眼前识别出的文字，包括可见半句；手动改字后再点麦克风接着补充。发送仍由用户确认，3D 收音不自动提交。状态和玩法说明均使用中英双语。

`SpeechSession.edit()` 先撤销 recognition 所有权、清理处理器 / 计时器，再把确认草稿与中间片段合并写入。已经排队的旧 result / end / error 仍经过 generation 检查。显式 stop 保留浏览器最终识别优先；没有最终片段而结束 / 4 秒超时时保留可见文字。取消 / 网络错误 / 自然空结束的既有行为保留，不能把所有异常都当成确认半句。

浏览器 API 的边界参考：[MDN stop](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/stop)（结束收音并尝试返回结果）、[MDN abort](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/abort)（取消识别）。停止并不保证一定有最终片段。

## 相邻问题

普通 `Chat` 的输入框原本可改，但 rec.onresult 会用旧 base 覆盖新输入。现聚焦 / 改字 / 发送 / 结束 / 卸载先撤销所有权，迟到回调不得写入；首次语音提示关闭后的自动聚焦也避开正在收音的会话，避免刚开始又被自动结束。

手机响应式截图另发现窗口缩窄时输入框保持桌面的单行高度。已有自动高度现在也观察宽度变化；只响应宽度改变，避免自己的高度触发循环，沿用 52–112px 上限和内部滚动。本地夹具把实际输入区域收窄后，DOM 测得 505×52 → 163×77，scrollHeight 同为 77；恢复宽度后回到 505×52。

## 验证

- 原代码下：9 项既有语音检查通过，4 组新增回归失败；浏览器读取确认只读属性。修复后语音 13 项、饭局全部 110 项通过。
- 修改文件的 ESLint 通过，Next.js 生产构建和 TypeScript 检查通过。
- 在本地生产构建中使用 `scripts/serve-speech-fixture.mjs` 代理注入模拟 SpeechRecognition；仅监听本机，不调用麦克风或添加线上测试路由。

| 路径 | 实际验证 | 结果 |
|---|---|---|
| 3D 中文 | 确认句 + 中间半句，点输入框保留并停止 | 可编辑，abort 一次，发送仍需手动 |
| 3D 中文 | 改字后主动触发旧 result / end / network error | 草稿保留，无错误提示覆盖 |
| 3D 中文 | 等待开始时编辑，再触发迟到 start | 草稿保留，识别不恢复 |
| 3D 中文 | stop 等待时编辑，再触发迟到结果 | 立即可改，半句保留 |
| 3D 英文 / 手机 | stop 后只有 end，没有 final | `Thanks, I will have tea.` 保留，空格正确，回合仍 00 |
| 3D / 普通练习 | 修改后重新收音 | 接当前草稿追加，没有重置或重复原话 |
| 3D / 普通练习 | 刷新页面 | 编辑后的草稿恢复，没有新增用户回合 |
| 普通练习 | 首次语音说明确认后收音；改字后迟到三类回调 | 首次识别不中断，修改不被覆盖 |
| 桌面 → 窄输入区 | 夹具收窄实际输入区域，另记录 390×844 响应式截图 | 输入高度 52 → 77 → 52，正文和操作可见 |

截图在 [验收目录](../../docs/reviews/3d-voice-edit-2026-10-03/)：`before-readonly.png`、`after-handoff-zh.png`、`after-manual-late-zh.png`、`after-stopping-edit-zh.png`、`mobile-stop-without-final-en.png`、`practice-edit-late-zh.png`、`narrow-draft-width-zh.png`、`voice-edit-desktop-zh.png`、`voice-edit-mobile-zh.png`。最后两张隐藏测试工具，展示实际产品草稿与状态；手机截图先由夹具按手机宽度初始化输入区域高度，不等同于真人手机键盘测试。

## 边界与维护

本轮验证了生产构建中的交互与识别回调时序，未使用真人麦克风或真实手机键盘；不能据此保证所有浏览器的在线识别服务都可用。真实麦克风 / 手机验证继续保留在 backlog。没有 API、模型、存档格式或色板变更；独立 3D 演示仓库不做平行适配。

Skill evolution: no update needed。原因：现有 fix-bug 流程已经要求复现、异步边界、相邻扫描和原症状回归；本次具体语音所有权和高度教训收进本仓库，未修改全局 skill。

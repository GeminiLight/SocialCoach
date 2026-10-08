# PR 审核原件 · 2026-10-08

来源 #19/#21/#22，基线 main 71ab558。所有页面数据为本次生成的合成档案；无模型调用或真实 OS 分享。主站与国内发布健康检查另行记录。

- share-*：分享旧例与修订后的状态；空文本由原生 textarea setter + input 事件输入，因为浏览器驱动空字符串填充未触发有效编辑。
- home-*：乱序恢复后的真实首页前后与设备顺序。
- history-before.txt：旧实现三项失败；新实现四项通过。
- fixture-type-cache-failure.txt：删除临时路由后遗留 dev 类型的首轮失败；随后清理生成物再跑。
- check.txt / build.txt / site-build.txt：64 core + 254 dinner、正式构建和 12 页 / 13 地图目标检查。
- production-* / modelscope-release.json / release.json：实际发布身份、线上首页和分享；共享日池当时只余 6,442，生成仍被门控。

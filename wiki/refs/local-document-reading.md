<!-- Last verified: 2026-10-05 | Current stage: B -->

# 排练附件的本地读取

本实现只提取用户自己核对的练习背景，不接收原文件上传。见 [反馈修订](../specs/spec-feedback-refinement.md)。源码：`app/src/lib/local-attachment.ts`、`RehearsalContext.tsx`、`scripts/prepare-local-reading.mjs`。

| 输入 | 实际实现 | 限制 |
|---|---|---|
| TXT/Markdown | UTF-8 严格解码，文本作为资料而非指令 | 非 UTF-8、NUL 二进制拒绝 |
| DOCX | fflate 0.8.3；先查中央目录，再只解出 word/document.xml；浏览器 DOMParser 提取段落 | 加密/ZIP64/异常目录拒绝，≤1000 条、声明展开总量≤12MB |
| PDF | pdfjs-dist 6.4.299，逐页提取文本，本地 worker/CMap | ≤20 页；无文本扫描件提示改截图，不假装已 OCR |
| PNG/JPEG/WebP | Tesseract.js 7.0.0，简体中文+英文 LSTM，本地 worker/core/语言数据 | ≤2400万像素；可取消、90秒时限，识别误差需编辑核对 |

每份原文件≤8MB；合并后的确认描述≤8000字符，不自动截断。OCR 初始化中取消后，晚完成的 worker 会被清理，结果不得回填。文件预览 URL 关闭时释放。提取中/失败/取消均不覆盖原草稿，文件名不进入最终描述。应用不替用户判断隐私：文字预览要求删除不想发送的姓名/联系方式等内容，确认后才走当前模型。

静态运行资源由 predev/prebuild 从锁定依赖复制到 public/local-reading，构建生成物不进 Git；只在使用附件时请求。不依赖外部 OCR 服务或 CDN。PDF 的 CMaps、PDF/Tesseract/core 许可、worker 第三方 notices 与语言数据说明同包分发，并在 manifest 中记录散列。不能将依赖的免安装浏览器运行解释成零下载或零计算成本。

上游原始实现与许可：[PDF.js](https://github.com/mozilla/pdf.js)、[Tesseract.js](https://github.com/naptha/tesseract.js)、[Tesseract.js core](https://github.com/naptha/tesseract.js-core)、[fflate](https://github.com/101arrowz/fflate)。实际已安装版本与许可按 pnpm-lock.yaml 和构建复制的 LICENSE/NOTICE 核验。Web Share 的设备目标与能力另见 [Navigator.share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share) 和 [Navigator.canShare](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/canShare)，不保证微信/小红书在菜单中出现。

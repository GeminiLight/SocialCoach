# DeepSeek API 配置依据

核对日期：2026-10-09。来源为 [官方接入说明](https://api-docs.deepseek.com/quick_start/pricing-details-cny/) 与 [Chat Completions 参数](https://api-docs.deepseek.com/api/create-chat-completion/)。

- OpenAI 兼容地址：`https://api.deepseek.com`；当前 Flash 模型名：`deepseek-flash`。
- `thinking.type` 支持 `enabled` / `disabled`，默认启用；`reasoning_effort` 也表达推理强度或关闭意图。应用显式关闭推理时只发送关闭配置，不同时附带强度。
- `max_tokens` 限制生成长度；有限额度的内部 JSON 校验可能没有剩余正文。SocialCoach 用 `extractJSON()` 校验结构并核对原话，不依赖提供商格式保证。
- 对话模型与 NPC 语音模型分别配置；DeepSeek 不替代现有 MiMo 语音网关。

DeepSeek 主站实测已确认模型列表、认证和实际 JSON 生成；发布验收另记录文字、3D 与复盘。密钥不保存在该文档或仓库。

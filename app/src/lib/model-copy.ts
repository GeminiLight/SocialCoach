import type { Lang } from "@/data/taxonomy";
import { pick } from "@/lib/i18n";
import type { ModelIssue } from "./model-status";

export const M = {
  showKey: { zh: "显示密钥", en: "Show key" },
  hideKey: { zh: "隐藏密钥", en: "Hide key" },
  saveFailed:{zh:'配置没有保存。设备存储不可用，或另一窗口已修改配置；请关闭后重新打开并确认。',en:'Settings were not saved. Device storage is unavailable or another window changed them. Close and reopen to confirm.'},
  invalidAddress: { zh: "请填写完整的 http:// 或 https:// 地址。", en: "Enter a complete http:// or https:// address." },
  tokenParam: { zh: "Token 参数", en: "Token parameter" },
  disableThinking: { zh: "短对话关闭额外推理", en: "Disable extra reasoning for short replies" },
  disableThinkingHint: { zh: "仅用于支持关闭推理的兼容服务。服务不支持时请关闭此选项。", en: "Only for compatible services that support disabling reasoning. Leave off if unsupported." },
  title: { zh: "接入模型", en: "Connect a model" },
  intro: { zh: "填入你的 API Key，选择适合自己的模型。新设置用于之后的请求。", en: "Add your API key and choose a model that suits you. New settings apply to subsequent requests." },
  slow: { zh: "等待有点久。自己的模型服务可能更快。", en: "This is taking a little longer. Your own model service may respond faster." },
  slowConnect: { zh: "接入自己的模型", en: "Connect your own model" },
  sharedUnavailableIntro: { zh: "默认模型暂时不可用。你可以填入自己的 API Key，继续练习。", en: "The default model is unavailable. Add your own API key to continue practicing." },
  checking: { zh: "正在检查模型连接…", en: "Checking the model connection…" },
  setup: { zh: "练习需要连接一个模型。", en: "Connect a model to start practicing." },
  credentials: { zh: "模型密钥已失效，请更新或换用自己的密钥。", en: "The model key is invalid. Update it or connect your own." },
  quota: { zh: "当前模型的额度已用完。补充额度或换用自己的密钥后，即可继续。", en: "The model’s credit has run out. Add credit or connect your own key to continue." },
  shared_quota:{zh:'这次任务所需额度超出了今天的共享池余量。共享池每天北京时间 08:00 更新，也可以接入自己的模型。',en:'This task exceeds the remaining shared daily budget. It renews at 00:00 UTC; you can also connect your own model.'},
  shared_busy:{zh:'共享模型的并发请求已满。稍等片刻再试，或接入自己的模型。',en:'All shared model slots are busy. Retry shortly or connect your own model.'},
  renewsAt:{zh:'下次共享日额度更新：{time}。',en:'Shared daily budget renews: {time}.'},
  model: { zh: "模型配置不可用，请检查模型名称和连接设置。", en: "The model configuration is unavailable. Check its name and connection settings." },
  rate_limit: { zh: "请求有些频繁，稍等片刻再试。也可以接入自己的模型。", en: "Too many requests. Wait a moment and retry, or connect your own model." },
  service: { zh: "模型服务暂时不可用。可以稍后重试，或接入自己的模型。", en: "The model service is temporarily unavailable. Retry later or connect your own model." },
  network: { zh: "暂时连不上模型，请检查网络后重试。", en: "Cannot reach the model. Check your connection and retry." },
  browse: { zh: "场景、知识和已有记录仍可查看。", en: "You can still browse scenarios, lessons and saved practice." },
  retry: { zh: "重新检查", en: "Check again" },
  disabled: { zh: "接入可用的模型后继续", en: "Connect an available model to continue" },
  provider: { zh: "接口类型", en: "API format" },
  website: { zh: "获取 API Key ↗", en: "Get an API key ↗" },
  name: { zh: "模型名称", en: "Model name" },
  clearName: { zh: "清空模型名称", en: "Clear model name" },
  nameHint: { zh: "可直接输入或粘贴服务商支持的模型 ID；示例不是固定选项。", en: "Type or paste a model ID supported by your provider. The example is not a fixed choice." },
  advanced: { zh: "其他设置", en: "More settings" },
  endpoint: { zh: "基础 API 地址", en: "Base API URL" },
  endpointHint: { zh: "DeepSeek 等 OpenAI 兼容服务需填写自己的地址，例如 https://api.deepseek.com；原厂 OpenAI / Anthropic 可留空。", en: "For OpenAI-compatible services such as DeepSeek, enter their base URL, e.g. https://api.deepseek.com. Leave blank for native OpenAI / Anthropic." },
  normalizedAddress:{zh:"将使用基础地址：{url}",en:"Base address to use: {url}"},
  reportModel: { zh: "复盘模型（可选）", en: "Review model (optional)" },
  sameModel: { zh: "默认使用上面的模型", en: "Uses the model above by default" },
  connect: { zh: "检查并保存", en: "Check and save" },
  free: { zh: "检查只读取模型信息，不生成内容。", en: "The check only reads model information; it generates no content." },
  privacy: { zh: "密钥仅保存在此设备，直接发送给服务商。", en: "Your key stays on this device and goes directly to the provider." },
  unverified: { zh: "该服务不支持连接检查，暂时无法确认是否可用。你可以保存，在下次练习时确认。", en: "This service cannot be verified through a metadata check. Save it and try it during your next practice." },
  saveAnyway: { zh: "保存并在练习中尝试", en: "Save and try in practice" },
  shared: { zh: "使用默认模型", en: "Use the default model" },
  pending: { zh: "接入模型后继续", en: "Continue after connecting a model" },
  connected: { zh: "已连接", en: "Connected" },
  unknown: { zh: "尚未确认", en: "Not yet verified" },
};
export const modelMessage = (issue: ModelIssue, lang: Lang,resetAt?:number) => {
  const message=pick(M[issue],lang);
  if(issue!=='shared_quota'||!resetAt||!Number.isFinite(resetAt))return message;
  const time=new Intl.DateTimeFormat(lang==='zh'?'zh-CN':'en',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'short'}).format(resetAt);
  return `${message} ${pick(M.renewsAt,lang).replace('{time}',time)}`;
};

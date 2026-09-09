import type { Feedback } from "./schema";

const base = "https://open.feishu.cn/open-apis";
let credential: { token: string; until: number } | undefined;
let pendingToken: Promise<string> | undefined;
export const feedbackConfigured = () => !!(process.env.FEEDBACK_FEISHU_APP_ID && process.env.FEEDBACK_FEISHU_APP_SECRET && process.env.FEEDBACK_FEISHU_BASE_TOKEN && process.env.FEEDBACK_FEISHU_TABLE_ID);

async function getToken(): Promise<string> {
  if (credential && Date.now() < credential.until) return credential.token;
  if (pendingToken) return pendingToken;
  pendingToken = (async () => {
    const r = await fetch(`${base}/auth/v3/tenant_access_token/internal`, {
      method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
      body: JSON.stringify({ app_id: process.env.FEEDBACK_FEISHU_APP_ID, app_secret: process.env.FEEDBACK_FEISHU_APP_SECRET }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await r.json();
    if (!r.ok || data.code !== 0 || typeof data.tenant_access_token !== "string") throw new Error("feedback_auth_failed");
    credential = { token: data.tenant_access_token, until: Date.now() + Math.max(0, Number(data.expire || 0) - 120) * 1000 };
    return credential.token;
  })();
  try { return await pendingToken; } finally { pendingToken = undefined; }
}

const categoryNames = { bug: "遇到故障", character: "角色不真实", assessment: "点评不准确", idea: "功能建议", other: "其他" };
const tagNames = { slow: "响应慢", error: "报错或卡住", mobile: "手机显示异常", too_easy: "太容易让步", out_of_role: "跳出角色", missed_context: "没理解情境", wrong_quote: "引用不准确", unclear: "建议不清楚", other: "其他问题" };

export async function deliverFeedback(input: Feedback) {
  const token = await getToken();
  const app = encodeURIComponent(process.env.FEEDBACK_FEISHU_BASE_TOKEN!);
  const table = encodeURIComponent(process.env.FEEDBACK_FEISHU_TABLE_ID!);
  const fields = {
    "反馈编号": input.id,
    "类型": categoryNames[input.category],
    "问题选项": input.tags.map(t => tagNames[t]).join("、"),
    "描述": input.detail,
    "联系方式": input.contact,
    "页面": input.page,
    "语言": input.lang,
    "平台": process.env.FEEDBACK_DEPLOYMENT || (process.env.VERCEL ? "Vercel" : "Self-hosted"),
    "版本": process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || process.env.FEEDBACK_VERSION || "0.1.0",
    "帮助程度": input.rating === "helpful" ? "有帮助" : input.rating === "unhelpful" ? "帮助不大" : "未评价",
    "状态": "待处理",
  };
  const r = await fetch(`${base}/bitable/v1/apps/${app}/tables/${table}/records?client_token=${encodeURIComponent(input.id)}`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    cache: "no-store", body: JSON.stringify({ fields }), signal: AbortSignal.timeout(10000),
  });
  const data = await r.json();
  if (!r.ok || data.code !== 0 || !data.data?.record?.record_id) {
    if (data.code === 99991663 || data.code === 99991668) credential = undefined;
    // Never log user input, upstream bodies, or credentials.
    throw new Error("feedback_delivery_failed");
  }
}

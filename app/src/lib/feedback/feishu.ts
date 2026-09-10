import type { Feedback } from "./schema";
import { buildVersion, deploymentName, dropToken, feishuAppConfigured, feishuBase, tenantToken } from "@/lib/feishu";

export const feedbackConfigured = () => feishuAppConfigured() && !!process.env.FEEDBACK_FEISHU_TABLE_ID;

const categoryNames = { bug: "遇到故障", character: "角色不真实", assessment: "点评不准确", idea: "功能建议", other: "其他" };
const tagNames = { slow: "响应慢", error: "报错或卡住", mobile: "手机显示异常", too_easy: "太容易让步", out_of_role: "跳出角色", missed_context: "没理解情境", wrong_quote: "引用不准确", unclear: "建议不清楚", other: "其他问题" };

export async function deliverFeedback(input: Feedback) {
  const token = await tenantToken();
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
    "平台": deploymentName(),
    "版本": buildVersion(),
    "帮助程度": input.rating === "helpful" ? "有帮助" : input.rating === "unhelpful" ? "帮助不大" : "未评价",
    "状态": "待处理",
  };
  const r = await fetch(`${feishuBase()}/bitable/v1/apps/${app}/tables/${table}/records?client_token=${encodeURIComponent(input.id)}`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    cache: "no-store", body: JSON.stringify({ fields }), signal: AbortSignal.timeout(10000),
  });
  const data = await r.json();
  if (!r.ok || data.code !== 0 || !data.data?.record?.record_id) {
    if (data.code === 99991663 || data.code === 99991668) dropToken();
    // Never log user input, upstream bodies, or credentials.
    throw new Error("feedback_delivery_failed");
  }
}

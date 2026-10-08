/** Safe, portable status codes. Never contain an endpoint, key or provider payload. */
export type ModelIssue = "setup" | "credentials" | "quota" | "shared_quota" | "shared_busy" | "model" | "rate_limit" | "service" | "network";
export type ModelCheck = {
  state: "available" | "unverified" | "unavailable";
  issue?: ModelIssue;
  resetAt?: number;
  budgetRemaining?: number;
  budgetLimit?:number;
};

const issues: ModelIssue[] = ["setup", "credentials", "quota", "shared_quota", "shared_busy", "model", "rate_limit", "service", "network"];
export const isModelIssue = (v: unknown): v is ModelIssue => issues.includes(v as ModelIssue);

/** Provider codes beat prose; an ordinary 429 is not evidence of an empty balance. */
export function modelIssue(error: unknown): ModelIssue | undefined {
  if (!error || typeof error !== "object") return;
  const e = error as { status?: number; message?: string; modelIssue?: unknown; error?: { code?: string; type?: string; message?: string }; code?: string };
  if (isModelIssue(e.modelIssue)) return e.modelIssue;
  if (e.modelIssue === null) return; // Explicit task error from the current API.
  const code = `${e.error?.code ?? e.code ?? ""} ${e.error?.type ?? ""}`;
  const message = `${e.error?.message ?? ""} ${e.message ?? ""}`;
  if (/insufficient_quota|credit_balance|billing|quota_exceeded/i.test(code) || /insufficient.{0,20}(credit|balance|quota)|credit balance|balance.{0,12}(empty|exhausted)|quota.{0,12}(exhausted|exceeded)|余额不足|额度用完|共享额度用完/i.test(message)) return "quota";
  if (e.status === 401 || e.status === 403 || /invalid_api_key|authentication_error/i.test(code) || /invalid.{0,12}(credential|api.?key)|凭据无效|密钥.{0,8}(失效|无效)/i.test(message)) return "credentials";
  if (e.status === 402) return "quota";
  if (/model_not_found|invalid_model/i.test(code) || /model.{0,30}(not found|does not exist)|找不到模型/i.test(message)) return "model";
  if (e.status === 429) return "rate_limit";
  // A malformed model answer is a task failure, not a broken connection.
  if (/JSON|parse|schema|quotation|引用|引文|garbled|unexpectedly/i.test(message)) return;
  if (e.status === 404) return "model";
  if (e.status === 0 || /APIConnection|Timeout/.test((error as Error).constructor?.name ?? "")) return "network";
  if ((error as Error).constructor?.name === "LLMError") return;
  if (e.status && e.status >= 500) return "service";
}

export interface ModelMetadata {
  list(): Promise<{ ids: string[]; more?: boolean }>;
  retrieve(id: string): Promise<unknown>;
}

/** Only authenticated GETs. Never falls back to a message/completion request. */
export async function checkModelConnection(metadata: ModelMetadata, models: string[]): Promise<ModelCheck> {
  try {
    const list = await metadata.list();
    let unverified = false;
    for (const id of [...new Set(models.filter(Boolean))]) {
      if (list.ids.includes(id)) continue;
      try {
        await metadata.retrieve(id); // Also resolves official model aliases.
      } catch (error) {
        const issue = modelIssue(error);
        // Many compatible gateways list models but omit the retrieve endpoint.
        // Its 404 is inconclusive unless the provider explicitly names a model error.
        if (issue === "credentials" || issue === "quota" || issue === "rate_limit") return { state: "unavailable", issue };
        const detail = error as { error?: { code?: string; type?: string; message?: string }; message?: string };
        if (issue === "model" && /model_not_found|invalid_model|model.{0,30}(not found|does not exist)/i.test(`${detail.error?.code ?? ""} ${detail.error?.type ?? ""} ${detail.error?.message ?? ""} ${detail.message ?? ""}`)) return { state: "unavailable", issue };
        // An inconclusive fast model must not hide a confirmed smart-model failure.
        unverified = true;
      }
    }
    return { state: unverified ? "unverified" : "available" };
  } catch (error) {
    const issue = modelIssue(error);
    if (issue === "credentials" || issue === "quota" || issue === "rate_limit") return { state: "unavailable", issue };
    // CORS, timeouts and unsupported metadata routes do not prove chat is broken.
    return { state: "unverified" };
  }
}

export function readModelFailure(raw: string): { error: string; status: number; modelIssue?: ModelIssue | null; retryAt?:number } {
  try {
    const value = JSON.parse(raw);
    if (typeof value.error === "string") return {
      error: value.error,
      status: typeof value.status === "number" ? value.status : 200,
      ...(isModelIssue(value.modelIssue) || value.modelIssue === null ? { modelIssue: value.modelIssue } : {}),
      ...(typeof value.retryAt==='number'&&Number.isFinite(value.retryAt)?{retryAt:value.retryAt}:{}),
    };
  } catch {}
  return { error: raw, status: 200, modelIssue: modelIssue({ message: raw }) };
}

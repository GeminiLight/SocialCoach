/**
 * The one Feishu client for this server: tenant token, cached and refreshed,
 * and a fetch that turns the platform's `{code, msg}` envelope into thrown
 * errors. Feedback and usage analytics both write to the same Base with the
 * same self-built app, so the credentials are shared and named after the
 * feature that introduced them.
 *
 * Nothing user-supplied is ever logged here, and neither are upstream bodies:
 * a failed write is reported as a short code, not as what Feishu said.
 */
const DEFAULT_BASE = "https://open.feishu.cn/open-apis";
export const feishuBase = () => process.env.FEISHU_BASE_URL?.replace(/\/$/, "") || DEFAULT_BASE;

export const feishuAppConfigured = () => !!(process.env.FEEDBACK_FEISHU_APP_ID && process.env.FEEDBACK_FEISHU_APP_SECRET && process.env.FEEDBACK_FEISHU_BASE_TOKEN);
export const feishuBaseToken = () => process.env.FEEDBACK_FEISHU_BASE_TOKEN!;

let credential: { token: string; until: number } | undefined;
let pendingToken: Promise<string> | undefined;

export async function tenantToken(): Promise<string> {
  if (credential && Date.now() < credential.until) return credential.token;
  if (pendingToken) return pendingToken;
  pendingToken = (async () => {
    const r = await fetch(`${feishuBase()}/auth/v3/tenant_access_token/internal`, {
      method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
      body: JSON.stringify({ app_id: process.env.FEEDBACK_FEISHU_APP_ID, app_secret: process.env.FEEDBACK_FEISHU_APP_SECRET }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await r.json();
    if (!r.ok || data.code !== 0 || typeof data.tenant_access_token !== "string") throw new Error("feishu_auth_failed");
    credential = { token: data.tenant_access_token, until: Date.now() + Math.max(0, Number(data.expire || 0) - 120) * 1000 };
    return credential.token;
  })();
  try { return await pendingToken; } finally { pendingToken = undefined; }
}

/** Forget the cached token — Feishu said it is no longer valid. */
export const dropToken = () => { credential = undefined; };

export class FeishuError extends Error {
  constructor(public readonly where: string, public readonly code: number | undefined) {
    super(`${where}_failed`);
  }
}

/**
 * Call an Open API path under the Base and return `data`. Throws `FeishuError`
 * on HTTP or platform errors; an invalid-token code also drops the cached
 * token so the next call re-authenticates.
 */
export async function feishuCall<T = Record<string, unknown>>(where: string, path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const token = await tenantToken();
  const { timeoutMs = 10000, ...rest } = init;
  const r = await fetch(`${feishuBase()}${path}`, {
    ...rest,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(rest.headers ?? {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = (await r.json().catch(() => ({}))) as { code?: number; data?: T };
  if (!r.ok || data.code !== 0) {
    if (data.code === 99991663 || data.code === 99991668) dropToken();
    throw new FeishuError(where, data.code);
  }
  return (data.data ?? {}) as T;
}

/** Which deployment wrote a row, and which build. Shared by feedback and analytics. */
export const deploymentName = () => process.env.FEEDBACK_DEPLOYMENT || (process.env.VERCEL ? "Vercel" : "Self-hosted");
export const buildVersion = () => process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || process.env.FEEDBACK_VERSION || "0.1.0";

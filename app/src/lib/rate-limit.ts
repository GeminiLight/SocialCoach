import { LLMError } from "./llm-core";

/** Per-process request throttling for fairness, never a cross-instance or
 * monetary guarantee. shared-budget reserves each actual model call atomically;
 * deployments should also set a hard monetary ceiling at their provider. */

const HOUR = 3_600_000;
const DAY = 86_400_000;

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

/** Read at call time, so a deployment's settings (and tests) never depend on import order. */
const limits = (scope: Scope, env = process.env) => scope === "speech"
  // One request per NPC line: a voiced practice must not spend the practice allowance.
  ? { perIp: num(env.RATE_LIMIT_SPEECH_PER_IP, 240), daily: num(env.RATE_LIMIT_SPEECH_GLOBAL_DAILY, 10000) }
  // ~3 practice sessions per hour from one address; a best-effort per-instance daily ceiling.
  : { perIp: num(env.RATE_LIMIT_PER_IP, 45), daily: num(env.RATE_LIMIT_GLOBAL_DAILY, 2000) };

type Scope = "model" | "speech";
const buckets: Record<Scope, { hits: Map<string, number[]>; global: number[] }> = {
  model: { hits: new Map(), global: [] },
  speech: { hits: new Map(), global: [] },
};

function prune(times: number[], window: number, now: number) {
  const cutoff = now - window;
  let i = 0;
  while (i < times.length && times[i] < cutoff) i++;
  return i ? times.slice(i) : times;
}

/**
 * Best-effort client address. Each proxy *appends* the address it saw, so only
 * the entries written by our own proxies are trustworthy: read from the right,
 * skipping `TRUSTED_PROXY_HOPS - 1` inner hops (default 1 — Vercel and the
 * shipped Caddy config each leave exactly one). The leftmost value is whatever
 * the client chose to send and must never key a limit.
 */
export function clientKey(req: Request, env: Readonly<Record<string, string | undefined>> = process.env): string {
  const hops = Math.max(1, Math.floor(Number(env.TRUSTED_PROXY_HOPS) || 1));
  const chain = (req.headers.get("x-forwarded-for") ?? "").split(",").map((v) => v.trim()).filter(Boolean);
  if (chain.length) return chain[Math.max(0, chain.length - hops)];
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Throws when the caller has spent their share. The message points at the way
 * out we already built: their own key, which does not touch this server at all.
 */
export function checkRateLimit(req: Request, scope: Scope = "model") {
  if (process.env.RATE_LIMIT_DISABLED === "true") return;
  const now = Date.now(), { perIp, daily } = limits(scope), bucket = buckets[scope];
  const en = req.headers.get("accept-language")?.startsWith("en");

  bucket.global = prune(bucket.global, DAY, now);
  if (daily && bucket.global.length >= daily) {
    throw new LLMError(en ? "Today’s shared allowance is used up. Add your own key in Settings → Model to continue; it stays on your device." : "今天的共享额度用完了。在设置 → 模型里填自己的 key 可以继续，密钥只存在你的设备上。", 429, false, "quota");
  }

  const key = clientKey(req);
  const mine = prune(bucket.hits.get(key) ?? [], HOUR, now);
  if (perIp && mine.length >= perIp) {
    bucket.hits.set(key, mine);
    throw new LLMError(en ? "You’ve used a lot this hour. Try again later, or add your own key in Settings → Model." : "你这一小时用得有点多。稍后再试，或在设置 → 模型里填自己的 key。", 429, false, "rate_limit");
  }

  mine.push(now);
  bucket.hits.set(key, mine);
  bucket.global.push(now);

  // keep the map from growing without bound on a long-lived server
  if (bucket.hits.size > 5000) {
    for (const [k, v] of bucket.hits) if (!prune(v, HOUR, now).length) bucket.hits.delete(k);
  }
}

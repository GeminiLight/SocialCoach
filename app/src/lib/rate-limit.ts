import { LLMError } from "./llm-core";

/**
 * Protection for the deployment's own model quota.
 *
 * A public URL with a server-side key is an open LLM proxy, and one practice
 * session is 12–14 model calls — a single script can drain a quota in minutes.
 *
 * Two layers, because they fail differently:
 *   per-IP    stops one visitor monopolising the shared quota. Defeatable by
 *             anyone who can vary their source address, so it is not security.
 *   global    the actual backstop: a hard ceiling on what this deployment can
 *             spend in a day, no matter how many addresses show up.
 *
 * State is in memory. On one long-lived server that is exactly right. On
 * serverless it resets per instance, so the effective limit is looser than
 * configured — there the global cap is the number that matters.
 */

const HOUR = 3_600_000;
const DAY = 86_400_000;

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

/** ~3 practice sessions per hour from one address. */
const PER_IP = num(process.env.RATE_LIMIT_PER_IP, 45);
/** Whole-deployment ceiling for a day. */
const GLOBAL_DAILY = num(process.env.RATE_LIMIT_GLOBAL_DAILY, 2000);
const DISABLED = process.env.RATE_LIMIT_DISABLED === "true";

const hits = new Map<string, number[]>();
let globalHits: number[] = [];

function prune(times: number[], window: number, now: number) {
  const cutoff = now - window;
  let i = 0;
  while (i < times.length && times[i] < cutoff) i++;
  return i ? times.slice(i) : times;
}

/** Best-effort client address. Spoofable — see the note above. */
export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Throws when the caller has spent their share. The message points at the way
 * out we already built: their own key, which does not touch this server at all.
 */
export function checkRateLimit(req: Request) {
  if (DISABLED) return;
  const now = Date.now();

  globalHits = prune(globalHits, DAY, now);
  if (GLOBAL_DAILY && globalHits.length >= GLOBAL_DAILY) {
    throw new LLMError("今天的共享额度用完了。在设置 → 模型里填自己的 key 可以继续，密钥只存在你的设备上。", 429);
  }

  const key = clientKey(req);
  const mine = prune(hits.get(key) ?? [], HOUR, now);
  if (PER_IP && mine.length >= PER_IP) {
    hits.set(key, mine);
    throw new LLMError("你这一小时用得有点多。稍后再试，或在设置 → 模型里填自己的 key。", 429);
  }

  mine.push(now);
  hits.set(key, mine);
  globalHits.push(now);

  // keep the map from growing without bound on a long-lived server
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!prune(v, HOUR, now).length) hits.delete(k);
  }
}

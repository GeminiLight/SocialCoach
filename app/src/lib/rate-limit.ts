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

/** ~3 practice sessions per hour from one address. */
const PER_IP = num(process.env.RATE_LIMIT_PER_IP, 45);
/** Best-effort per-instance request ceiling. */
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
    throw new LLMError("今天的共享额度用完了。在设置 → 模型里填自己的 key 可以继续，密钥只存在你的设备上。", 429, false, "quota");
  }

  const key = clientKey(req);
  const mine = prune(hits.get(key) ?? [], HOUR, now);
  if (PER_IP && mine.length >= PER_IP) {
    hits.set(key, mine);
    throw new LLMError("你这一小时用得有点多。稍后再试，或在设置 → 模型里填自己的 key。", 429, false, "rate_limit");
  }

  mine.push(now);
  hits.set(key, mine);
  globalHits.push(now);

  // keep the map from growing without bound on a long-lived server
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!prune(v, HOUR, now).length) hits.delete(k);
  }
}

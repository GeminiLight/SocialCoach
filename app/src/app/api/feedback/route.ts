import { createHash } from "node:crypto";
import { feedbackSchema } from "@/lib/feedback/schema";
import { deliverFeedback, feedbackConfigured } from "@/lib/feedback/feishu";

export const runtime = "nodejs";
export const maxDuration = 30;
const hits = new Map<string, number[]>();
const deliveries = new Map<string, { hash: string; until: number; promise: Promise<void> }>();
let total: number[] = [];
const HOUR = 3600000;
const response = (body: object, status = 200, extra: Record<string, string> = {}) => Response.json(body, { status, headers: { "Cache-Control": "no-store", ...extra } });

export function GET() { return response({ available: feedbackConfigured() }); }

export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.startsWith("application/json")) return response({ error: "invalid_request" }, 415);
  if (req.headers.get("sec-fetch-site") === "cross-site") return response({ error: "invalid_request" }, 403);
  if (!feedbackConfigured()) return response({ error: "unavailable" }, 503);
  let value: unknown;
  try {
    // Bound actual bytes, including requests without Content-Length.
    const reader = req.body?.getReader();
    if (!reader) return response({ error: "invalid_request" }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      size += chunk.byteLength;
      if (size > 16000) { await reader.cancel(); return response({ error: "too_large" }, 413); }
      chunks.push(chunk);
    }
    value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch { return response({ error: "invalid_request" }, 400); }
  const parsed = feedbackSchema.safeParse(value);
  if (!parsed.success) return response({ error: "invalid_request" }, 400);
  const input = parsed.data;
  const now = Date.now();
  for (const [key, item] of deliveries) if (item.until < now) deliveries.delete(key);
  const hash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  const previous = deliveries.get(input.id);
  if (previous && previous.hash !== hash) return response({ error: "id_conflict" }, 409);
  if (!previous) {
    total = total.filter(t => now - t < HOUR);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    const key = createHash("sha256").update(ip).digest("hex");
    const mine = (hits.get(key) || []).filter(t => now - t < HOUR);
    if (mine.length >= 5 || total.length >= 200) return response({ error: "rate_limited" }, 429, { "Retry-After": "3600" });
    for (const [k, timestamps] of hits) if (!timestamps.some(t => now - t < HOUR)) hits.delete(k);
    hits.set(key, [...mine, now]); total.push(now);
    // Concurrent double clicks await the same delivery. Feishu's client_token
    // also deduplicates retries across instances and ambiguous timeouts.
    const promise = deliverFeedback(input);
    deliveries.set(input.id, { hash, until: now + HOUR, promise });
  }
  try {
    await deliveries.get(input.id)!.promise;
    return response({ ok: true, id: input.id });
  } catch {
    deliveries.delete(input.id);
    return response({ error: "delivery_failed" }, 502);
  }
}

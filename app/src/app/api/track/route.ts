import { createHash } from "node:crypto";
import { after } from "next/server";
import { batchSchema } from "@/lib/analytics/schema";
import { analyticsConfigured, deliverEvents } from "@/lib/analytics/feishu";

/**
 * Usage analytics intake. Accepts a small batch of metadata events from the
 * client, validates them strictly, and hands them to the sink after the
 * response has gone out, so a slow write never slows the app.
 *
 * What is deliberately not here: any log line with the body in it, the
 * caller's address (it is hashed for the rate window and forgotten), and any
 * response the client would act on — a beacon is fire-and-forget by design.
 */
export const runtime = "nodejs";
// `after()` work counts toward this. A cold table needs a column check and a
// dozen cross-border Feishu calls before its first write; 30 s was not enough.
export const maxDuration = 60;

const HOUR = 3_600_000;
/** A practice is three or four flushes; this is many practices from one address. */
const PER_IP = 240;
const GLOBAL = 20_000;
const hits = new Map<string, number[]>();
let total: number[] = [];

const response = (body: object | null, status: number, extra: Record<string, string> = {}) =>
  body === null ? new Response(null, { status, headers: { "Cache-Control": "no-store", ...extra } }) : Response.json(body, { status, headers: { "Cache-Control": "no-store", ...extra } });

export function GET() {
  return response({ available: analyticsConfigured() }, 200);
}

export async function POST(req: Request) {
  if (!req.headers.get("content-type")?.startsWith("application/json")) return response({ error: "invalid_request" }, 415);
  if (req.headers.get("sec-fetch-site") === "cross-site") return response({ error: "invalid_request" }, 403);
  // Not configured: accept and drop. The client asked GET first and should not be here.
  if (!analyticsConfigured()) return response(null, 204);
  let value: unknown;
  try {
    const reader = req.body?.getReader();
    if (!reader) return response({ error: "invalid_request" }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      size += chunk.byteLength;
      if (size > 16_000) { await reader.cancel(); return response({ error: "too_large" }, 413); }
      chunks.push(chunk);
    }
    value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch { return response({ error: "invalid_request" }, 400); }
  const parsed = batchSchema.safeParse(value);
  if (!parsed.success) return response({ error: "invalid_request" }, 400);

  const now = Date.now();
  total = total.filter((t) => now - t < HOUR);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const key = createHash("sha256").update(ip).digest("hex");
  const mine = (hits.get(key) || []).filter((t) => now - t < HOUR);
  if (mine.length >= PER_IP || total.length >= GLOBAL) return response({ error: "rate_limited" }, 429, { "Retry-After": "3600" });
  for (const [k, timestamps] of hits) if (!timestamps.some((t) => now - t < HOUR)) hits.delete(k);
  hits.set(key, [...mine, now]);
  total.push(now);

  const batch = parsed.data;
  const write = () => deliverEvents(batch).catch((e: unknown) => {
    // A short code only: never the batch, never Feishu's reply.
    console.error("[track]", e instanceof Error ? e.message : "delivery_failed");
  });
  try {
    // Runs once the response has been sent, on Vercel and on a long-lived server alike.
    after(write);
  } catch {
    // Outside a request scope (tests) `after` has nothing to attach to; write inline.
    await write();
  }
  return response({ ok: true }, 202);
}

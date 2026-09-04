import { NextResponse } from "next/server";
import { toHttpError } from "./llm";
import type { Lang } from "@/data/taxonomy";

export function fail(e: unknown) {
  const { status, message } = toHttpError(e);
  console.error("[api]", status, message);
  return NextResponse.json({ error: message }, { status });
}

export const asLang = (v: unknown): Lang => (v === "en" ? "en" : "zh");

/**
 * Run a streaming task and return its deltas as a plain text response.
 *
 * With `final`, the task's resolved value is appended as
 * `\n@@final\n<json>` — the authoritative result, since the streamed text is
 * only the model's raw output. Failures mid-stream are appended as
 * `\n@@error\n<message>` because headers have already been sent.
 */
export function taskStream<T>(run: (onDelta: (d: string) => void) => Promise<T>, opts: { final?: boolean } = {}) {
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const result = await run((d) => controller.enqueue(enc.encode(d)));
        if (opts.final) controller.enqueue(enc.encode(`\n@@final\n${JSON.stringify(result)}`));
      } catch (e) {
        const { status, message } = toHttpError(e);
        console.error("[api]", status, message);
        controller.enqueue(enc.encode(`\n@@error\n${message}`));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}

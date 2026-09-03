import { NextResponse } from "next/server";
import { toHttpError } from "./llm";
import type { Lang } from "@/data/taxonomy";
import type { MessageStream } from "@anthropic-ai/sdk/lib/MessageStream";

export function fail(e: unknown) {
  const { status, message } = toHttpError(e);
  console.error("[api]", status, message);
  return NextResponse.json({ error: message }, { status });
}

export const asLang = (v: unknown): Lang => (v === "en" ? "en" : "zh");

/** Wrap an Anthropic stream's text deltas as a plain text/stream response. */
export function textStream(iter: MessageStream, onDone?: (full: string) => void) {
  const enc = new TextEncoder();
  let full = "";
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const ev of iter) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta" && ev.delta.text) {
            full += ev.delta.text;
            controller.enqueue(enc.encode(ev.delta.text));
          }
        }
        onDone?.(full);
        controller.close();
      } catch (e) {
        const { message } = toHttpError(e);
        controller.enqueue(enc.encode(`\n@@error\n${message}`));
        controller.close();
      }
    },
  });
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}

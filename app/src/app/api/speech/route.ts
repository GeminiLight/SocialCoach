import { NextResponse } from "next/server";
import { speechConfiguration, speechPayload, speechResponse, SpeechInputSchema } from "@/lib/speech-synthesis";
import { readTaskBody } from "@/lib/task-input";
import { checkRateLimit } from "@/lib/rate-limit";
import { reserveSharedBudget } from "@/lib/shared-budget";
import { pick } from "@/lib/i18n";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  return NextResponse.json({ configured: !!speechConfiguration() }, { headers: { "Cache-Control": "no-store" } });
}

/** Only synthesize the supplied line. Audio and credentials are never persisted. */
export async function POST(request: Request) {
  const lang = request.headers.get("accept-language")?.startsWith("en") ? "en" : "zh";
  let release: (() => Promise<void>) | undefined;
  let stage = "input";
  try {
    checkRateLimit(request);
    const input = await readTaskBody(request, SpeechInputSchema);
    const configuration = speechConfiguration();
    if (!configuration) return NextResponse.json({ error: pick({ zh: "自然语音暂未接入。", en: "Natural speech is not connected." }, lang) }, { status: 503 });
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(20_000)]);
    const payload = speechPayload(input);
    stage = "budget";
    release = await reserveSharedBudget({ system: payload.messages[0].content, messages: [{ role: "user", content: input.text }], maxTokens: 8192, lang: input.lang, signal });
    stage = "provider";
    const response = await fetch(`${configuration.base}/chat/completions`, {
      method: "POST", headers: { Authorization: `Bearer ${configuration.key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload), signal, cache: "no-store",
    });
    stage = response.ok ? "audio" : "provider";
    const audio = await speechResponse(response);
    signal.throwIfAborted();
    return new Response(new Blob([audio.buffer as ArrayBuffer], { type: "audio/wav" }), { headers: { "Content-Type": "audio/wav", "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.warn("[speech]", { stage, upstreamStatus: (error as { upstreamStatus?: number })?.upstreamStatus, category: (error as { modelIssue?: string })?.modelIssue });
    // Voice failure must not disable the independently functioning dialogue model.
    const status = (error as { status?: number })?.status === 400 ? 400 : 503;
    return NextResponse.json({ error: pick({ zh: "语音暂时没有生成。文字练习可以继续。", en: "Speech was not generated. Text practice can continue." }, lang) }, { status });
  } finally { await release?.(); }
}

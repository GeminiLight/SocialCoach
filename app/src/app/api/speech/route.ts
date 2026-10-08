import { NextResponse } from "next/server";
import { speechConfiguration, speechPayload, speechPcm, speechResponse, speechStreamResponse, SpeechInputSchema } from "@/lib/speech-synthesis";
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
  let handedOff = false;
  let pcm: AsyncGenerator<Uint8Array> | undefined;
  const controller = new AbortController();
  try {
    checkRateLimit(request);
    const input = await readTaskBody(request, SpeechInputSchema);
    const configuration = speechConfiguration();
    if (!configuration) return NextResponse.json({ error: pick({ zh: "自然语音暂未接入。", en: "Natural speech is not connected." }, lang) }, { status: 503 });
    const signal = AbortSignal.any([request.signal, controller.signal, AbortSignal.timeout(20_000)]);
    const payload = speechPayload(input);
    stage = "budget";
    release = await reserveSharedBudget({ system: payload.messages[0].content, messages: [{ role: "user", content: input.text }], maxTokens: 8192, lang: input.lang, signal });
    stage = "provider";
    const startedAt = Date.now();
    const response = await fetch(`${configuration.base}/chat/completions`, {
      method: "POST", headers: { Authorization: `Bearer ${configuration.key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload), signal, cache: "no-store",
    });
    stage = response.ok ? "audio" : "provider";
    if (input.delivery === "pcm") {
      const iterator = speechPcm(response);
      pcm = iterator;
      const first = await iterator.next();
      signal.throwIfAborted();
      if (first.done) throw new Error("Missing PCM audio");
      const firstAudioMs = Date.now() - startedAt;
      const lease = release;
      let closed = false;
      const finish = async () => {
        if (closed) return;
        closed = true; controller.abort();
        await iterator.return(undefined).catch(() => {});
        await lease?.();
      };
      const body = new ReadableStream<Uint8Array>({
        start(c) { c.enqueue(first.value); },
        async pull(c) {
          try {
            const part = await iterator.next();
            signal.throwIfAborted();
            if (part.done) { c.close(); await finish(); }
            else c.enqueue(part.value);
          } catch { c.error(new Error("Speech stream interrupted")); await finish(); }
        },
        cancel: finish,
      });
      handedOff = true;
      return new Response(body, { headers: { "Content-Type": "audio/pcm;rate=24000;channels=1", "Cache-Control": "private, no-store", "X-Accel-Buffering": "no", "Server-Timing": `speech_first;dur=${firstAudioMs}` } });
    }
    const result = input.stream ? await speechStreamResponse(response, startedAt) : { audio: await speechResponse(response), firstAudioMs: Date.now() - startedAt, chunks: 1 };
    signal.throwIfAborted();
    return new Response(new Blob([result.audio.buffer as ArrayBuffer], { type: "audio/wav" }), { headers: { "Content-Type": "audio/wav", "Cache-Control": "private, no-store", "Server-Timing": `speech_first;dur=${result.firstAudioMs}, speech_total;dur=${Date.now() - startedAt}`, "X-Speech-Chunks": String(result.chunks) } });
  } catch (error) {
    console.warn("[speech]", { stage, upstreamStatus: (error as { upstreamStatus?: number })?.upstreamStatus, category: (error as { modelIssue?: string })?.modelIssue });
    // Voice failure must not disable the independently functioning dialogue model.
    const status = (error as { status?: number })?.status === 400 ? 400 : 503;
    return NextResponse.json({ error: pick({ zh: "语音暂时没有生成。文字练习可以继续。", en: "Speech was not generated. Text practice can continue." }, lang) }, { status });
  } finally { if (!handedOff) { controller.abort(); await pcm?.return(undefined).catch(() => {}); await release?.(); } }
}

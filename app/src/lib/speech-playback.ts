/** Browser-independent stream lifecycle; the audio sink and native voice own their resources. */
export interface SpeechHandle {
  done: Promise<void>;
  cancel: () => void;
  pause: (paused: boolean) => void;
}
export interface PcmSink {
  write: (samples: Float32Array) => void;
  finish: () => Promise<void>;
  cancel: () => void;
  pause: (paused: boolean) => void;
}

export function startStreamSpeech(options: {
  fetch: (signal: AbortSignal) => Promise<Response>;
  sink: PcmSink;
  fallback: () => SpeechHandle;
  firstAudioMs?: number;
}): SpeechHandle {
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let cancelled = false, started = false, paused = false, fallback: SpeechHandle | undefined;
  let finishCancel!: () => void;
  const cancellation = new Promise<void>(resolve => { finishCancel = resolve; });
  let timeout!: ReturnType<typeof setTimeout>;
  const abort = () => { controller.abort(); void reader?.cancel().catch(() => {}); };
  const firstDeadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => { abort(); reject(new Error("Speech first audio timeout")); }, options.firstAudioMs ?? 3500);
  });
  const consume = async () => {
    const response = await options.fetch(controller.signal);
    if (controller.signal.aborted) { void response.body?.cancel().catch(() => {}); throw new Error("Cancelled speech"); }
    if (!response.ok || !response.headers.get("content-type")?.startsWith("audio/pcm") || !response.body) throw new Error("Unavailable speech");
    reader = response.body.getReader();
    let odd: number | undefined, size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        controller.signal.throwIfAborted();
        if (done) break;
        size += value.length;
        if (size > 4_000_000) throw new Error("Speech too large");
        const bytes = odd === undefined ? value : new Uint8Array([odd, ...value]);
        odd = bytes.length % 2 ? bytes[bytes.length - 1] : undefined;
        const samples = new Float32Array(Math.floor(bytes.length / 2));
        const view = new DataView(bytes.buffer, bytes.byteOffset, samples.length * 2);
        for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true) / 32768;
        if (samples.length) {
          options.sink.write(samples); started = true; clearTimeout(timeout);
        }
      }
      if (!started || odd !== undefined) throw new Error("Missing PCM audio");
      await options.sink.finish();
    } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  };
  const run = async () => {
    try { await Promise.race([consume(), firstDeadline, cancellation]); }
    catch {
      abort(); options.sink.cancel();
      // Never replay a sentence the learner has already heard in part.
      if (!cancelled && !started) { fallback = options.fallback(); fallback.pause(paused); await Promise.race([fallback.done, cancellation]); }
    } finally { clearTimeout(timeout); }
  };
  return {
    done: run(),
    cancel() { cancelled = true; clearTimeout(timeout); abort(); options.sink.cancel(); fallback?.cancel(); finishCancel(); },
    pause(v) { paused = v; options.sink.pause(v); fallback?.pause(v); },
  };
}

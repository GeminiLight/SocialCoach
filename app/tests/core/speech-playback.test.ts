import assert from "node:assert/strict";
import { test } from "node:test";
import { startStreamSpeech, type PcmSink, type SpeechHandle } from "../../src/lib/speech-playback";

const response = (body: ReadableStream<Uint8Array>) => new Response(body, { headers: { "Content-Type": "audio/pcm;rate=24000;channels=1" } });
function harness() {
  const samples: number[] = []; let fallbacks = 0, cancelled = false, paused = false;
  const sink: PcmSink = { write(v) { samples.push(...v); }, async finish() {}, cancel() { cancelled = true; }, pause(v) { paused = v; } };
  const fallback = (): SpeechHandle => { fallbacks++; return { done: Promise.resolve(), cancel() {}, pause() {} }; };
  return { sink, fallback, samples, get fallbacks() { return fallbacks; }, get cancelled() { return cancelled; }, get paused() { return paused; } };
}
test("first PCM plays before completion; odd network boundaries preserve sample order", async () => {
  const h = harness(); let stream!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({ start(c) { stream = c; c.enqueue(new Uint8Array([0, 64, 0])); } });
  const speech = startStreamSpeech({ fetch: async () => response(body), sink: h.sink, fallback: h.fallback });
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.deepEqual(h.samples, [.5]); // The tail is still open.
  stream.enqueue(new Uint8Array([128])); stream.close(); await speech.done;
  assert.deepEqual(h.samples, [.5, -1]); assert.equal(h.fallbacks, 0);
});
test("slow first audio falls back once; a late response cannot start playing", async () => {
  const h = harness(); let resolve!: (r: Response) => void; let signal!: AbortSignal;
  const speech = startStreamSpeech({ fetch: s => { signal = s; return new Promise(r => { resolve = r; }); }, sink: h.sink, fallback: h.fallback, firstAudioMs: 10 });
  await speech.done; assert.equal(h.fallbacks, 1); assert.equal(signal.aborted, true);
  resolve(response(new ReadableStream({ start(c) { c.enqueue(new Uint8Array([0, 64])); c.close(); } })));
  await new Promise(r => setTimeout(r, 5)); assert.deepEqual(h.samples, []);
});
test("explicit cancellation drops audio and never invokes the fallback", async () => {
  const h = harness(); let stream!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({ start(c) { stream = c; } });
  const speech = startStreamSpeech({ fetch: async () => response(body), sink: h.sink, fallback: h.fallback });
  speech.cancel(); await speech.done;
  try { stream.enqueue(new Uint8Array([0, 64])); } catch {}
  assert.equal(h.cancelled, true); assert.equal(h.fallbacks, 0); assert.deepEqual(h.samples, []);
});
test("a failed stream after speech starts never repeats the full line with another voice", async () => {
  const h = harness(); let stream!: ReadableStreamDefaultController<Uint8Array>;
  const speech = startStreamSpeech({ fetch: async () => response(new ReadableStream({ start(c) { stream = c; c.enqueue(new Uint8Array([0, 64])); } })), sink: h.sink, fallback: h.fallback });
  await new Promise(r => setTimeout(r, 5)); stream.error(new Error("disconnect")); await speech.done;
  assert.deepEqual(h.samples, [.5]); assert.equal(h.fallbacks, 0);
});
test("pausing also pauses prepared audio and the fallback inherits that pause", async () => {
  const h = harness(); let fallbackPause: boolean | undefined;
  const speech = startStreamSpeech({ fetch: async () => new Response("unavailable", { status: 503 }), sink: h.sink, fallback: () => ({ done: Promise.resolve(), cancel() {}, pause(v) { fallbackPause = v; } }) });
  speech.pause(true); await speech.done; assert.equal(h.paused, true); assert.equal(fallbackPause, true);
});

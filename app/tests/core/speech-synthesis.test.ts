import assert from "node:assert/strict";
import { test } from "node:test";
import { speechAudio, speechConfiguration, speechPayload, speechResponse, speechStreamResponse, SpeechInputSchema } from "../../src/lib/speech-synthesis";

test("speech does not send another provider's key to the speech gateway", () => {
  assert.equal(speechConfiguration({ LLM_PROVIDER: "openai", LLM_BASE_URL: "https://open.bigmodel.cn/v1", LLM_API_KEY: "other-provider" }), null);
  assert.equal(speechConfiguration({ LLM_PROVIDER: "openai", LLM_BASE_URL: "https://tokendance.space/gateway/v1", LLM_API_KEY: "test-key" })?.base, "https://tokendance.space/gateway/v1");
  assert.equal(speechConfiguration({ LLM_PROVIDER: "openai", LLM_BASE_URL: "http://tokendance.space/gateway/v1", LLM_API_KEY: "test-key" }), null);
  assert.equal(speechConfiguration({ NPC_SPEECH_API_KEY: "incomplete", LLM_PROVIDER: "openai", LLM_BASE_URL: "https://tokendance.space/gateway/v1", LLM_API_KEY: "test-key" }), null);
});
test("the exact NPC line is the final assistant message, not an instruction or polished text", () => {
  const input = SpeechInputSchema.parse({ text: "这件事今晚还是需要有人处理。你觉得还有什么办法？", lang: "zh", voice: "白桦", tone: "firm" });
  const payload = speechPayload(input);
  assert.deepEqual(payload.messages.at(-1), { role: "assistant", content: input.text });
  assert.equal(payload.model, "mimo-v2.5-tts");
  assert.equal("optimize_text_preview" in payload.audio, false);
  assert.equal(SpeechInputSchema.safeParse({ ...input, text: "x".repeat(501) }).success, false);
  assert.equal(SpeechInputSchema.safeParse({ ...input, voice: "https://remote.example/voice.mp3" }).success, false);
});
test("text-only completions, malformed base64 and non-WAV bytes cannot become audio", () => {
  assert.throws(() => speechAudio({ choices: [{ message: { content: "pretend audio" } }] }));
  assert.throws(() => speechAudio({ choices: [{ message: { audio: { data: "bad***" } } }] }));
  assert.throws(() => speechAudio({ choices: [{ message: { audio: { data: Buffer.from("x".repeat(100)).toString("base64") } } }] }));
  const wave = Buffer.alloc(46); wave.write("RIFF", 0); wave.write("WAVE", 8);
  const value = { choices: [{ message: { audio: { data: wave.toString("base64") } } }] };
  assert.deepEqual(speechAudio(value), new Uint8Array(wave));
});
test("provider failures and large chunked responses remain bounded", async () => {
  await assert.rejects(speechResponse(new Response("unavailable", { status: 502 })));
  let cancelled = false;
  const body = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(8_000_001)); }, cancel() { cancelled = true; } });
  await assert.rejects(speechResponse(new Response(body)));
  assert.equal(cancelled, true);
});

test("fragmented SSE audio preserves sample order and rejects text-only streams", async () => {
  const samples = [Buffer.from([0, 1, 2, 3]), Buffer.from([4, 5, 6, 7])];
  const events = 'data: {"choices":[{"delta":{"role":"assistant"}}]}\n\n' + samples.map(s => 'data: '+JSON.stringify({ choices: [{ delta: { audio: { data: s.toString("base64") } } }] })+'\n\n').join('')+'data: [DONE]\n\n';
  const encoder = new TextEncoder();
  const body = new ReadableStream({ start(c) { for (let i = 0; i < events.length; i += 7) c.enqueue(encoder.encode(events.slice(i, i + 7))); c.close(); } });
  const result = await speechStreamResponse(new Response(body));
  assert.deepEqual(result.audio.slice(44), new Uint8Array(Buffer.concat(samples)));
  assert.equal(result.chunks, 2);
  assert.ok(result.firstAudioMs >= 0);
  await assert.rejects(speechStreamResponse(new Response('data: {"choices":[{"delta":{"content":"not audio"}}]}\n\ndata: [DONE]\n\n')));
});

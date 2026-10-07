import assert from "node:assert/strict";
import { test } from "node:test";
import { speechAudio, speechConfiguration, speechPayload, speechResponse, SpeechInputSchema } from "../../src/lib/speech-synthesis";

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

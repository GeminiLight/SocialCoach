import { z } from "zod";

export const SPEECH_MODEL = "mimo-v2.5-tts";
export const SpeechInputSchema = z.object({
  text: z.string().trim().min(1).max(500),
  lang: z.enum(["zh", "en"]),
  voice: z.enum(["白桦", "苏打", "茉莉", "冰糖", "Mia", "Chloe", "Milo", "Dean"]),
  tone: z.enum(["neutral", "firm", "gentle"]).default("neutral"),
  stream: z.boolean().default(false),
}).strict();
export type SpeechInput = z.infer<typeof SpeechInputSchema>;

/** Credentials are reused only with the very same configured gateway. */
export function speechConfiguration(env: Readonly<Record<string, string | undefined>> = process.env) {
  if (!!env.NPC_SPEECH_API_KEY !== !!env.NPC_SPEECH_BASE_URL) return null;
  if (env.NPC_SPEECH_API_KEY && env.NPC_SPEECH_BASE_URL) {
    return { key: env.NPC_SPEECH_API_KEY, base: env.NPC_SPEECH_BASE_URL.replace(/\/+$/, "") };
  }
  const base = env.LLM_BASE_URL?.replace(/\/+$/, "");
  if (env.LLM_PROVIDER !== "openai" || !base || !env.LLM_API_KEY) return null;
  try { const url = new URL(base); if (url.hostname !== "tokendance.space" || url.protocol !== "https:") return null; } catch { return null; }
  return { key: env.LLM_API_KEY, base };
}

export function speechPayload(input: SpeechInput) {
  const tone = { neutral: "自然、平实", firm: "沉稳、有立场，但不要喊叫", gentle: "温和、自然，避免播音腔" }[input.tone];
  const style = input.lang === "zh"
    ? `像面对面聊天一样说普通话，${tone}。语速适中，按语义自然停顿。逐字朗读台词，不加词，不改词，不读提示。`
    : `Speak conversational English at a natural pace with meaningful pauses. ${input.tone === "firm" ? "Firm without shouting." : input.tone === "gentle" ? "Warm without sounding like an announcer." : "Plain and relaxed."} Read the exact line; do not add or change words.`;
  return {
    model: SPEECH_MODEL,
    messages: [{ role: "user", content: style }, { role: "assistant", content: input.text }],
    audio: { format: input.stream ? "pcm16" : "wav", voice: input.voice },
    stream: input.stream,
  };
}

/** No text-only success, guessed audio type or unbounded base64 response. */
export function speechAudio(value: unknown): Uint8Array {
  const data = (value as { choices?: { message?: { audio?: { data?: unknown } } }[] })?.choices?.[0]?.message?.audio?.data;
  if (typeof data !== "string" || data.length > 6_000_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data) || data.length % 4 !== 0) throw new Error("Invalid speech audio");
  const bytes = Buffer.from(data, "base64");
  if (bytes.length < 44 || bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WAVE") throw new Error("Invalid WAV audio");
  return new Uint8Array(bytes);
}

export async function speechResponse(response: Response): Promise<Uint8Array> {
  if (!response.ok) throw Object.assign(new Error("Speech provider unavailable"), { upstreamStatus: response.status });
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Missing speech audio");
  let length = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 8_000_000) { await reader.cancel(); throw new Error("Speech response too large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return speechAudio(JSON.parse(new TextDecoder().decode(bytes)));
}

/** Record the real first audio event; collecting here also makes a playable WAV sample. */
export async function speechStreamResponse(response: Response, startedAt = Date.now()): Promise<{ audio: Uint8Array; firstAudioMs: number; chunks: number }> {
  if (!response.ok) throw Object.assign(new Error("Speech provider unavailable"), { upstreamStatus: response.status });
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Missing speech audio");
  const decoder = new TextDecoder();
  const pcm: Uint8Array[] = [];
  let buffer = "", transferred = 0, size = 0, firstAudioMs = -1, done = false;
  const event = (frame: string) => {
    const data = frame.split(/\r?\n/).filter(line => line.startsWith("data:")).map(line => line.slice(5).trimStart()).join("\n");
    if (!data) return;
    if (data === "[DONE]") { done = true; return; }
    const value = JSON.parse(data) as { choices?: { delta?: { audio?: { data?: unknown } }; message?: { audio?: { data?: unknown } } }[] };
    const encoded = value.choices?.[0]?.delta?.audio?.data ?? value.choices?.[0]?.message?.audio?.data;
    if (encoded === undefined || encoded === "") return;
    if (typeof encoded !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length % 4 !== 0) throw new Error("Invalid speech chunk");
    const bytes = new Uint8Array(Buffer.from(encoded, "base64"));
    if (!size && Buffer.from(bytes.slice(0, 4)).toString("ascii") === "RIFF") throw new Error("Expected PCM audio, received WAV");
    size += bytes.length;
    if (size > 4_000_000) throw new Error("Speech response too large");
    if (firstAudioMs === -1) firstAudioMs = Date.now() - startedAt;
    pcm.push(bytes);
  };
  try {
    while (!done) {
      const part = await reader.read();
      if (part.done) { buffer += decoder.decode(); if (buffer.trim()) event(buffer); break; }
      transferred += part.value.length;
      if (transferred > 8_000_000) throw new Error("Speech response too large");
      buffer += decoder.decode(part.value, { stream: true });
      let boundary: RegExpMatchArray | null;
      while ((boundary = buffer.match(/\r?\n\r?\n/))) {
        const end = boundary.index!;
        event(buffer.slice(0, end));
        buffer = buffer.slice(end + boundary[0].length);
        if (done) break;
      }
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  if (!size || size % 2 !== 0) throw new Error("Missing PCM audio");
  const wave = Buffer.alloc(44 + size);
  wave.write("RIFF", 0); wave.writeUInt32LE(36 + size, 4); wave.write("WAVEfmt ", 8);
  wave.writeUInt32LE(16, 16); wave.writeUInt16LE(1, 20); wave.writeUInt16LE(1, 22);
  wave.writeUInt32LE(24000, 24); wave.writeUInt32LE(48000, 28); wave.writeUInt16LE(2, 32); wave.writeUInt16LE(16, 34);
  wave.write("data", 36); wave.writeUInt32LE(size, 40);
  let offset = 44;
  for (const chunk of pcm) { wave.set(chunk, offset); offset += chunk.length; }
  return { audio: new Uint8Array(wave), firstAudioMs, chunks: pcm.length };
}

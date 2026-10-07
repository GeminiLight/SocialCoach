import { z } from "zod";

export const SPEECH_MODEL = "mimo-v2.5-tts";
export const SpeechInputSchema = z.object({
  text: z.string().trim().min(1).max(500),
  lang: z.enum(["zh", "en"]),
  voice: z.enum(["白桦", "苏打", "茉莉", "冰糖", "Mia", "Chloe", "Milo", "Dean"]),
  tone: z.enum(["neutral", "firm", "gentle"]).default("neutral"),
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
    audio: { format: "wav", voice: input.voice },
    stream: false,
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

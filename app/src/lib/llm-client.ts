"use client";
import {
  anthropicArgs,
  LLMError,
  openaiArgs,
  type ChatOpts,
  type LLM,
  type TextRun,
} from "./llm-core";
import type { ByokConfig } from "./byok";

/**
 * The browser-side LLM: calls the provider directly from the page, so the
 * learner's key never reaches our server.
 *
 * The SDKs are pulled in with dynamic `import()` — code-split, so only someone
 * who has actually configured their own model downloads them. Request shapes
 * come from `llm-core`, the same functions the server uses, so the two paths
 * cannot drift.
 */

type Anthropic = import("@anthropic-ai/sdk").default;
type OpenAI = import("openai").default;

const clients = new WeakMap<ByokConfig, { anthropic?: Anthropic; openai?: OpenAI }>();

async function anthropicClient(c: ByokConfig): Promise<Anthropic> {
  const cached = clients.get(c) ?? {};
  if (!cached.anthropic) {
    const { default: Ctor } = await import("@anthropic-ai/sdk");
    cached.anthropic = new Ctor({
      apiKey: c.apiKey.trim(),
      baseURL: c.baseUrl.trim() || undefined,
      // The learner's own key, in the learner's own browser. The SDK adds
      // `anthropic-dangerous-direct-browser-access` for us.
      dangerouslyAllowBrowser: true,
      maxRetries: 1,
    });
    clients.set(c, cached);
  }
  return cached.anthropic;
}

async function openaiClient(c: ByokConfig): Promise<OpenAI> {
  const cached = clients.get(c) ?? {};
  if (!cached.openai) {
    const { default: Ctor } = await import("openai");
    cached.openai = new Ctor({
      apiKey: c.apiKey.trim(),
      baseURL: c.baseUrl.trim() || undefined,
      dangerouslyAllowBrowser: true,
      maxRetries: 1,
    });
    clients.set(c, cached);
  }
  return cached.openai;
}

/**
 * Turn a failure into something the learner can act on. Never echoes the
 * request, and never the key.
 */
export function byokError(e: unknown, c: ByokConfig): LLMError {
  if (e instanceof LLMError) return e;
  const status = (e as { status?: number } | null)?.status;
  const where = c.baseUrl.trim() || (c.provider === "openai" ? "OpenAI" : "Anthropic");
  // The endpoint's own words beat ours: a 429 may be rate limiting or an empty
  // balance, and only it knows which.
  const body = (e as { error?: { message?: unknown } } | null)?.error;
  const said = body && typeof body === "object" ? (body as { message?: unknown }).message : undefined;
  const provider = typeof said === "string" && said.trim() ? said.trim() : null;
  if (status === 401 || status === 403) return new LLMError(provider ?? `凭据无效 · ${where}`, 401);
  if (status === 404) return new LLMError(provider ?? `找不到模型或地址 · ${where}`, 404);
  if (status === 429) return new LLMError(provider ?? "额度或频率超限，稍后再试", 429);
  if (typeof status === "number") return new LLMError(provider ?? `${where} 返回 ${status}`, status);
  // No status at all: DNS, TLS, offline — or, most often, the endpoint did not
  // send CORS headers for a browser request.
  return new LLMError(`连不上 ${where} · 自建服务需允许跨域（Ollama 设 OLLAMA_ORIGINS）`, 503);
}

/**
 * Ask the endpoint what it can run. Both providers expose `/models`, and so do
 * most OpenAI-compatible gateways — but not all, and a self-hosted one may
 * block it with CORS even when chat works. So this is best-effort: the caller
 * falls back to typing a model name by hand.
 */
export async function listModels(c: ByokConfig): Promise<string[]> {
  try {
    let ids: string[];
    if (c.provider === "openai") {
      const oa = await openaiClient(c);
      ids = (await oa.models.list()).data.map((m) => m.id);
    } else {
      const an = await anthropicClient(c);
      ids = (await an.models.list({ limit: 100 })).data.map((m) => m.id);
    }
    // A raw /models dump mixes in embeddings, speech and image models. None of
    // those can hold a conversation, and offering one is a trap: the learner
    // would pick it and only find out when a call fails.
    return ids.filter((id) => !NOT_CHAT.test(id)).sort();
  } catch (e) {
    throw byokError(e, c);
  }
}

const NOT_CHAT = /embed|embedding|tts|whisper|speech|audio|transcri|dall-?e|image|moderation|rerank|guard/i;

/** Build an `LLM` from the learner's own settings. */
export function makeByokLLM(c: ByokConfig): LLM {
  const chatText = async (o: ChatOpts): Promise<string> => {
    try {
      if (c.provider === "openai") {
        const oa = await openaiClient(c);
        const res = await oa.chat.completions.create(
          openaiArgs(o, c.smartModel, c.tokenParam) as Parameters<typeof oa.chat.completions.create>[0] & { stream?: false },
        );
        const choice = "choices" in res ? res.choices[0] : undefined;
        if (choice?.message?.refusal) throw new LLMError("模型拒绝了这个请求", 422);
        return choice?.message?.content ?? "";
      }
      const an = await anthropicClient(c);
      const res = await an.messages.create(anthropicArgs(o, c.smartModel));
      if (res.stop_reason === "refusal") throw new LLMError("模型拒绝了这个请求", 422);
      return res.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { text: string }).text)
        .join("\n");
    } catch (e) {
      throw byokError(e, c);
    }
  };

  const chatStream = (o: ChatOpts): TextRun => {
    let acc = "";
    let refusal = false;
    async function* run() {
      try {
        if (c.provider === "openai") {
          const oa = await openaiClient(c);
          const stream = await oa.chat.completions.create({
            ...openaiArgs(o, c.smartModel, c.tokenParam),
            stream: true,
          } as Parameters<typeof oa.chat.completions.create>[0] & { stream: true });
          for await (const chunk of stream) {
            const choice = chunk.choices[0];
            if (choice?.delta?.refusal) refusal = true;
            if (choice?.finish_reason === "content_filter") refusal = true;
            const d = choice?.delta?.content;
            if (d) {
              acc += d;
              yield d;
            }
          }
          return;
        }
        const an = await anthropicClient(c);
        const stream = an.messages.stream(anthropicArgs(o, c.smartModel));
        for await (const ev of stream) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta" && ev.delta.text) {
            acc += ev.delta.text;
            yield ev.delta.text;
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") refusal = true;
      } catch (e) {
        throw byokError(e, c);
      }
    }
    return { deltas: run(), text: () => acc, refused: () => refusal };
  };

  return { chatText, chatStream };
}

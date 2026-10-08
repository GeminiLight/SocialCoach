"use client";
import {
  anthropicArgs,
  modelBaseUrl,
  LLMError,
  openaiArgs,
  type ChatOpts,
  type LLM,
  type TextRun,
} from "./llm-core";
import type { ByokConfig } from "./byok";
import { checkModelConnection, modelIssue, type ModelMetadata } from "./model-status";

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
      baseURL: modelBaseUrl(c.baseUrl,c.provider) || undefined,
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
      baseURL: modelBaseUrl(c.baseUrl,c.provider) || undefined,
      dangerouslyAllowBrowser: true,
      maxRetries: 1,
      // Compatible gateways may allow Authorization/Content-Type in CORS but
      // reject the SDK's optional diagnostics before any request is sent.
      fetch: (input, init) => {
        const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
        for (const name of [...headers.keys()]) {
          if (name.startsWith("x-stainless-")) headers.delete(name);
        }
        return fetch(input, { ...init, headers });
      },
    });
    clients.set(c, cached);
  }
  return cached.openai;
}

/**
 * Turn a failure into something the learner can act on. Never echoes the
 * request, and never the key.
 */
export function byokError(e: unknown): LLMError {
  if (["AbortError", "APIUserAbortError"].includes((e as Error)?.name)) throw e;
  if (e instanceof LLMError) return e;
  const status = (e as { status?: number } | null)?.status;
  const issue = modelIssue(e) ?? (typeof status !== "number" ? "network" : status < 500 ? "model" : "service");
  // Never surface a provider payload, which can echo credentials or request text.
  return new LLMError(`Model connection: ${issue}.`, status ?? 503, false, issue);
}

export async function checkByokConnection(c: ByokConfig, signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(5_000);
  const options = { timeout: 5_000, maxRetries: 0, signal: signal ? AbortSignal.any([signal, timeout]) : timeout };
  const metadata: ModelMetadata = c.provider === "openai" ? {
    list: async () => ({ ids: (await (await openaiClient(c)).models.list(options)).data.map(m => m.id) }),
    retrieve: async id => (await openaiClient(c)).models.retrieve(id, options),
  } : {
    list: async () => { const r = await (await anthropicClient(c)).models.list({ limit: 100 }, options); return { ids: r.data.map(m => m.id), more: r.has_more }; },
    retrieve: async id => (await anthropicClient(c)).models.retrieve(id, {}, options),
  };
  return checkModelConnection(metadata, [c.fastModel.trim(), c.smartModel.trim()]);
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
    throw byokError(e);
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
          openaiArgs(o, c.smartModel, c.tokenParam, c.disableThinking) as Parameters<typeof oa.chat.completions.create>[0] & { stream?: false },
          { signal: o.signal },
        );
        const choice = "choices" in res ? res.choices[0] : undefined;
        if (choice?.message?.refusal) throw new LLMError("模型拒绝了这个请求", 422);
        return choice?.message?.content ?? "";
      }
      const an = await anthropicClient(c);
      const res = await an.messages.create(anthropicArgs(o, c.smartModel), { signal: o.signal });
      if (res.stop_reason === "refusal") throw new LLMError("模型拒绝了这个请求", 422);
      return res.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { text: string }).text)
        .join("\n");
    } catch (e) {
      throw byokError(e);
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
            ...openaiArgs(o, c.smartModel, c.tokenParam, c.disableThinking),
            stream: true,
          } as Parameters<typeof oa.chat.completions.create>[0] & { stream: true }, {signal:o.signal});
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
        const stream = an.messages.stream(anthropicArgs(o, c.smartModel), {signal:o.signal});
        for await (const ev of stream) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta" && ev.delta.text) {
            acc += ev.delta.text;
            yield ev.delta.text;
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") refusal = true;
      } catch (e) {
        throw byokError(e);
      }
    }
    return { deltas: run(), text: () => acc, refused: () => refusal };
  };

  return { chatText, chatStream };
}

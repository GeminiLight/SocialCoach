import {reserveSharedBudget,requiresBudgetSetup} from "./shared-budget";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { modelIssue, type ModelIssue, type ModelMetadata } from "./model-status";
import {
  anthropicArgs,
  extractJSON,
  LLMError,
  jsonCall as coreJsonCall,
  openaiArgs,
  type ChatOpts,
  type JSONCallOpts,
  type LLM,
  type Provider,
  type SystemPart,
  type TextRun,
  type TokenParam,
} from "./llm-core";

export { extractJSON, LLMError };
export type { ChatOpts, LLM, Provider, SystemPart, TextRun };

/* ───────────────────────── Provider configuration ─────────────────────────
 * One provider is active per deployment, chosen by LLM_PROVIDER. Everything
 * below this block is provider-agnostic: routes call `chatText` / `chatStream`
 * and never see an SDK.
 *
 *   LLM_PROVIDER    anthropic (default) | openai
 *   LLM_BASE_URL    overrides the provider's default endpoint — this is the
 *                   knob for OpenAI-compatible gateways (vLLM, Ollama,
 *                   OpenRouter, LiteLLM, …)
 *   LLM_API_KEY     credential; provider-native vars still work as fallbacks
 *   LLM_FAST_MODEL / LLM_SMART_MODEL
 * ------------------------------------------------------------------------- */

const raw = (process.env.LLM_PROVIDER ?? "anthropic").trim().toLowerCase();
export const PROVIDER: Provider = raw === "openai" ? "openai" : "anthropic";

const BASE_URL =
  process.env.LLM_BASE_URL ||
  (PROVIDER === "openai" ? process.env.OPENAI_BASE_URL : process.env.ANTHROPIC_BASE_URL) ||
  undefined;

const API_KEY =
  process.env.LLM_API_KEY ||
  (PROVIDER === "openai"
    ? process.env.OPENAI_API_KEY
    : (process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_AUTH_TOKEN));

/**
 * Newer OpenAI models reject `max_tokens` and want `max_completion_tokens`,
 * while most OpenAI-compatible servers only know `max_tokens`. Default to the
 * compatible one and let a deployment switch.
 */
const OPENAI_TOKEN_PARAM: TokenParam = process.env.LLM_OPENAI_TOKEN_PARAM === "max_completion_tokens" ? "max_completion_tokens" : "max_tokens";

/** Some OpenAI-compatible reasoning models accept `thinking:{type:"disabled"}`; official OpenAI 400s on it. */
const OPENAI_DISABLE_THINKING = process.env.LLM_OPENAI_THINKING === "disabled";

const DEFAULT_MODELS: Record<Provider, { fast: string; smart: string }> = {
  anthropic: { fast: "claude-sonnet-5", smart: "claude-opus-5" },
  // Set these explicitly for OpenAI-compatible endpoints; the defaults are only a guess.
  openai: { fast: "gpt-4.1-mini", smart: "gpt-4.1" },
};

/** Fast model: role-play turns, hints, short coach replies, scheduling, scenario generation. */
export const FAST_MODEL = process.env.LLM_FAST_MODEL?.trim() || DEFAULT_MODELS[PROVIDER].fast;
/** Smart model: post-practice assessment reports. */
export const SMART_MODEL = process.env.LLM_SMART_MODEL?.trim() || DEFAULT_MODELS[PROVIDER].smart;

let _anthropic: Anthropic | null = null;
let _openai: OpenAI | null = null;

/** Whether this deployment can call a model on the learner's behalf. */
export const hasServerCredential = () => !!API_KEY;
export const serverRequiresByok=()=>["1","true"].includes(process.env.LLM_REQUIRE_BYOK??"")||requiresBudgetSetup();

function requireKey() {
  if (API_KEY && !serverRequiresByok()) return API_KEY;
  throw new LLMError("Connect a model to continue.", 503, false, "setup");
}

function anthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: requireKey(), baseURL: BASE_URL, maxRetries: 2, timeout: 120_000 });
  return _anthropic;
}

function openai(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: requireKey(), baseURL: BASE_URL, maxRetries: 2, timeout: 120_000 });
  return _openai;
}

/** A bounded, free metadata check. No message or completion is generated. */
export function serverModelMetadata(): ModelMetadata {
  const options = { timeout: 5_000, maxRetries: 0, signal: AbortSignal.timeout(5_000) };
  return PROVIDER === "openai" ? {
    list: async () => ({ ids: (await openai().models.list(options)).data.map(m => m.id) }),
    retrieve: id => openai().models.retrieve(id, options),
  } : {
    list: async () => { const r = await anthropic().models.list({ limit: 100 }, options); return { ids: r.data.map(m => m.id), more: r.has_more }; },
    retrieve: id => anthropic().models.retrieve(id, {}, options),
  };
}

/* ───────────────────────────── The server LLM ─────────────────────────────
 * Built from environment variables. The browser builds its own from the user's
 * settings (see `llm-client.ts`); both satisfy the same `LLM` interface, so the
 * task modules in `lib/tasks/` run unchanged on either side.
 * ------------------------------------------------------------------------- */

/** One-shot call; returns the assistant's text. */
async function providerText(o: ChatOpts): Promise<string> {
  if (PROVIDER === "openai") {
    const res = await openai().chat.completions.create(
      openaiArgs(o, SMART_MODEL, OPENAI_TOKEN_PARAM, OPENAI_DISABLE_THINKING) as unknown as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
      { signal: o.signal },
    );
    const choice = res.choices[0];
    if (choice?.message?.refusal) throw new LLMError("The model declined this request.", 422);
    return choice?.message?.content ?? "";
  }
  const res = await anthropic().messages.create(anthropicArgs(o, SMART_MODEL), { signal: o.signal });
  if (res.stop_reason === "refusal") throw new LLMError("The model declined this request.", 422);
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

export async function chatText(o:ChatOpts):Promise<string>{
 requireKey();const release=await reserveSharedBudget(o);
 try{return await providerText(o);}finally{await release();}
}

/** Streaming call. Text deltas only; tool calls and thinking blocks are not surfaced. */
export function chatStream(o: ChatOpts): TextRun {
  let acc = "";
  let refusal = false;
  async function* run() {
    requireKey();const release=await reserveSharedBudget(o);
    try{
    if (PROVIDER === "openai") {
      const stream = await openai().chat.completions.create({
        ...openaiArgs(o, SMART_MODEL, OPENAI_TOKEN_PARAM, OPENAI_DISABLE_THINKING),
        stream: true,
      } as unknown as OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming, {signal:o.signal});
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
    const stream = anthropic().messages.stream(anthropicArgs(o, SMART_MODEL), {signal:o.signal});
    for await (const ev of stream) {
      if (ev.type === "content_block_delta" && ev.delta.type === "text_delta" && ev.delta.text) {
        acc += ev.delta.text;
        yield ev.delta.text;
      }
    }
    // Anthropic only reveals a refusal on the final message.
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") refusal = true;
    }finally{await release();}
  }
  return { deltas: run(), text: () => acc, refused: () => refusal };
}

/** The server-side LLM, for route handlers. */
export const serverLLM: LLM = { chatText, chatStream };

/** `jsonCall` bound to the server LLM. */
export const jsonCall = <T>(opts: JSONCallOpts) => coreJsonCall<T>(opts, serverLLM);

/**
 * The provider's own words, when it sent any. Worth preferring over our generic
 * text: a 429 can mean "slow down" or "your balance is empty", and only the
 * provider knows which — telling someone to retry a spent account is worse than
 * saying nothing.
 */
function providerMessage(e: unknown): string | null {
  const body = (e as { error?: { message?: unknown } } | null)?.error;
  const msg = body && typeof body === "object" ? (body as { message?: unknown }).message : undefined;
  return typeof msg === "string" && msg.trim() ? msg.trim() : null;
}

function httpError(e: unknown): { status: number; message: string } {
  if (e instanceof LLMError) return { status: e.status, message: e.message };
  const provider = providerMessage(e);
  if (e instanceof Anthropic.AuthenticationError || e instanceof OpenAI.AuthenticationError) return { status: 401, message: provider ?? "LLM credentials are invalid." };
  if (e instanceof Anthropic.RateLimitError || e instanceof OpenAI.RateLimitError) return { status: 429, message: provider ?? "Too many requests to the model. Try again in a moment." };
  if (e instanceof Anthropic.APIConnectionError || e instanceof OpenAI.APIConnectionError) return { status: 503, message: `Could not reach the model${BASE_URL ? ` at ${BASE_URL}` : ""}.` };
  if (e instanceof Anthropic.APIError || e instanceof OpenAI.APIError) return { status: e.status ?? 502, message: provider ?? e.message };
  return { status: 500, message: e instanceof Error ? e.message : "Unknown error" };
}

export function toHttpError(e: unknown): { status: number; message: string; modelIssue?: ModelIssue } {
  const result = httpError(e);
  const issue = modelIssue(e) ?? ((e instanceof Anthropic.APIError || e instanceof OpenAI.APIError) && e.status === 400 ? "model" : undefined);
  // Model errors expose only a safe category. Provider payloads can echo keys.
  return { ...result, message: issue ? `Model connection: ${issue}.` : result.message.replaceAll(API_KEY || "\u0000", "[redacted]"), modelIssue: issue };
}

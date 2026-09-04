/**
 * The portable half of the LLM layer: types, the request shape for each
 * provider, and JSON extraction. No SDK imports and no `process.env`, so this
 * module runs identically on the server and in the browser.
 *
 * Each provider's request shape is defined here exactly once. The server client
 * (`llm.ts`) and the browser client (`llm-client.ts`) both build their calls
 * from these functions, so the two paths cannot drift.
 */
import { fixUnescapedQuotes, parsePartialJSON } from "./partial-json";

export type Provider = "anthropic" | "openai";
export type TokenParam = "max_tokens" | "max_completion_tokens";

/** A system prompt part. `cache` asks the provider to cache this prefix if it can. */
export interface SystemPart {
  text: string;
  cache?: boolean;
}

export interface ChatOpts {
  model?: string;
  system: string | SystemPart[];
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens: number;
  /** Reasoning budget, where the provider has one. */
  effort?: "low" | "medium" | "high";
  /** false disables extended thinking on providers that have it. */
  thinking?: boolean;
}

/** Provider-agnostic streaming run: consume `deltas`, then read `text()`. */
export interface TextRun {
  deltas: AsyncIterable<string>;
  /** Everything streamed. Valid once `deltas` is exhausted. */
  text: () => string;
  /** True when the provider reported a refusal / content stop. */
  refused: () => boolean;
}

/**
 * The whole surface a task needs. The server builds one from environment
 * variables; the browser builds one from the user's own settings.
 */
export interface LLM {
  chatText(o: ChatOpts): Promise<string>;
  chatStream(o: ChatOpts): TextRun;
}

/** A unit of work that streams text as it arrives, then resolves with a typed result. */
export type Task<I, O> = (input: I, llm: LLM, onDelta?: (delta: string) => void) => Promise<O>;

export const systemParts = (system: string | SystemPart[]): SystemPart[] =>
  typeof system === "string" ? [{ text: system }] : system;

/** Request body for Anthropic's Messages API. */
export function anthropicArgs(o: ChatOpts, fallbackModel: string) {
  return {
    model: o.model ?? fallbackModel,
    max_tokens: o.maxTokens,
    system: systemParts(o.system).map((p) => ({
      type: "text" as const,
      text: p.text,
      ...(p.cache ? { cache_control: { type: "ephemeral" as const } } : {}),
    })),
    messages: o.messages,
    ...(o.thinking === false ? { thinking: { type: "disabled" as const } } : {}),
    ...(o.effort ? { output_config: { effort: o.effort } } : {}),
  };
}

/**
 * Request body for OpenAI chat completions, and for anything speaking the same
 * protocol. Prompt caching is automatic there so the `cache` hint is dropped,
 * and system parts are joined into one system message.
 */
export function openaiArgs(o: ChatOpts, fallbackModel: string, tokenParam: TokenParam, disableThinking = false) {
  return {
    model: o.model ?? fallbackModel,
    [tokenParam]: o.maxTokens,
    // Reasoning models spend `max_tokens` on thinking before they write a word,
    // so a short budget can come back empty. Endpoints differ on how to turn it
    // off — GLM takes `thinking`, official OpenAI rejects the field outright —
    // hence the opt-in.
    ...(disableThinking && o.thinking === false ? { thinking: { type: "disabled" as const } } : {}),
    messages: [
      { role: "system" as const, content: systemParts(o.system).map((p) => p.text).join("\n\n") },
      ...o.messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    ...(o.effort ? { reasoning_effort: o.effort } : {}),
  };
}

export class LLMError extends Error {
  constructor(message: string, public status = 502, public retryable = false) {
    super(message);
  }
}

/**
 * Pull the first JSON object/array out of a model response. The gateway in
 * use does not support output_config.format, so we ask for JSON in the prompt
 * and parse leniently: strips code fences and leading/trailing prose.
 */
export function extractJSON<T = unknown>(text: string): T {
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = Math.min(...["{", "["].map((c) => (s.indexOf(c) === -1 ? Infinity : s.indexOf(c))));
  if (start === Infinity) throw new LLMError("Model returned no JSON", 502, true);
  s = s.slice(start);
  // walk to the matching close bracket, respecting strings
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") {
      depth--;
      if (depth === 0) {
        s = s.slice(0, i + 1);
        break;
      }
    }
  }
  try {
    return JSON.parse(s) as T;
  } catch (first) {
    // common LLM slips, in order: trailing commas; raw newlines/tabs inside strings; a truncated tail.
    const noTrailing = s.replace(/,\s*([}\]])/g, "$1");
    try {
      return JSON.parse(noTrailing) as T;
    } catch {}
    try {
      return JSON.parse(escapeControlCharsInStrings(noTrailing)) as T;
    } catch {}
    try {
      return JSON.parse(fixUnescapedQuotes(escapeControlCharsInStrings(noTrailing))) as T;
    } catch {}
    const repaired = parsePartialJSON<T>(escapeControlCharsInStrings(noTrailing));
    if (repaired && Object.keys(repaired).length) return repaired as T;
    const msg = first instanceof Error ? first.message : String(first);
    const m = msg.match(/position (\d+)/);
    const pos = m ? Number(m[1]) : -1;
    console.error("[extractJSON] unparseable model output:", msg, pos >= 0 ? JSON.stringify(s.slice(Math.max(0, pos - 160), pos + 80)) : JSON.stringify(s.slice(-240)));
    throw new LLMError("The coach's notes came back garbled. Please try again.", 502, true);
  }
}

/** JSON forbids raw control characters inside strings; models sometimes emit real newlines there. */
function escapeControlCharsInStrings(src: string): string {
  let out = "";
  let inStr = false;
  let esc = false;
  for (const ch of src) {
    if (inStr) {
      if (esc) {
        esc = false;
        out += ch;
        continue;
      }
      if (ch === "\\") {
        esc = true;
        out += ch;
        continue;
      }
      if (ch === '"') inStr = false;
      if (ch === "\n") { out += "\\n"; continue; }
      if (ch === "\r") { out += "\\r"; continue; }
      if (ch === "\t") { out += "\\t"; continue; }
      out += ch;
      continue;
    }
    if (ch === '"') inStr = true;
    out += ch;
  }
  return out;
}

export interface JSONCallOpts extends Omit<ChatOpts, "messages" | "system"> {
  system: string | SystemPart[];
  user: string;
}

/** Non-streaming call that must return JSON. Retries once on parse failure. */
export async function jsonCall<T>(opts: JSONCallOpts, llm: LLM): Promise<T> {
  const attempt = async (nudge = false): Promise<T> => {
    const text = await llm.chatText({
      ...opts,
      maxTokens: opts.maxTokens ?? 8000,
      system: typeof opts.system === "string" ? [{ text: opts.system, cache: true }] : opts.system,
      messages: [{ role: "user", content: nudge ? `${opts.user}\n\nReturn ONLY the JSON object. No prose.` : opts.user }],
    });
    return extractJSON<T>(text);
  };
  try {
    return await attempt();
  } catch (e) {
    if (e instanceof LLMError && e.retryable) return attempt(true);
    if (e instanceof SyntaxError) return attempt(true);
    throw e;
  }
}

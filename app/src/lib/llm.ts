import Anthropic from "@anthropic-ai/sdk";
import { fixUnescapedQuotes, parsePartialJSON } from "./partial-json";

/**
 * Single Anthropic client. Credentials and base URL come from the environment
 * (ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN, ANTHROPIC_BASE_URL).
 */
let _client: Anthropic | null = null;
export function client(): Anthropic {
  if (!_client) {
    _client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_AUTH_TOKEN,
      maxRetries: 2,
      timeout: 120_000,
    });
  }
  return _client;
}

/** Fast model: role-play turns, hints, short coach replies. */
export const FAST_MODEL = process.env.LLM_FAST_MODEL ?? "claude-sonnet-5";
/** Smart model: scheduling, assessment reports, scenario generation. */
export const SMART_MODEL = process.env.LLM_SMART_MODEL ?? "claude-opus-5";

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

interface JSONCallOpts {
  model?: string;
  system: string;
  user: string;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
  thinking?: boolean;
}

/** Non-streaming call that must return JSON. Retries once on parse failure. */
export async function jsonCall<T>(opts: JSONCallOpts): Promise<T> {
  const c = client();
  const attempt = async (nudge = false): Promise<T> => {
    const res = await c.messages.create({
      model: opts.model ?? SMART_MODEL,
      max_tokens: opts.maxTokens ?? 8000,
      system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: nudge ? `${opts.user}\n\nReturn ONLY the JSON object. No prose.` : opts.user }],
      ...(opts.thinking === false ? { thinking: { type: "disabled" as const } } : {}),
      ...(opts.effort ? { output_config: { effort: opts.effort } } : {}),
    });
    if (res.stop_reason === "refusal") throw new LLMError("The model declined this request.", 422);
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
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

export function toHttpError(e: unknown): { status: number; message: string } {
  if (e instanceof LLMError) return { status: e.status, message: e.message };
  if (e instanceof Anthropic.AuthenticationError) return { status: 401, message: "LLM credentials are invalid." };
  if (e instanceof Anthropic.RateLimitError) return { status: 429, message: "Too many requests to the model. Try again in a moment." };
  if (e instanceof Anthropic.APIConnectionError) return { status: 503, message: "Could not reach the model." };
  if (e instanceof Anthropic.APIError) return { status: e.status ?? 502, message: e.message };
  return { status: 500, message: e instanceof Error ? e.message : "Unknown error" };
}

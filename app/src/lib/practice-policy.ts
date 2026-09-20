import type { ChatMessage, Closure, RoleplayMeta, Session } from "./types";

/** Match an actual contiguous quotation, never fuzzy-match a different claim. */
export function hasQuote(quote: unknown, texts: string[]): quote is string {
  return typeof quote === "string" && quote.trim().length > 0 && texts.some((text) => text.includes(quote.trim()));
}

/** These bins describe original goal attainment only, never communication skill. */
export function goalOutcome(done: boolean[]): NonNullable<Session["outcome"]> {
  const n = done.filter(Boolean).length;
  return n > 0 && n === done.length ? "success" : n > 0 ? "partial" : "failure";
}

/** Only a grounded closing exchange can end early; an `ended` flag alone cannot. */
export function supportedClosure(meta: RoleplayMeta | null, history: ChatMessage[], npcLines: string[]): Closure | undefined {
  if (meta?.ended !== true || !meta.closure) return;
  const c = meta.closure;
  if (!["agreement", "boundary", "deferred", "withdrawal"].includes(c.kind) || !hasQuote(c.npcQuote, npcLines)) return;
  const last = history.filter((m) => m.role !== "coach").at(-1);
  // Bilateral closure needs the latest learner contribution, not an old quote
  // contradicted by a newer turn. NPCs can still independently walk away.
  if (c.kind !== "withdrawal" && (last?.role !== "learner" || !hasQuote(c.learnerQuote, [last.text]))) return;
  if (c.learnerQuote && (last?.role !== "learner" || !hasQuote(c.learnerQuote, [last.text]))) return;
  return { kind: c.kind, npcQuote: c.npcQuote.trim(), ...(c.learnerQuote ? { learnerQuote: c.learnerQuote.trim() } : {}) };
}

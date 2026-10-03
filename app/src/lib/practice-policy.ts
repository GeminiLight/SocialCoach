import type { ChatMessage, Closure, RoleplayMeta, Session } from "./types";
import { lastSpoken, silenceStreak } from "./session-utils";

/** A finite practice segment; reaching it offers a choice rather than ending. */
export const INITIAL_PRACTICE_TURNS = 12;
export const CONTINUATION_TURNS = 8;
export function practiceTurnLimit(s: Pick<Session, "scenario" | "turnLimit">): number {
  const initial = Math.max(INITIAL_PRACTICE_TURNS, Math.min(24, Math.trunc(s.scenario.maxTurns) || INITIAL_PRACTICE_TURNS));
  return Number.isSafeInteger(s.turnLimit) && s.turnLimit! >= initial ? s.turnLimit! : initial;
}

export function practiceCheckpoint(s: Pick<Session, "scenario" | "turnLimit" | "messages" | "closure" | "continuedFrom">): "closure" | "segment" | "silence" | null {
  const last = lastSpoken(s.messages);
  // A partial reply is recovery, never an invitation to skip that reply.
  if (last?.role !== "npc" || !last.text || last.id === s.continuedFrom) return null;
  if (s.closure) return "closure";
  if (silenceStreak(s.messages) >= 2) return "silence";
  return s.messages.filter((m) => m.role === "learner").length >= practiceTurnLimit(s) ? "segment" : null;
}

/** Kept on the same session: no transcript, commitments or progress is reset. */
export function continuePractice(s: Pick<Session, "scenario" | "turnLimit" | "messages">): Pick<Session, "turnLimit" | "closure" | "continuedFrom"> {
  return {
    turnLimit: Math.max(practiceTurnLimit(s), s.messages.filter((m) => m.role === "learner").length) + CONTINUATION_TURNS,
    closure: undefined,
    continuedFrom: lastSpoken(s.messages)?.id,
  };
}

/** Match an actual contiguous quotation, never fuzzy-match a different claim. */
export function hasQuote(quote: unknown, texts: string[]): quote is string {
  return typeof quote === "string" && quote.trim().length > 0 && texts.some((text) => text.includes(quote.trim()));
}

/** These bins describe original goal attainment only, never communication skill. */
export function goalOutcome(done: boolean[]): NonNullable<Session["outcome"]> {
  const n = done.filter(Boolean).length;
  return n > 0 && n === done.length ? "success" : n > 0 ? "partial" : "failure";
}

/** A grounded closing proposal; only the learner chooses to end the practice. */
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

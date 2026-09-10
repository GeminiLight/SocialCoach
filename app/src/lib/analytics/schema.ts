import { z } from "zod";

/**
 * What the app is allowed to tell us about itself. Every event is metadata
 * about a practice — which scenario, how long, how it ended — and never what
 * anyone said. The schemas are strict, so a transcript, a rehearsal
 * description or a name cannot arrive by accident, and the server refuses
 * anything it does not recognise instead of storing it.
 *
 * Rows are the scarce resource (a Feishu table holds 20,000), so a new
 * question is answered with a field on an existing event wherever it can be.
 */
const ts = z.number().int().min(0);
const session = z.string().regex(/^[a-z0-9]{4,40}$/);
/** A corpus id, or the literal `custom` — never the text of a generated scenario. */
const scenario = z.string().regex(/^[a-z0-9-]{1,80}$/);
const outcome = z.enum(["success", "partial", "failure"]);
const origin = z.enum(["scheduled", "arena", "rehearse"]);

export const TASKS = ["schedule", "roleplay", "hint", "assess", "reflect", "rehearse", "pattern"] as const;

export const eventSchema = z.discriminatedUnion("name", [
  /**
   * Once per device per day, from the client, with or without a profile:
   * the funnel needs the visitors who never finished onboarding, retention
   * needs only the learners (`profile`).
   */
  z.object({ name: z.literal("app_open"), ts, profile: z.boolean(), ua: z.enum(["mobile", "desktop"]), standalone: z.boolean() }).strict(),
  /** The profile was created; the day a visitor became a learner. */
  z.object({ name: z.literal("onboarding_done"), ts }).strict(),
  /** The briefing appeared — the model is being waited on. */
  z.object({ name: z.literal("briefing_view"), ts, session, scenario, origin }).strict(),
  /** The learner entered the scene (past the briefing). `wait_s` is how long the briefing took them. */
  z.object({
    name: z.literal("session_start"),
    ts,
    session,
    scenario,
    origin,
    context: z.string().regex(/^[a-z-]{1,40}$/),
    difficulty: z.number().int().min(1).max(3),
    timed: z.boolean(),
    wait_s: z.number().int().min(0).max(86400),
  }).strict(),
  /** The scene closed, by whatever hand. */
  z.object({
    name: z.literal("session_end"),
    ts,
    session,
    scenario,
    outcome,
    turns: z.number().int().min(0).max(200),
    silences: z.number().int().min(0).max(200),
    duration_s: z.number().int().min(0).max(86400),
    ended_by: z.enum(["engine", "cap", "silence", "user"]),
    hints: z.number().int().min(0).max(50),
    /** 1-based learner turn on which the hidden motive came out; absent means it never did. */
    revealed_turn: z.number().int().min(1).max(200).optional(),
    /** The learner's own model, so their failures and costs are not ours. */
    byok: z.boolean(),
  }).strict(),
  /** The report was produced and shown. */
  z.object({ name: z.literal("debrief_view"), ts, session, scenario, stars: z.number().int().min(0).max(3), outcome }).strict(),
  /** A Socratic question was answered — the report was read, not just generated. */
  z.object({ name: z.literal("reflect"), ts, session, index: z.number().int().min(0).max(9) }).strict(),
  /** The cross-session habit was shown on Growth, or honestly not found. */
  z.object({ name: z.literal("pattern_view"), ts, found: z.boolean() }).strict(),
  /**
   * A model call failed as the learner saw it. Status code and task only —
   * never the message, which can echo what was sent.
   */
  z.object({
    name: z.literal("api_error"),
    ts,
    task: z.enum(TASKS),
    kind: z.enum(["http", "network", "stream"]),
    status: z.number().int().min(0).max(999),
    byok: z.boolean(),
  }).strict(),
]);
export type TrackEvent = z.infer<typeof eventSchema>;

export const batchSchema = z.object({
  /** Idempotency key for this flush; a retried beacon does not double-count. */
  id: z.string().uuid(),
  /** Random, per browser origin, cleared with the rest of the learner's data. */
  device: z.string().uuid(),
  lang: z.enum(["zh", "en"]),
  events: z.array(eventSchema).min(1).max(20),
}).strict();
export type TrackBatch = z.infer<typeof batchSchema>;

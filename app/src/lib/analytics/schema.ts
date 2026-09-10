import { z } from "zod";

/**
 * What the app is allowed to tell us about itself. Every event is metadata
 * about a practice — which scenario, how long, how it ended — and never what
 * anyone said. The schemas are strict, so a transcript, a rehearsal
 * description or a name cannot arrive by accident, and the server refuses
 * anything it does not recognise instead of storing it.
 */
const ts = z.number().int().min(0);
const session = z.string().regex(/^[a-z0-9]{4,40}$/);
/** A corpus id, or the literal `custom` — never the text of a generated scenario. */
const scenario = z.string().regex(/^[a-z0-9-]{1,80}$/);
const outcome = z.enum(["success", "partial", "failure"]);

export const eventSchema = z.discriminatedUnion("name", [
  /** Once per device per day, from the client; retention is counted on these. */
  z.object({ name: z.literal("app_open"), ts }).strict(),
  /** The learner entered the scene (past the briefing). */
  z.object({
    name: z.literal("session_start"),
    ts,
    session,
    scenario,
    origin: z.enum(["scheduled", "arena", "rehearse"]),
    context: z.string().regex(/^[a-z-]{1,40}$/),
    difficulty: z.number().int().min(1).max(3),
    timed: z.boolean(),
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
  }).strict(),
  /** The report was produced and shown. */
  z.object({ name: z.literal("debrief_view"), ts, session, scenario, stars: z.number().int().min(0).max(3), outcome }).strict(),
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

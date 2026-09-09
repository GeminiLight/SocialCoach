import type { Scenario } from "@/data/corpus/types";
import { COMPETENCIES, skillById, type CompetencyId, type Lang, type SkillId } from "@/data/taxonomy";
import type { ScheduleResult } from "./client-api";
import { uid } from "./format";
import type { ChatMessage, Proficiency, Session } from "./types";

export function defaultLearnerId(s: Scenario): string {
  const p = s.characters.find((c) => c.playable);
  return p?.id ?? s.characters[0].id;
}

/** Characters the learner talks to (everyone except the learner's role). */
export function npcsOf(s: Scenario, learnerId: string) {
  return s.characters.filter((c) => c.id !== learnerId);
}

export function buildSession(scenario: Scenario, origin: Session["origin"], lang: Lang, res?: Partial<ScheduleResult>): Session {
  const learnerCharacterId = res?.adaptation?.learnerCharacterId ?? defaultLearnerId(scenario);
  return {
    id: uid(),
    scenario,
    learnerCharacterId,
    prescription: res?.prescription,
    adaptation: res?.adaptation,
    retrieval: res?.retrieval,
    messages: [],
    objectiveDone: scenario.objectives.map(() => false),
    status: "briefing",
    startedAt: Date.now(),
    reflections: [],
    origin,
  };
}

export function historyFor(sessions: Session[], lang: Lang) {
  return sessions
    .filter((s) => s.status === "assessed" || s.status === "ended")
    .slice(0, 12)
    .reverse()
    .map((s) => ({
      scenarioId: s.scenario.id,
      title: s.scenario.title[lang],
      skills: s.scenario.skills,
      context: s.scenario.context,
      outcome: s.outcome,
      stars: s.report?.stars,
      at: s.startedAt,
    }));
}

export function competencyValues(prof: Proficiency): Record<CompetencyId, number | null> {
  const out = {} as Record<CompetencyId, number | null>;
  for (const c of COMPETENCIES) {
    const vals = Object.entries(prof)
      .filter(([k]) => skillById(k as SkillId).competency === c.id)
      .map(([, v]) => v as number);
    out[c.id] = vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : null;
  }
  return out;
}

/** The last thing anyone said or did — coach hints are whispers, not part of the room. */
export function lastSpoken(msgs: ChatMessage[]): ChatMessage | undefined {
  for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].role !== "coach") return msgs[i];
  return undefined;
}

/**
 * Silences since the learner last said anything. One is a lapse the other side
 * fills; two in a row is a conversation they walk away from.
 */
export function silenceStreak(msgs: ChatMessage[]): number {
  let n = 0;
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    if (m.role === "learner") break;
    if (m.role === "event" && m.kind === "silence") n++;
  }
  return n;
}

export function sessionMinutes(s: Session) {
  const end = s.endedAt ?? s.startedAt;
  return Math.max(1, Math.round((end - s.startedAt) / 60000));
}

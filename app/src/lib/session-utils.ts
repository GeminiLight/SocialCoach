import type { Scenario } from "@/data/corpus/types";
import { COMPETENCIES, skillById, type CompetencyId, type Lang, type SkillId } from "@/data/taxonomy";
import type { ScheduleResult } from "./client-api";
import { uid } from "./format";
import type { Proficiency, Session } from "./types";

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

export function sessionMinutes(s: Session) {
  const end = s.endedAt ?? s.startedAt;
  return Math.max(1, Math.round((end - s.startedAt) / 60000));
}

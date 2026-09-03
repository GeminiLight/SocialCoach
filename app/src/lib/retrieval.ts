import { SCENARIOS, THEORIES, CASES } from "@/data/corpus";
import type { Case, Scenario, Theory } from "@/data/corpus/types";
import type { ContextId, SkillId } from "@/data/taxonomy";
import { skillById } from "@/data/taxonomy";
import type { Prescription, RetrievalTrace } from "./types";

/**
 * Retrieval-constrained scenario selection (paper §4.3.1, Appendix A.2).
 * Core constraints (target skills, optionally context) are never dropped.
 * Optional constraints relax in a fixed order; every relaxation is recorded.
 * Ranking combines tag alignment with a lexical match on the query.
 */

const tokenize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);

function lexicalScore(query: string, doc: string[]): number {
  const q = new Set(tokenize(query));
  if (!q.size) return 0;
  const d = new Set(doc.flatMap(tokenize));
  let hit = 0;
  for (const t of q) if (d.has(t)) hit++;
  return hit / q.size;
}

function scenarioText(s: Scenario) {
  return [s.title.en, s.title.zh, s.hook.en, s.hook.zh, s.background.en, ...s.keywords, ...s.skills.map((k) => skillById(k).name.en)];
}

export function retrieveScenario(
  p: Prescription,
  exclude: Set<string>,
  pool: Scenario[] = SCENARIOS,
): { scenario: Scenario | null; trace: RetrievalTrace } {
  const relaxed: string[] = [];
  const core = p.core_constraints;
  const opt = p.optional_constraints ?? {};

  const base = pool.filter((s) => !exclude.has(s.id) && !s.custom);
  const coreOk = (s: Scenario) => {
    const skillHit = core.target_skills.some((k) => s.skills.includes(k) || s.relatedSkills?.includes(k));
    const ctxOk = !core.contexts?.length || core.contexts.includes(s.context);
    return skillHit && ctxOk;
  };

  let cands = base.filter(coreOk);
  // Relaxation order for optional constraints (fixed): relationship → difficulty → related skills
  const filters: [string, (s: Scenario) => boolean][] = [
    ["relationship_types", (s) => !opt.relationship_types?.length || s.relationship.some((r) => opt.relationship_types!.includes(r))],
    ["difficulty", (s) => !opt.difficulty || s.difficulty === opt.difficulty],
    ["related_skills", (s) => !opt.related_skills?.length || opt.related_skills.some((k) => s.skills.includes(k) || s.relatedSkills?.includes(k))],
  ];
  let filtered = cands.filter((s) => filters.every(([, f]) => f(s)));
  const active = [...filters];
  while (!filtered.length && active.length) {
    const [name] = active.shift()!;
    relaxed.push(name);
    filtered = cands.filter((s) => active.every(([, f]) => f(s)));
  }
  cands = filtered;

  if (!cands.length) {
    // Core constraint unsatisfiable within unseen scenarios: allow repeats before failing.
    const repeat = pool.filter((s) => !s.custom && coreOk(s));
    if (repeat.length) {
      relaxed.push("exclude_history");
      cands = repeat;
    } else {
      return { scenario: null, trace: { relaxed, candidates: 0, chosen: "" } };
    }
  }

  const ranked = cands
    .map((s) => {
      const primary = core.target_skills.filter((k) => s.skills.includes(k)).length * 2;
      const related = core.target_skills.filter((k) => s.relatedSkills?.includes(k)).length;
      const lex = lexicalScore(p.query, scenarioText(s)) * 3;
      const diff = opt.difficulty ? -Math.abs(s.difficulty - opt.difficulty) * 0.5 : 0;
      return { s, score: primary + related + lex + diff };
    })
    .sort((a, b) => b.score - a.score);
  const chosen = ranked[0].s;
  return { scenario: chosen, trace: { relaxed, candidates: cands.length, chosen: chosen.id } };
}

/** Knowledge retrieval for tutoring (paper §4.4.3): theories for acquisition deficits, cases for performance deficits. */
export function retrieveKnowledge(opts: {
  skills: SkillId[];
  context: ContextId;
  query: string;
  acquisition: boolean;
  performance: boolean;
}): { theories: Theory[]; cases: Case[] } {
  const rank = <T extends { skills: SkillId[]; keywords: string[]; competencies: string[] }>(items: T[], text: (t: T) => string[]) =>
    items
      .map((t) => {
        const skill = opts.skills.filter((k) => t.skills.includes(k)).length * 2;
        const lex = lexicalScore(opts.query, [...text(t), ...t.keywords]) * 3;
        return { t, score: skill + lex };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.t);

  const theories = rank(THEORIES, (t) => [t.title.en, t.principle.en]).slice(0, opts.acquisition ? 3 : 2);
  const cases = rank(
    CASES.filter((c) => c.context === opts.context || true),
    (c) => [c.title.en, c.situation.en, c.takeaway.en],
  )
    .sort((a, b) => (a.context === opts.context ? -1 : 0) - (b.context === opts.context ? -1 : 0))
    .slice(0, opts.performance ? 3 : 2);
  return { theories, cases };
}

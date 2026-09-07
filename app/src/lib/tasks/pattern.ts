import { jsonCall, type LLM } from "@/lib/llm-core";
import { patternSystem } from "@/lib/prompts";
import { SKILLS, type SkillId } from "@/data/taxonomy";
import type { PatternInput, PatternResult } from "./types";

const skillIds = new Set(SKILLS.map((s) => s.id));

/** Loose match: models re-punctuate and trim quotes even when told not to. */
const norm = (s: string) =>
  s
    .replace(/[“”„"'‘’]/g, "")
    .replace(/[\s　]+/g, "")
    .replace(/[，,。．.、；;：:！!？?…—–-]/g, "")
    .toLowerCase();

/**
 * The recurring habit across several sessions.
 *
 * The value of this is that it is more convincing than any single debrief, so a
 * fabricated one would do more damage than a fabricated anything else in the
 * app. Two guards, both in code rather than in the prompt: every quote has to
 * actually occur in the evidence that was sent, and what survives has to span
 * two different sessions. If either fails, the answer becomes "nothing yet",
 * which is a perfectly good answer and the honest one.
 */
export async function runPattern(input: PatternInput, llm: LLM, smartModel: string): Promise<PatternResult> {
  const { sessions, lang, goals } = input;
  const none: PatternResult = { found: false, pattern: "", why: "", evidence: [], nextStep: "" };
  if (sessions.length < 2) return none;

  const block = sessions
    .map((s, i) => {
      const w = s.weaknesses
        .map((x) => `    - ${x.behavior} [${x.skill}, ${x.deficit}]\n      learner said: "${x.evidence}"`)
        .join("\n");
      return [
        `SESSION ${i + 1} — "${s.title}"`,
        `  outcome: ${s.outcome ?? "n/a"}; learner turns: ${s.turns}`,
        s.verdict ? `  verdict: ${s.verdict}` : "",
        s.gaveGroundOn.length ? `  the other side pulled back on turn(s): ${s.gaveGroundOn.join(", ")}` : "  the other side never pulled back",
        w || "    (no weaknesses recorded)",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  const raw = await jsonCall<PatternResult>(
    {
      model: smartModel,
      thinking: false,
      maxTokens: 2000,
      system: patternSystem(lang),
      user: `TARGET SKILLS: ${goals.join(", ") || "(none set)"}\n\n${block}\n\nFind the pattern, or return found:false.`,
    },
    llm,
  );

  if (!raw?.found) return none;

  // Every quote must exist in what we sent. A quote the model wrote itself is
  // indistinguishable from a real one to the reader, which is why this is here.
  const bySession = new Map(sessions.map((s) => [s.title, s.weaknesses.map((w) => norm(w.evidence))]));
  const allQuotes = sessions.flatMap((s) => s.weaknesses.map((w) => norm(w.evidence)));
  const evidence = (raw.evidence ?? []).filter((e) => {
    if (!e?.quote || !e?.title) return false;
    const q = norm(e.quote);
    if (q.length < 6) return false;
    const inNamed = (bySession.get(e.title) ?? []).some((v) => v.includes(q) || q.includes(v));
    // Accept a right quote filed under a slightly wrong title rather than drop it.
    return inNamed || allQuotes.some((v) => v.includes(q) || q.includes(v));
  });

  const titles = new Set(evidence.map((e) => e.title));
  if (evidence.length < 2 || titles.size < 2) return none;

  const skill = raw.skill && skillIds.has(raw.skill as SkillId) ? (raw.skill as SkillId) : undefined;
  return {
    found: true,
    pattern: (raw.pattern ?? "").trim(),
    why: (raw.why ?? "").trim(),
    evidence: evidence.slice(0, 3),
    skill,
    nextStep: (raw.nextStep ?? "").trim(),
  };
}

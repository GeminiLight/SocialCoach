import { extractJSON, type LLM } from "@/lib/llm-core";
import { assessSystem, pick, silenceMarker, transcriptBlock } from "@/lib/prompts";
import { retrieveKnowledge } from "@/lib/retrieval";
import type { Case, Scenario, Theory } from "@/data/corpus/types";
import { goalOutcome, hasQuote } from "@/lib/practice-policy";
import type { ChatMessage, Report } from "@/lib/types";
import { SKILLS, type Lang, type SkillId } from "@/data/taxonomy";
import type { AssessInput } from "./types";

const skillIds = new Set(SKILLS.map((s) => s.id));

/** Clamp and validate whatever the model returned so the client can trust every field. */
const list = <T,>(v: T[] | undefined): T[] => Array.isArray(v) ? v : [];
const str = (v: unknown): string => typeof v === "string" ? v.trim() : "";
const unrated = { zh: "这次对话还没有足够的原话证据支持评价。", en: "This conversation does not yet provide enough quoted evidence for an assessment." };

export function sanitizeReport(raw: Partial<Report>, scenario: Scenario, theories: Theory[], cases: Case[], messages: ChatMessage[] = [], goals: SkillId[] = [], lang: Lang = "zh", objectiveDone: boolean[] = []): Report {
  const spoken = messages.filter((m) => m.role === "learner").map((m) => m.text);
  const evidence = [...spoken, ...messages.filter((m) => m.role === "event" && m.kind === "silence").map((m) => silenceMarker(m.seconds ?? 0, lang))];
  const practiced = [...scenario.skills, ...(scenario.relatedSkills ?? [])];
  const targeted = goals.filter((k) => practiced.includes(k));
  const ratingSkills = new Set(targeted.length ? targeted : scenario.skills);
  const seen = new Set<string>();
  const ratings = list(raw.ratings).filter((r) => {
    if (!r || !ratingSkills.has(r.skill) || seen.has(r.skill) || !Number.isInteger(r.level) || r.level < 0 || r.level > 3 || !hasQuote(r.evidence, spoken) || !str(r.reason)) return false;
    seen.add(r.skill);
    return true;
  });
  const stars = (ratings.length ? Math.round(ratings.reduce((sum, r) => sum + r.level, 0) / ratings.length) : 0) as Report["stars"];
  const clean = <T extends { skill: string; evidence: string; behavior: string }>(arr: T[] | undefined) => list(arr).filter((x) => x && skillIds.has(x.skill as SkillId) && practiced.includes(x.skill as SkillId) && str(x.behavior) && hasQuote(x.evidence, evidence));
  const strengths = clean(raw.strengths);
  const weaknesses = clean(raw.weaknesses).filter((w) => w.deficit === "acquisition" || w.deficit === "performance");
  const tIds = new Set(theories.map((t) => t.id));
  const cIds = new Set(cases.map((c) => c.id));
  const knowledge = {
    theoryIds: list(raw.knowledge?.theoryIds).filter((id) => tIds.has(id)).slice(0, 2),
    caseIds: list(raw.knowledge?.caseIds).filter((id) => cIds.has(id)).slice(0, 2),
    whyThis: str(raw.knowledge?.whyThis),
  };
  const deltas: Report["deltas"] = {};
  for (const r of ratings) {
    // A quote and a positive demonstration are prerequisites for progression.
    const v = Number(raw.deltas?.[r.skill]);
    if (r.level === 0 || !Number.isFinite(v)) continue;
    deltas[r.skill] = +Math.max(0, Math.min(scenario.skills.includes(r.skill) ? 0.5 : 0.2, v)).toFixed(2);
  }
  const outcome = raw.outcome === "success" || raw.outcome === "partial" || raw.outcome === "failure" ? raw.outcome : goalOutcome(objectiveDone);
  const verdictEvidence = hasQuote(raw.verdictEvidence, spoken) ? raw.verdictEvidence : undefined;
  return {
    scoringVersion: 2, ratings, stars, outcome, verdictEvidence,
    verdict: verdictEvidence ? str(raw.verdict) : pick(unrated, lang),
    summary: verdictEvidence ? str(raw.summary) : "",
    strengths, weaknesses,
    alternatives: list(raw.alternatives).filter((a) => a && hasQuote(a.original, spoken) && str(a.better) && str(a.why)),
    knowledge,
    reflectionQuestions: list(raw.reflectionQuestions).filter((q) => str(q)).slice(0, 3),
    nextStep: str(raw.nextStep), deltas,
  };
}

/**
 * Diagnose the conversation. Validate evidence before exposing any report text.
 * The transport still supports @@final; raw, unverified assessments never flash in the UI.
 */
export async function runAssess(input: AssessInput, llm: LLM, smartModel: string, onDelta?: (d: string) => void): Promise<Report> {
  const { scenario, learnerCharacterId, messages, goals, lang } = input;
  const name = input.learnerName || pick(scenario.characters.find((c) => c.id === learnerCharacterId)!.name, lang);
  const transcript = transcriptBlock(messages, scenario, lang, name);
  const learnerText = messages.filter((m) => m.role === "learner").map((m) => m.text).join(" ");

  const kb = retrieveKnowledge({
    skills: [...scenario.skills, ...(scenario.relatedSkills ?? []), ...goals],
    context: scenario.context,
    query: `${scenario.keywords.join(" ")} ${learnerText.slice(0, 400)}`,
    acquisition: true,
    performance: true,
  });

  const run = llm.chatStream({
    model: smartModel,
    maxTokens: 8000,
    effort: "medium",
    system: [{ text: assessSystem(scenario, learnerCharacterId, lang, kb.theories, kb.cases, goals), cache: true }],
    messages: [
      {
        role: "user",
        content: `TRANSCRIPT:\n${transcript}\n\nSimulation engine's objective tracking: ${JSON.stringify(input.objectiveDone ?? [])}; engine outcome: ${input.outcome ?? "n/a"} (verify against the transcript; you may disagree).\n\nProduce the assessment JSON. Write ratings, outcome, verdictEvidence, verdict, summary, strengths, weaknesses, alternatives, knowledge, reflectionQuestions, nextStep, deltas. Judge communication independently of the engine outcome.`,
      },
    ],
  });
  for await (const delta of run.deltas) { void delta; }
  if (run.refused()) throw new Error("The model declined this request.");
  const report = sanitizeReport(extractJSON<Partial<Report>>(run.text()), scenario, kb.theories, kb.cases, messages, goals, lang, input.objectiveDone);
  onDelta?.(JSON.stringify(report));
  return report;
}

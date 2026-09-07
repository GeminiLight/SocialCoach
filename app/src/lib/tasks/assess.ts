import { extractJSON, type LLM } from "@/lib/llm-core";
import { assessSystem, pick, transcriptBlock } from "@/lib/prompts";
import { retrieveKnowledge } from "@/lib/retrieval";
import type { Case, Scenario, Theory } from "@/data/corpus/types";
import type { Report } from "@/lib/types";
import { SKILLS, type SkillId } from "@/data/taxonomy";
import type { AssessInput } from "./types";

const skillIds = new Set(SKILLS.map((s) => s.id));

/** Clamp and validate whatever the model returned so the client can trust every field. */
const firstSentence = (s: string) => (s.match(/^[^。．.!?！？]{4,}[。．.!?！？]?/)?.[0] ?? s).trim();

export function sanitizeReport(raw: Partial<Report>, scenario: Scenario, theories: Theory[], cases: Case[]): Report {
  const stars = Math.max(0, Math.min(3, Math.round(Number(raw.stars) || 0))) as Report["stars"];
  const clean = <T extends { skill: string }>(arr: T[] | undefined) => (arr ?? []).filter((x) => x && skillIds.has(x.skill as SkillId));
  const tIds = new Set(theories.map((t) => t.id));
  const cIds = new Set(cases.map((c) => c.id));
  const knowledge = {
    theoryIds: (raw.knowledge?.theoryIds ?? []).filter((id) => tIds.has(id)).slice(0, 2),
    caseIds: (raw.knowledge?.caseIds ?? []).filter((id) => cIds.has(id)).slice(0, 2),
    whyThis: raw.knowledge?.whyThis ?? "",
  };
  if (!knowledge.theoryIds.length && theories[0]) knowledge.theoryIds = [theories[0].id];
  if (!knowledge.caseIds.length && cases[0]) knowledge.caseIds = [cases[0].id];
  const deltas: Report["deltas"] = {};
  for (const [k, v] of Object.entries(raw.deltas ?? {})) {
    if (!skillIds.has(k as SkillId)) continue;
    const n = Math.max(0, Math.min(0.5, Number(v) || 0));
    const direct = scenario.skills.includes(k as SkillId);
    deltas[k as SkillId] = +(direct ? n : Math.min(n, 0.2)).toFixed(2);
  }
  const outcome = raw.outcome === "success" || raw.outcome === "partial" || raw.outcome === "failure" ? raw.outcome : stars === 3 ? "success" : stars > 0 ? "partial" : "failure";
  return {
    stars,
    outcome,
    // The headline cannot be blank, so fall back to the summary's first
    // sentence: weaker than a real verdict, but never an empty first screen.
    verdict: (raw.verdict ?? "").trim() || firstSentence(raw.summary ?? ""),
    summary: raw.summary ?? "",
    strengths: clean(raw.strengths) as Report["strengths"],
    weaknesses: clean(raw.weaknesses) as Report["weaknesses"],
    alternatives: (raw.alternatives ?? []).filter((a) => a && a.better),
    knowledge,
    reflectionQuestions: (raw.reflectionQuestions ?? []).filter(Boolean).slice(0, 3),
    nextStep: raw.nextStep ?? "",
    deltas,
  };
}

/**
 * Diagnose the conversation. Streams the tutor's raw output so the caller can
 * render sections as they are written, then resolves with the sanitized report.
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
        content: `TRANSCRIPT:\n${transcript}\n\nSimulation engine's objective tracking: ${JSON.stringify(input.objectiveDone ?? [])}; engine outcome: ${input.outcome ?? "n/a"} (verify against the transcript; you may disagree).\n\nProduce the assessment JSON. Write the fields in this order so the reader can follow along: stars, outcome, summary, strengths, weaknesses, alternatives, knowledge, reflectionQuestions, nextStep, deltas.`,
      },
    ],
  });
  for await (const d of run.deltas) onDelta?.(d);
  if (run.refused()) throw new Error("The model declined this request.");
  return sanitizeReport(extractJSON<Partial<Report>>(run.text()), scenario, kb.theories, kb.cases);
}

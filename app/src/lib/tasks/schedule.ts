import { jsonCall, LLMError, type LLM } from "@/lib/llm-core";
import { adaptationSystem, pick, prescriptionSystem, profileBlock, scenarioBlock } from "@/lib/prompts";
import { matchesCore, retrieveScenario } from "@/lib/retrieval";
import { SKILLS, CONTEXTS } from "@/data/taxonomy";
import { fitRoles } from "./role-fit";
import { SCENARIOS, scenarioById } from "@/data/corpus";
import type { Scenario } from "@/data/corpus/types";
import type { Adaptation, Prescription, RetrievalTrace } from "@/lib/types";
import type { ScheduleInput, ScheduleOutput } from "./types";

/** Prescription → constrained retrieval → role adaptation. */
export async function runSchedule(input: ScheduleInput, llm: LLM, fastModel: string): Promise<ScheduleOutput> {
  const { profile, proficiency, history = [], lang } = input;

  let scenario: Scenario | undefined = input.scenario ?? (input.scenarioId ? scenarioById(input.scenarioId) : undefined);
  let prescription: Prescription | undefined;
  let retrieval: RetrievalTrace | undefined;
  const noMatch = { zh: "暂时没有同时匹配你目标、情境和角色的练习。可以调整偏好，或到「排练」描述自己的处境。", en: "No practice currently matches your goals, context and role. Adjust your preferences or describe your situation in Rehearse." };

  if (!scenario) {
    const hist = history.length
      ? history
          .slice(-12)
          .map((h) => `- ${new Date(h.at).toISOString().slice(0, 10)} "${h.title}" [${h.scenarioId}] skills=${h.skills.join(",")} context=${h.context} goalOutcome=${h.outcome ?? "n/a"} communicationRating=${h.scoringVersion === 2 ? h.stars ?? "unrated" : "unrated (legacy)"}`)
          .join("\n")
      : "(no practice yet — this is the learner's first session)";
    prescription = await jsonCall<Prescription>(
      {
        model: fastModel,
        thinking: false,
        maxTokens: 2500,
        system: prescriptionSystem(lang),
        user: `${profileBlock(profile, proficiency, lang)}\n\nPRACTICE HISTORY (oldest → newest):\n${hist}\n\nAvailable scenario ids: ${SCENARIOS.map((s) => s.id).join(", ")}\nProduce the prescription JSON.`,
      },
      llm,
    );
    // Model preferences never override the learner's explicit goals/context.
    if (!prescription || typeof prescription !== "object") throw new LLMError(pick(noMatch, lang), 502, true);
    prescription.query = typeof prescription.query === "string" ? prescription.query : "";
    prescription.rationale = typeof prescription.rationale === "string" ? prescription.rationale : "";
    const opt = prescription.optional_constraints;
    prescription.optional_constraints = {
      related_skills: Array.isArray(opt?.related_skills) ? opt.related_skills.filter((k) => SKILLS.some((s) => s.id === k)) : [],
      relationship_types: Array.isArray(opt?.relationship_types) ? opt.relationship_types.filter((r) => typeof r === "string") : [],
      difficulty: opt?.difficulty && [1, 2, 3].includes(opt.difficulty) ? opt.difficulty : undefined,
    };
    const goals = profile.goals.filter((k) => SKILLS.some((s) => s.id === k));
    const proposed = prescription?.core_constraints?.target_skills;
    const target = Array.isArray(proposed) ? proposed.filter((k) => goals.includes(k)) : [];
    prescription.core_constraints = {
      target_skills: target.length ? [...new Set(target)].slice(0, 2) : goals,
      contexts: profile.contexts.filter((k) => CONTEXTS.some((c) => c.id === k)),
    };
    if (!prescription.core_constraints.target_skills.length) throw new LLMError(pick(noMatch, lang), 422);
    const pool = SCENARIOS.filter((s) => matchesCore(s, prescription!));
    if (!pool.length) throw new LLMError(pick(noMatch, lang), 422);
    const fits = await fitRoles(pool, profile, lang, llm, fastModel);
    const preferred = fits.filter((f) => f.fit === "compatible");
    const eligible = preferred.length ? preferred : fits.filter((f) => f.fit === "uncertain");
    const allowed = new Set(eligible.map((f) => f.scenarioId));

    const exclude = new Set(history.slice(-6).map((h) => h.scenarioId));
    const r = retrieveScenario(prescription, exclude, pool.filter((s) => allowed.has(s.id)));
    if (!r.scenario) {
      throw new LLMError(pick(noMatch, lang), 422);
    } else {
      scenario = r.scenario;
      retrieval = r.trace;
      const fit = eligible.find((f) => f.scenarioId === scenario!.id)!;
      retrieval.roleFit = { characterId: fit.characterId, fit: fit.fit as "compatible" | "uncertain", reason: fit.reason };
    }
  }

  const playable = scenario.characters.filter((c) => c.playable);
  const playableIds = retrieval?.roleFit ? [retrieval.roleFit.characterId] : (playable.length ? playable : [scenario.characters[0]]).map((c) => c.id);
  const adaptation = await jsonCall<Adaptation>(
    {
      model: fastModel,
      thinking: false,
      maxTokens: 3000,
      system: adaptationSystem(lang),
      user: `${profileBlock(profile, proficiency, lang)}\n\n${scenarioBlock(scenario, lang, undefined, "learner")}\nPlayable character ids (the learner MUST be one of these): ${playableIds.join(", ")}\nRole fit: ${JSON.stringify(retrieval?.roleFit ?? "Learner explicitly selected this practice")}\n${prescription ? `Scheduler rationale: ${prescription.rationale}` : ""}\nProduce the adaptation JSON.`,
    },
    llm,
  );
  if (!playableIds.includes(adaptation.learnerCharacterId)) adaptation.learnerCharacterId = playableIds[0];
  if (!Array.isArray(adaptation.objectives) || adaptation.objectives.length !== scenario.objectives.length) {
    adaptation.objectives = scenario.objectives.map((o) => o[lang]);
  }

  return { scenario, prescription, adaptation, retrieval };
}

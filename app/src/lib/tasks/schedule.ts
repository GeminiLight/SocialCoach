import { jsonCall, type LLM } from "@/lib/llm-core";
import { adaptationSystem, prescriptionSystem, profileBlock, scenarioBlock } from "@/lib/prompts";
import { retrieveScenario } from "@/lib/retrieval";
import { SCENARIOS, scenarioById } from "@/data/corpus";
import type { Scenario } from "@/data/corpus/types";
import type { Adaptation, Prescription } from "@/lib/types";
import type { ScheduleInput, ScheduleOutput } from "./types";

/** Prescription → constrained retrieval → role adaptation. */
export async function runSchedule(input: ScheduleInput, llm: LLM, fastModel: string): Promise<ScheduleOutput> {
  const { profile, proficiency, history = [], lang } = input;

  let scenario: Scenario | undefined = input.scenario ?? (input.scenarioId ? scenarioById(input.scenarioId) : undefined);
  let prescription: Prescription | undefined;
  let retrieval;

  if (!scenario) {
    const hist = history.length
      ? history
          .slice(-12)
          .map((h) => `- ${new Date(h.at).toISOString().slice(0, 10)} "${h.title}" [${h.scenarioId}] skills=${h.skills.join(",")} context=${h.context} outcome=${h.outcome ?? "n/a"} stars=${h.stars ?? "n/a"}`)
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
    // sanitize skills to taxonomy
    prescription.core_constraints.target_skills = (prescription.core_constraints.target_skills ?? []).filter((k) => profile.goals.includes(k) || true);
    if (!prescription.core_constraints.target_skills.length) prescription.core_constraints.target_skills = [profile.goals[0]];

    const exclude = new Set(history.slice(-6).map((h) => h.scenarioId));
    const r = retrieveScenario(prescription, exclude);
    if (!r.scenario) {
      // Core constraint failure: fall back to any scenario matching a goal skill (explicit, recorded).
      const fb = SCENARIOS.filter((s) => s.skills.some((k) => profile.goals.includes(k)) && !exclude.has(s.id));
      scenario = fb[Math.floor(Math.random() * fb.length)] ?? SCENARIOS[0];
      retrieval = { relaxed: ["core_constraints_fallback"], candidates: fb.length, chosen: scenario.id };
    } else {
      scenario = r.scenario;
      retrieval = r.trace;
    }
  }

  const playable = scenario.characters.filter((c) => c.playable);
  const playableIds = (playable.length ? playable : [scenario.characters[0]]).map((c) => c.id);
  const adaptation = await jsonCall<Adaptation>(
    {
      model: fastModel,
      thinking: false,
      maxTokens: 3000,
      system: adaptationSystem(lang),
      user: `${profileBlock(profile, proficiency, lang)}\n\n${scenarioBlock(scenario, lang)}\nPlayable character ids (the learner MUST be one of these): ${playableIds.join(", ")}\n${prescription ? `Scheduler rationale: ${prescription.rationale}` : ""}\nProduce the adaptation JSON.`,
    },
    llm,
  );
  if (!playableIds.includes(adaptation.learnerCharacterId)) adaptation.learnerCharacterId = playableIds[0];
  if (!Array.isArray(adaptation.objectives) || adaptation.objectives.length !== scenario.objectives.length) {
    adaptation.objectives = scenario.objectives.map((o) => o[lang]);
  }

  return { scenario, prescription, adaptation, retrieval };
}

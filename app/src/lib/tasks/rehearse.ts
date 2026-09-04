import { jsonCall, LLMError, type LLM } from "@/lib/llm-core";
import { rehearseSystem } from "@/lib/prompts";
import type { Scenario } from "@/data/corpus/types";
import { CONTEXTS, SKILLS, COMPETENCIES, type CompetencyId, type ContextId, type SkillId, skillById } from "@/data/taxonomy";
import { isScenarioIcon } from "@/data/scenario-icons";
import type { RehearseInput } from "./types";

/** Turn a situation in the learner's own words into a fully tagged scenario. */
export async function runRehearse(input: RehearseInput, llm: LLM, fastModel: string): Promise<{ scenario: Scenario }> {
  const { description, lang, profile } = input;
  if (!description || description.trim().length < 8) throw new LLMError("Please describe the situation in a bit more detail.", 400);

  const raw = await jsonCall<Omit<Scenario, "id" | "source" | "custom">>({
    model: fastModel,
    thinking: false,
    maxTokens: 6000,
    system: rehearseSystem(lang),
    user: `LEARNER: ${profile?.name || "(anonymous)"}; about: ${profile?.bio || "(n/a)"}; target skills: ${(profile?.goals ?? []).join(", ") || "(n/a)"}\n\nSITUATION (in the learner's words):\n"""${description.trim()}"""\n\nProduce the scenario JSON.`,
  }, llm);

  const skillIds = new Set(SKILLS.map((s) => s.id));
  const ctxIds = new Set(CONTEXTS.map((c) => c.id));
  const compIds = new Set(COMPETENCIES.map((c) => c.id));
  const skills = (raw.skills ?? []).filter((k) => skillIds.has(k)) as SkillId[];
  if (!skills.length) skills.push("communication");
  const competencies = Array.from(new Set([...(raw.competencies ?? []).filter((c) => compIds.has(c)), ...skills.map((k) => skillById(k).competency)])) as CompetencyId[];
  const context = (ctxIds.has(raw.context) ? raw.context : "workplace") as ContextId;
  const junk = /占位|placeholder|未使用|unused|n\/a|none/i;
  const characters = (raw.characters ?? [])
    .filter((c) => c && (c.id === "you" || !(junk.test(`${c.name?.zh ?? ""} ${c.name?.en ?? ""} ${c.role?.zh ?? ""} ${c.role?.en ?? ""}`) || (!c.personality?.zh && !c.personality?.en))))
    .map((c, i) => ({ ...c, id: c.id || `c${i}`, hue: typeof c.hue === "number" ? c.hue : (i * 97) % 360 }));
  if (!characters.some((c) => c.id === "you")) characters.unshift({ id: "you", name: { zh: "你", en: "You" }, role: { zh: "你自己", en: "Yourself" }, personality: { zh: "", en: "" }, stance: { zh: "", en: "" }, playable: true, hue: 40 });
  const npc = characters.find((c) => c.id !== "you");
  // Mirror the single generated language into the other key so every L field is complete.
  const mirror = (o: unknown): unknown => {
    if (Array.isArray(o)) return o.map(mirror);
    if (o && typeof o === "object") {
      const rec = o as Record<string, unknown>;
      if ("zh" in rec && "en" in rec && Object.keys(rec).length === 2) {
        const zh = String(rec.zh ?? "");
        const en = String(rec.en ?? "");
        return { zh: zh || en, en: en || zh };
      }
      return Object.fromEntries(Object.entries(rec).map(([k, v]) => [k, mirror(v)]));
    }
    return o;
  };
  const mirrored = mirror({ ...raw, characters }) as typeof raw & { characters: typeof characters };
  const scenario: Scenario = {
    ...mirrored,
    id: `custom-${Date.now().toString(36)}`,
    skills,
    competencies,
    context,
    characters: mirrored.characters,
    difficulty: ([1, 2, 3].includes(raw.difficulty) ? raw.difficulty : 2) as 1 | 2 | 3,
    minutes: raw.minutes || 4,
    maxTurns: Math.max(6, Math.min(10, raw.maxTurns || 8)),
    relationship: raw.relationship?.length ? raw.relationship : ["peer"],
    opening: mirrored.opening?.characterId && characters.some((c) => c.id === mirrored.opening.characterId) ? mirrored.opening : { characterId: npc?.id ?? "npc", text: mirrored.opening?.text ?? { zh: "……", en: "..." } },
    keywords: raw.keywords ?? [],
    // the model picks from the allow-list; anything else falls back to the
    // context default in `scenarioIconName`, so a bad name can never render.
    icon: isScenarioIcon(raw.icon) ? raw.icon : undefined,
    source: "Learner-described situation (generated)",
    custom: true,
  };
  return { scenario };
}

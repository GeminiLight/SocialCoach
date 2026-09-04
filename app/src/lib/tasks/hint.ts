import type { LLM } from "@/lib/llm-core";
import { hintSystem, pick, transcriptBlock } from "@/lib/prompts";
import type { TurnInput } from "./types";

/** One short nudge for the learner, mid-conversation. */
export async function runHint(input: TurnInput, llm: LLM, fastModel: string): Promise<{ hint: string }> {
  const { scenario, learnerCharacterId, messages, lang } = input;
  const name = input.learnerName || pick(scenario.characters.find((c) => c.id === learnerCharacterId)!.name, lang);
  const hint = (
    await llm.chatText({
      model: fastModel,
      maxTokens: 800,
      thinking: false,
      system: hintSystem(scenario, learnerCharacterId, lang),
      messages: [{ role: "user", content: `TRANSCRIPT SO FAR:\n${transcriptBlock(messages, scenario, lang, name)}\n\nGive the hint.` }],
    })
  ).trim();
  return { hint };
}

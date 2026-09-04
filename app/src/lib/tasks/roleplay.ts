import type { LLM } from "@/lib/llm-core";
import { pick, roleplaySystem } from "@/lib/prompts";
import type { TurnInput } from "./types";

/**
 * One exchange of the simulation. Streams the role-play protocol
 * (`@@<characterId>` blocks plus a trailing `@@meta`) and resolves with the
 * full text; the caller parses it with `parseRoleplay`.
 */
export async function runRoleplay(input: TurnInput, llm: LLM, fastModel: string, onDelta?: (d: string) => void): Promise<string> {
  const { scenario, learnerCharacterId, messages, lang } = input;
  const learnerName = input.learnerName || pick(scenario.characters.find((c) => c.id === learnerCharacterId)!.name, lang);

  // Rebuild the conversation as alternating turns. NPC turns are re-serialized in the protocol so the model stays in format.
  const turns: { role: "user" | "assistant"; content: string }[] = [];
  let learnerTurns = 0;
  const npcBuf: string[] = [];
  const flushNpc = () => {
    if (npcBuf.length) {
      turns.push({ role: "assistant", content: npcBuf.join("\n") });
      npcBuf.length = 0;
    }
  };
  for (const m of messages) {
    if (m.role === "coach") continue;
    if (m.role === "npc") {
      npcBuf.push(`@@${m.characterId}\n${m.text}`);
    } else {
      flushNpc();
      learnerTurns++;
      turns.push({ role: "user", content: m.text });
    }
  }
  flushNpc();
  // The opening line is an assistant turn before any user turn; the API requires the first message be from the user.
  if (turns[0]?.role === "assistant") turns.unshift({ role: "user", content: "(The scene begins.)" });
  if (turns[turns.length - 1]?.role !== "user") turns.push({ role: "user", content: "(…)" });

  const remaining = Math.max(0, scenario.maxTurns - learnerTurns);
  const run = llm.chatStream({
    model: fastModel,
    maxTokens: 1800,
    thinking: false,
    system: [
      { text: roleplaySystem(scenario, learnerCharacterId, lang, learnerName), cache: true },
      { text: `Learner turns used: ${learnerTurns}/${scenario.maxTurns} (${remaining} remaining${remaining === 0 ? " — this is the final exchange, close the scene" : ""}).` },
    ],
    messages: turns,
  });
  for await (const d of run.deltas) onDelta?.(d);
  return run.text();
}

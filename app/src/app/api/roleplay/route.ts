import { client, FAST_MODEL } from "@/lib/llm";
import { roleplaySystem, pick } from "@/lib/prompts";
import type { Scenario } from "@/data/corpus/types";
import type { ChatMessage } from "@/lib/types";
import { asLang, fail, textStream } from "@/lib/api-utils";
import type Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

interface Body {
  scenario: Scenario;
  learnerCharacterId: string;
  messages: ChatMessage[];
  lang: string;
  learnerName?: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const lang = asLang(body.lang);
    const { scenario, learnerCharacterId, messages } = body;
    const learnerName = body.learnerName || pick(scenario.characters.find((c) => c.id === learnerCharacterId)!.name, lang);

    // Rebuild the conversation as alternating turns. NPC turns are re-serialized in the protocol so the model stays in format.
    const turns: Anthropic.MessageParam[] = [];
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
    const sys = roleplaySystem(scenario, learnerCharacterId, lang, learnerName);
    const stream = client().messages.stream({
      model: FAST_MODEL,
      max_tokens: 700,
      thinking: { type: "disabled" },
      system: [
        { type: "text", text: sys, cache_control: { type: "ephemeral" } },
        { type: "text", text: `Learner turns used: ${learnerTurns}/${scenario.maxTurns} (${remaining} remaining${remaining === 0 ? " — this is the final exchange, close the scene" : ""}).` },
      ],
      messages: turns,
    });
    return textStream(stream);
  } catch (e) {
    return fail(e);
  }
}

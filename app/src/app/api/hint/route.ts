import { NextResponse } from "next/server";
import { client, FAST_MODEL } from "@/lib/llm";
import { hintSystem, transcriptBlock, pick } from "@/lib/prompts";
import type { Scenario } from "@/data/corpus/types";
import type { ChatMessage } from "@/lib/types";
import { asLang, fail } from "@/lib/api-utils";
import type Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { scenario, learnerCharacterId, messages, lang: l, learnerName } = (await req.json()) as {
      scenario: Scenario; learnerCharacterId: string; messages: ChatMessage[]; lang: string; learnerName?: string;
    };
    const lang = asLang(l);
    const name = learnerName || pick(scenario.characters.find((c) => c.id === learnerCharacterId)!.name, lang);
    const res = await client().messages.create({
      model: FAST_MODEL,
      max_tokens: 200,
      thinking: { type: "disabled" },
      system: hintSystem(scenario, learnerCharacterId, lang),
      messages: [{ role: "user", content: `TRANSCRIPT SO FAR:\n${transcriptBlock(messages, scenario, lang, name)}\n\nGive the hint.` }],
    });
    const hint = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("").trim();
    return NextResponse.json({ hint });
  } catch (e) {
    return fail(e);
  }
}

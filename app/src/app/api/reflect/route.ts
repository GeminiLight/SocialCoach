import { client, FAST_MODEL } from "@/lib/llm";
import { reflectSystem } from "@/lib/prompts";
import type { Scenario } from "@/data/corpus/types";
import { asLang, fail, textStream } from "@/lib/api-utils";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { scenario, question, answer, lang: l, summary } = (await req.json()) as {
      scenario: Scenario; question: string; answer: string; lang: string; summary?: string;
    };
    const lang = asLang(l);
    const stream = client().messages.stream({
      model: FAST_MODEL,
      max_tokens: 400,
      thinking: { type: "disabled" },
      system: reflectSystem(scenario, lang),
      messages: [{ role: "user", content: `Coach's earlier summary of the practice: ${summary ?? "(n/a)"}\n\nReflection question: ${question}\nLearner's answer: ${answer}` }],
    });
    return textStream(stream);
  } catch (e) {
    return fail(e);
  }
}

import type { LLM } from "@/lib/llm-core";
import { reflectSystem } from "@/lib/prompts";
import type { ReflectInput } from "./types";

/** The coach's reply to a reflection answer. Streams; resolves with the full text. */
export async function runReflect(input: ReflectInput, llm: LLM, fastModel: string, onDelta?: (d: string) => void): Promise<string> {
  const { scenario, question, answer, lang, summary } = input;
  const run = llm.chatStream({
    model: fastModel,
    maxTokens: 1200,
    thinking: false,
    system: reflectSystem(scenario, lang),
    messages: [{ role: "user", content: `Coach's earlier summary of the practice: ${summary ?? "(n/a)"}\n\nReflection question: ${question}\nLearner's answer: ${answer}` }],
  });
  for await (const d of run.deltas) onDelta?.(d);
  return run.text();
}

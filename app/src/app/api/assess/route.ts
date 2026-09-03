import { client, extractJSON, SMART_MODEL, toHttpError } from "@/lib/llm";
import { assessSystem, transcriptBlock, pick } from "@/lib/prompts";
import { retrieveKnowledge } from "@/lib/retrieval";
import type { Case, Scenario, Theory } from "@/data/corpus/types";
import type { ChatMessage, Report } from "@/lib/types";
import type { SkillId } from "@/data/taxonomy";
import { SKILLS } from "@/data/taxonomy";
import { asLang, fail } from "@/lib/api-utils";

export const maxDuration = 180;

interface Body {
  scenario: Scenario;
  learnerCharacterId: string;
  messages: ChatMessage[];
  lang: string;
  goals: SkillId[];
  learnerName?: string;
  objectiveDone?: boolean[];
  outcome?: string;
}

const skillIds = new Set(SKILLS.map((s) => s.id));

/** Clamp and validate whatever the model returned so the client can trust every field. */
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
 * Streams the tutor's raw output so the client can render sections as they are written,
 * then appends "\n@@final\n<sanitized report json>" as the authoritative result.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const lang = asLang(body.lang);
    const { scenario, learnerCharacterId, messages, goals } = body;
    const name = body.learnerName || pick(scenario.characters.find((c) => c.id === learnerCharacterId)!.name, lang);
    const transcript = transcriptBlock(messages, scenario, lang, name);
    const learnerText = messages.filter((m) => m.role === "learner").map((m) => m.text).join(" ");

    const kb = retrieveKnowledge({
      skills: [...scenario.skills, ...(scenario.relatedSkills ?? []), ...goals],
      context: scenario.context,
      query: `${scenario.keywords.join(" ")} ${learnerText.slice(0, 400)}`,
      acquisition: true,
      performance: true,
    });

    const stream = client().messages.stream({
      model: SMART_MODEL,
      max_tokens: 6000,
      output_config: { effort: "medium" },
      system: [{ type: "text", text: assessSystem(scenario, learnerCharacterId, lang, kb.theories, kb.cases, goals), cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: `TRANSCRIPT:\n${transcript}\n\nSimulation engine's objective tracking: ${JSON.stringify(body.objectiveDone ?? [])}; engine outcome: ${body.outcome ?? "n/a"} (verify against the transcript; you may disagree).\n\nProduce the assessment JSON. Write the fields in this order so the reader can follow along: stars, outcome, summary, strengths, weaknesses, alternatives, knowledge, reflectionQuestions, nextStep, deltas.`,
        },
      ],
    });

    const enc = new TextEncoder();
    const rs = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const ev of stream) {
            if (ev.type === "content_block_delta" && ev.delta.type === "text_delta" && ev.delta.text) controller.enqueue(enc.encode(ev.delta.text));
          }
          const final = await stream.finalMessage();
          if (final.stop_reason === "refusal") throw new Error("The model declined this request.");
          const text = final.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("\n");
          const report = sanitizeReport(extractJSON<Partial<Report>>(text), scenario, kb.theories, kb.cases);
          controller.enqueue(enc.encode(`\n@@final\n${JSON.stringify(report)}`));
        } catch (e) {
          controller.enqueue(enc.encode(`\n@@error\n${toHttpError(e).message}`));
        } finally {
          controller.close();
        }
      },
    });
    return new Response(rs, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
  } catch (e) {
    return fail(e);
  }
}

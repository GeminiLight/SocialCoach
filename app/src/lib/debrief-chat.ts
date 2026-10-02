import { z } from "zod";
import { pick } from "./i18n";
import type { Lang } from "@/data/taxonomy";
import type { Session } from "./types";

export const DEBRIEF_QUESTION_LIMIT = 1000;
export const DEBRIEF_HISTORY_LIMIT = 6;
const text = (max: number) => z.string().max(max);
const evidenceItem = z.object({ evidence: text(4000), behavior: text(2000) });

/** A deliberately public view. No NPC hidden/personality/stance or scoring fields. */
export const debriefInputSchema = z.object({
  lang: z.enum(["zh", "en"]),
  practice: z.object({ title: text(1000), background: text(8000), roles: z.array(z.object({ name: text(200), role: text(500), learner: z.boolean() })).max(12) }),
  transcript: z.array(z.object({ role: z.enum(["learner", "npc"]), name: text(200), text: text(8000) })).max(100),
  report: z.object({
    verdict: text(2000), summary: text(6000), nextStep: text(2000),
    strengths: z.array(evidenceItem).max(20), weaknesses: z.array(evidenceItem.extend({ whyItMatters: text(2000) })).max(20),
    alternatives: z.array(z.object({ original: text(4000), better: text(4000), why: text(2000) })).max(20),
    knowledge: z.object({ theoryIds: z.array(text(100)).max(10), caseIds: z.array(text(100)).max(10) }),
  }),
  history: z.array(z.object({ question: text(1000), answer: text(5500) })).max(DEBRIEF_HISTORY_LIMIT),
  question: z.string().trim().min(1).max(DEBRIEF_QUESTION_LIMIT),
});
export type DebriefChatInput = z.infer<typeof debriefInputSchema>;

export function buildDebriefInput(session: Session, question: string, lang: Lang): DebriefChatInput {
  const s = session.scenario;
  const report = session.report!;
  return {
    lang, question,
    practice: { title: pick(s.title, lang), background: pick(s.background, lang), roles: s.characters.map(c => ({ name: pick(c.name, lang), role: pick(c.role, lang), learner: c.id === session.learnerCharacterId })) },
    transcript: session.messages.filter(m => m.role === "learner" || m.role === "npc").map(m => ({
      role: m.role as "learner" | "npc", name: pick(s.characters.find(c => c.id === (m.role === "learner" ? session.learnerCharacterId : m.characterId))?.name ?? { zh: "对方", en: "Other person" }, lang), text: m.text,
    })),
    report: { verdict: report.verdict, summary: report.summary, nextStep: report.nextStep, strengths: report.strengths.map(({ evidence, behavior }) => ({ evidence, behavior })), weaknesses: report.weaknesses.map(({ evidence, behavior, whyItMatters }) => ({ evidence, behavior, whyItMatters })), alternatives: report.alternatives, knowledge: { theoryIds: report.knowledge.theoryIds, caseIds: report.knowledge.caseIds } },
    history: (session.debriefChat ?? []).slice(-DEBRIEF_HISTORY_LIMIT).map(e => ({ question: e.question, answer: [e.reply.evidence, e.reply.answer, e.reply.example].filter(Boolean).join("\n") })),
  };
}

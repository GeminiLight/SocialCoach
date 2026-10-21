import {tokenize} from "../retrieval";
import { z } from "zod";
import { THEORIES, CASES } from "@/data/corpus";
import type { Theory, Case } from "@/data/corpus/types";
import { jsonCall, LLMError, type LLM } from "@/lib/llm-core";
import { debriefInputSchema, type DebriefChatInput } from "@/lib/debrief-chat";
import { hasQuote } from "@/lib/practice-policy";
import { pick } from "@/lib/i18n";
import type { DebriefReply } from "@/lib/types";
import {validateSceneContext} from '../scene-context';
import {checkDebriefReply,proposedDialogueInAnswer} from './debrief-check';
import {knowledgeContext} from '../knowledge-context';
import {debriefSystem} from './debrief-prompt';
import {TASK_LIMITS} from '../task-runtime';

const replySchema = z.object({
  evidence: z.string().trim().max(600),
  // Providers sometimes split a short answer into four paragraphs. The public
  // contract is bounded text; harmless paragraph boundaries must not reject it.
  answer: z.union([z.string().trim().min(1), z.array(z.string().trim().min(1).max(1200)).min(1).max(12).transform(parts => parts.join("\n\n"))]).pipe(z.string().max(3600)),
  example: z.union([z.string().trim(),z.array(z.string().trim().max(1200)).max(4).transform(parts=>parts.join("\n\n"))]).pipe(z.string().max(1200)).default(""),
  sources: z.array(z.object({ kind: z.enum(["theory", "case"]), id: z.string().max(100) })).max(4),
});

/** Match bilingual concept names as well as English keywords, including Chinese questions without spaces. */
export function debriefKnowledge(input: DebriefChatInput): { theories: Theory[]; cases: Case[] } {
  const previous = input.history.at(-1);
  const query = `${previous?.question ?? ""} ${previous?.answer.slice(0, 600) ?? ""} ${input.question}`.toLowerCase();
  const tokens=new Set(tokenize(query));
  const rank = <T extends Theory | Case>(pool: T[], ids: string[], limit: number): T[] => {
    const reportItems = ids.map(id => pool.find(item => item.id === id)).filter((item): item is T => !!item).slice(0, limit / 2);
    const ranked = pool.map(item => {
    const title = `${item.title.zh} ${item.title.en}`.toLowerCase();
    const keywords = item.keywords.join(" ").toLowerCase();
    let score = ids.includes(item.id) ? 2 : 0;
    for (const token of tokens) if (title.includes(token)) score += 4; else if (keywords.includes(token)) score += 1;
    return { item, score };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).map(x => x.item);
    return [...reportItems, ...ranked.filter(item => !reportItems.some(r => r.id === item.id))].slice(0, limit);
  };
  return { theories: rank(THEORIES, input.report.knowledge.theoryIds, 4), cases: rank(CASES, input.report.knowledge.caseIds, 2) };
}

export async function runDebriefChat(raw: DebriefChatInput, llm: LLM, model: string,signal?:AbortSignal,evidenceTexts?:string[]): Promise<DebriefReply> {
  const parsed = debriefInputSchema.safeParse(raw);
  const lang = raw?.lang === "en" ? "en" : "zh";
  if (!parsed.success) throw new LLMError(pick({ zh: "复盘问题或练习资料不完整，请检查后重试。", en: "The question or practice context is invalid. Check it and try again." }, lang), 400);
  const input = parsed.data;
  if(input.sceneContext){try{validateSceneContext(input.sceneContext,input.transcript.map((m,i)=>({id:String(i),role:m.role,text:m.text,ts:0})));}catch{throw new LLMError(pick({zh:'现场记录与原话不一致，请重新打开复盘。',en:'The scene record does not match the transcript. Please reopen the debrief.'},lang),400);}}
  const kb = debriefKnowledge(input);
  const knowledge = knowledgeContext(kb,lang);
  const options = {
    signal,model, maxTokens: 2400, thinking: false,
    system: debriefSystem(lang,!!input.sceneContext,!!evidenceTexts),
    user: JSON.stringify({ ...input, knowledge,...(evidenceTexts?{requiredEvidenceTexts:evidenceTexts}: {}) }),
  };
  const invalid = () => new LLMError(pick({ zh: "这次回答的原话或来源未能核实，请再试一次。", en: "The reply’s quotation or sources could not be verified. Please try again." }, lang));
  const spoken = evidenceTexts??input.transcript.filter(m => m.role === "learner").map(m => m.text).filter(t => t.trim());
  const allowed = new Set(knowledge.map(k => `${k.kind}:${k.id}`));
  let correction = "";
  const maxCalls=TASK_LIMITS[evidenceTexts?'reflect':'debrief-chat'][1];
  let calls=0;
  // A new draft always needs room for its independent final check. Format
  // failures can use an otherwise idle slot, but nested retries cannot create
  // a draft that the task has no budget left to verify.
  while(calls+2<=maxCalls) {
    signal?.throwIfAborted();
    const problems: string[] = [];
    let result: unknown;
    try {
      calls++;
      result = await jsonCall<unknown>({ ...options, user: options.user + correction }, llm, 1);
    } catch (error) {
      // Only malformed output consumes the one task-owned repair. Transport,
      // quota and cancellation errors must remain actionable, not regenerate.
      if(signal?.aborted)throw error;
      if(!(error instanceof SyntaxError || error instanceof LLMError && error.retryable))throw error;
      problems.push('The response was not usable JSON. Return one complete JSON object.');
    }
    const reply = replySchema.safeParse(result);
    if (!reply.success) problems.push(...reply.error.issues.map(i => `${i.path.join(".")}: ${i.message}`));
    else {
      if (spoken.length ? !hasQuote(reply.data.evidence, spoken) : !!reply.data.evidence) problems.push("evidence is not an exact learner quote (or should be empty when there are no learner words)");
      if (reply.data.sources.some(s => !allowed.has(`${s.kind}:${s.id}`))) problems.push("sources contain an ID or kind outside the supplied knowledge");
      if(proposedDialogueInAnswer(input,reply.data))problems.push('answer contains explicitly proposed new quoted dialogue. Move all proposed wording to example; answer must explain without composing new lines.');
      if (!problems.length) {
        let check;
        try{calls++;check=await checkDebriefReply(input,reply.data,knowledge,llm,model,signal);}catch(error){
          if(signal?.aborted||error instanceof LLMError)throw error;
          throw invalid();
        }
        if(check.approved)return { ...reply.data, sources: reply.data.sources.filter((s, i, all) => all.findIndex(x => x.id === s.id && x.kind === s.kind) === i) };
        problems.push(...check.issues);
      }
    }
    correction = `\nA previous attempt failed validation: ${problems.join("; ")}. Regenerate the complete reply with the original context, correcting every listed problem. Keep answer to at most two short explanatory paragraphs, without any proposed dialogue or new commitment. Put proposed wording only in example${evidenceTexts?', which must remain empty for this reflection response':''}. For evidence, copy a short contiguous portion EXACTLY from a learner transcript entry. Use only the supplied knowledge kind/id pairs. Do not repeat or assume any content of the failed reply.`;
  }
  throw invalid();
}

import { z } from "zod";
import { extractJSON, LLMError } from "./llm-core";
import { parsePartialJSON } from "./partial-json";
import type { Scenario } from "@/data/corpus/types";
import type { Lang } from "@/data/taxonomy";
import { pick } from './i18n';
import type {ChatMessage} from "./types";
import {hasQuote,goalOutcome} from "./practice-policy";
import type { SpeechGuard } from './roleplay-facts';

export class RoleplayFactError extends LLMError {
 constructor(readonly correction:string,lang:Lang){
  super(pick({zh:'这一句把未确认的安排当成了约定，你的话已保留，请重试。',en:'That reply treated an unconfirmed arrangement as agreed. Your words are saved; please retry.'},lang),502);
 }
}

function completeObject(raw: string) {
  const start = raw.indexOf("{");
  if (start < 0) return false;
  let depth = 0, quoted = false, escaped = false;
  for (const ch of raw.slice(start)) {
    if (quoted) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') quoted = false;
    } else if (ch === '"') quoted = true;
    else if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") { if (--depth === 0) return true; }
  }
  return false;
}

/** Validate one JSON reply, then retain the public text-stream protocol. */
export function roleplayOutput(scenario: Scenario, learnerId: string, lang: Lang,guard?:SpeechGuard,history:ChatMessage[]=[]) {
  const cast = scenario.characters.filter((c) => c.id !== learnerId);
  const ids = cast.map((c) => c.id);
  // A captured model draft used "characterId":"lead":"沈星". Remove ONLY
  // a redundant name matching that exact cast ID. No speaker aliasing or text rewrite.
  const normalizeCastName = (raw: string) => raw.replace(
    /("characterId"\s*:\s*("(?:[^"\\]|\\.)*"))\s*:\s*("(?:[^"\\]|\\.)*")(?=\s*[,}])/gu,
    (match, field: string, encodedId: string, encodedName: string) => {
      try {
        const character = cast.find(c => c.id === JSON.parse(encodedId));
        const name = JSON.parse(encodedName);
        return character && (name === character.name.zh || name === character.name.en) ? field : match;
      } catch { return match; }
    },
  );
  const meta = z.object({
    objectiveEvidence:z.array(z.object({index:z.number().int().min(0).max(scenario.objectives.length-1),learnerQuote:z.string().min(1).max(1200),npcQuote:z.string().max(1200).optional()})).max(scenario.objectives.length).optional(),
    objectives: z.array(z.boolean()).length(scenario.objectives.length), ended: z.boolean(),
    stance: z.number().int().min(0).max(100), revealed: z.boolean(),
    disclosures:z.array(z.object({characterId:z.string(),quote:z.string().min(1).max(2000)})).max(cast.length).optional(), note: z.string().max(300).optional(),
    outcome: z.enum(["success", "partial", "failure"]).nullable().optional(),
    closure: z.object({ kind: z.enum(["agreement", "boundary", "deferred", "withdrawal"]), learnerQuote: z.string().optional(), npcQuote: z.string().min(1) }).optional(),
  });
  const utterance = z.object({ characterId: z.string().refine((id) => ids.includes(id)), text: z.string().min(1) });
  const schema = z.object({ meta, utterances: z.array(utterance).min(1).max(2) });
  const failure = () => new LLMError(lang === "zh" ? "这次回复的场景信息不完整，你的话已保留，请重试。" : "This reply has incomplete scene information. Your words are saved; please retry.", 502);
  type Reply = z.infer<typeof schema>;
  const serialize = (r: Reply) => `@@meta\n${JSON.stringify(r.meta)}\n${r.utterances.map((u) => `@@${u.characterId}\n${u.text}`).join("\n")}`;
  const checked=(raw:string)=>{
    if (!completeObject(raw)) throw failure();
    let value: unknown;
    try { value = extractJSON<unknown>(normalizeCastName(raw)); } catch { throw failure(); }
    const result = schema.safeParse(value);
    if (!result.success) throw failure();
    if (result.data.utterances.some((u) => /^@@/mu.test(u.text))) throw failure();
    const reason=guard?.(result.data.utterances);
    if(reason)throw new RoleplayFactError(reason,lang);
    const learnerWords=history.filter(m=>m.role==='learner').map(m=>m.text);
    const npcWords=[...history.filter(m=>m.role==='npc').map(m=>m.text),...result.data.utterances.map(u=>u.text)];
    result.data.meta.objectiveEvidence=(result.data.meta.objectiveEvidence??[]).filter(e=>hasQuote(e.learnerQuote,learnerWords)&&(!e.npcQuote||hasQuote(e.npcQuote,npcWords)));
    result.data.meta.objectives=result.data.meta.objectives.map((v,i)=>v&&result.data.meta.objectiveEvidence!.some(e=>e.index===i));
    if(result.data.meta.outcome&&result.data.meta.outcome!==goalOutcome(result.data.meta.objectives))result.data.meta.outcome=null;
    result.data.meta.disclosures=(result.data.meta.disclosures??[]).filter(d=>cast.some(c=>c.id===d.characterId&&c.hidden)&&result.data.utterances.some(u=>u.characterId===d.characterId&&u.text.includes(d.quote)));
    result.data.meta.revealed=result.data.meta.disclosures.length>0;
    return result.data;
  };
  return {
    preview(raw: string): string {
      // Only guarded exchanges wait for a complete validated line. A bad claim
      // must not flash onscreen and then change during the existing repair.
      if(guard){if(!completeObject(raw))return '';try{return serialize(checked(raw));}catch{return '';}}
      // Check the actual end of meta: some models reorder the two keys.
      // Required fields alone are insufficient while a note is still arriving.
      const marker = /"meta"\s*:\s*\{/u.exec(raw);
      if (!marker || !completeObject(raw.slice(marker.index + marker[0].length - 1))) return "";
      const part = parsePartialJSON<Reply>(normalizeCastName(raw));
      const checkedMeta = meta.safeParse(part?.meta);
      if (!checkedMeta.success) return "";
      const lines = (Array.isArray(part?.utterances) ? part.utterances : []).flatMap((u) => {
        const result = utterance.safeParse(u);
        return result.success ? [result.data] : [];
      }).slice(0, 2);
      const learnerWords=history.filter(m=>m.role==='learner').map(m=>m.text),npcWords=history.filter(m=>m.role==='npc').map(m=>m.text);
      const proof=(checkedMeta.data.objectiveEvidence??[]).filter(e=>hasQuote(e.learnerQuote,learnerWords)&&(!e.npcQuote||hasQuote(e.npcQuote,npcWords)));
      // New public proof needs the completed spoken line. This prevents a
      // provisional claim from flashing before the supporting words exist.
      if(checkedMeta.data.disclosures?.length||(checkedMeta.data.objectiveEvidence??[]).some(e=>e.npcQuote&&!hasQuote(e.npcQuote,npcWords))){if(!completeObject(raw))return '';try{return serialize(checked(raw));}catch{return '';}}
      const previewMeta={...checkedMeta.data,objectiveEvidence:proof,objectives:checkedMeta.data.objectives.map((v,i)=>v&&proof.some(e=>e.index===i)),disclosures:[],revealed:false};
      if(previewMeta.outcome&&previewMeta.outcome!==goalOutcome(previewMeta.objectives))previewMeta.outcome=null;
      return lines.length ? serialize({meta:previewMeta,utterances:lines}) : '';
    },
    complete(raw: string): string {
      // extractJSON can repair a truncated tail for coach notes. A spoken
      // exchange must actually finish before it becomes durable evidence.
      return serialize(checked(raw));
    },
  };
}

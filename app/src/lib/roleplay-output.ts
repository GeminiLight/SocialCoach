import { z } from "zod";
import { extractJSON, LLMError } from "./llm-core";
import { parsePartialJSON } from "./partial-json";
import type { Scenario } from "@/data/corpus/types";
import type { Lang } from "@/data/taxonomy";
import { pick } from './i18n';
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
export function roleplayOutput(scenario: Scenario, learnerId: string, lang: Lang,guard?:SpeechGuard) {
  const ids = scenario.characters.filter((c) => c.id !== learnerId).map((c) => c.id);
  const meta = z.object({
    objectives: z.array(z.boolean()).length(scenario.objectives.length), ended: z.boolean(),
    stance: z.number().int().min(0).max(100), revealed: z.boolean(), note: z.string().max(300).optional(),
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
    try { value = extractJSON<unknown>(raw); } catch { throw failure(); }
    const result = schema.safeParse(value);
    if (!result.success) throw failure();
    if (result.data.utterances.some((u) => /^@@/mu.test(u.text))) throw failure();
    const reason=guard?.(result.data.utterances);
    if(reason)throw new RoleplayFactError(reason,lang);
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
      const part = parsePartialJSON<Reply>(raw);
      const checkedMeta = meta.safeParse(part?.meta);
      if (!checkedMeta.success) return "";
      const lines = (Array.isArray(part?.utterances) ? part.utterances : []).flatMap((u) => {
        const result = utterance.safeParse(u);
        return result.success ? [result.data] : [];
      }).slice(0, 2);
      return lines.length ? serialize({ meta: checkedMeta.data, utterances: lines }) : "";
    },
    complete(raw: string): string {
      // extractJSON can repair a truncated tail for coach notes. A spoken
      // exchange must actually finish before it becomes durable evidence.
      return serialize(checked(raw));
    },
  };
}

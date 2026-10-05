import {z} from 'zod';
import {SKILLS,CONTEXTS,COMPETENCIES,type SkillId,type ContextId,type CompetencyId} from '@/data/taxonomy';
import type {Scenario} from '@/data/corpus/types';
import {jsonCall,LLMError,type JSONCallOpts,type LLM} from './llm-core';
import {pick} from './i18n';

export const SkillSchema=z.enum(SKILLS.map(s=>s.id) as [SkillId,...SkillId[]]);
export const ContextSchema=z.enum(CONTEXTS.map(c=>c.id) as [ContextId,...ContextId[]]);
const CompetencySchema=z.enum(COMPETENCIES.map(c=>c.id) as [CompetencyId,...CompetencyId[]]);
const text=z.string();
export const LocalizedSchema=z.object({zh:text,en:text});
const content=LocalizedSchema.refine(v=>!!v.zh.trim()&&!!v.en.trim(),'Both language fields must contain text');
const character=z.object({id:text.regex(/^[a-zA-Z0-9_-]{1,100}$/),name:content,role:content,personality:LocalizedSchema,stance:LocalizedSchema,hidden:LocalizedSchema.optional(),playable:z.boolean().optional(),hue:z.number().finite()});
export const ScenarioSchema=z.object({
 id:text.min(1),title:content,hook:content,background:content,simulationFacts:LocalizedSchema.optional(),simulationDirection:LocalizedSchema.optional(),
 context:ContextSchema,contextType:content,competencies:z.array(CompetencySchema).min(1),skills:z.array(SkillSchema).min(1),relatedSkills:z.array(SkillSchema).optional(),
 relationship:z.array(z.enum(['senior','peer','junior','partner','parent','child','sibling','friend','stranger','customer','teacher'])).min(1),difficulty:z.union([z.literal(1),z.literal(2),z.literal(3)]),minutes:z.number().positive(),
 characters:z.array(character).min(2).max(12),objectives:z.array(content).min(1).max(10),success:content,failure:content,maxTurns:z.number().int().min(1).max(200),
 opening:z.object({characterId:text.min(1),text:content}),icon:text.optional(),source:text.min(1),keywords:z.array(text),custom:z.boolean().optional(),
}).superRefine((s,ctx)=>{
 if(new Set(s.characters.map(c=>c.id.toLowerCase())).size!==s.characters.length)ctx.addIssue({code:'custom',path:['characters'],message:'Character IDs must be unique'});
 if(s.characters.some(c=>['meta','error','final'].includes(c.id.toLowerCase())))ctx.addIssue({code:'custom',path:['characters'],message:'Character IDs cannot use protocol control markers'});
 if(!s.characters.some(c=>c.playable))ctx.addIssue({code:'custom',path:['characters'],message:'A playable character is required'});
 if(!s.characters.some(c=>c.id===s.opening.characterId))ctx.addIssue({code:'custom',path:['opening'],message:'Opening speaker must belong to the cast'});
 if(s.custom&&(!s.characters.some(c=>c.id==='you'&&c.playable)||s.opening.characterId==='you'||s.characters.filter(c=>c.id!=='you').some(c=>c.playable)))ctx.addIssue({code:'custom',path:['characters'],message:'Custom practice needs the learner and at least one NPC opening'});
});
export function validateScenario(value:unknown,lang:"zh"|"en"="zh"):Scenario {
 const parsed=ScenarioSchema.safeParse(value);
 if(!parsed.success)throw new LLMError(pick({zh:'练习资料不完整，请重新打开或生成场景。',en:'The practice context is incomplete. Please reopen or regenerate it.'},lang),400);
 return parsed.data as Scenario;
}
export const AdaptationSchema=z.object({learnerCharacterId:text.min(1),briefing:text.trim().min(1).max(10000),objectives:z.array(text.trim().min(1).max(2000)).min(1).max(10),focus:text.trim().min(1).max(3000),why:text.max(3000).optional()});

/** One bounded schema repair. Parsing alone never grants a typed result. */
export async function validatedJSON<T>(opts:JSONCallOpts,llm:LLM,schema:z.ZodType<T>,lang:'zh'|'en'):Promise<T>{
 let correction='';
 for(let attempt=0;attempt<2;attempt++){
  opts.signal?.throwIfAborted();
  const value=await jsonCall<unknown>({...opts,user:opts.user+correction},llm);
  const parsed=schema.safeParse(value);
  if(parsed.success)return parsed.data;
  correction=`\nThe previous response failed the runtime contract: ${parsed.error.issues.map(i=>i.path.join('.')+': '+i.message).join('; ')}. Return a complete corrected JSON for the SAME context. Do not invent facts or replace the learner's description.`;
 }
 throw new LLMError(pick({zh:'这次练习资料不完整，原描述已保留，请重试。',en:'The practice context is incomplete. Your description is kept; please retry.'},lang),502);
}

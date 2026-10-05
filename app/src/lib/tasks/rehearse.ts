import {z} from 'zod';
import {LLMError,type LLM} from '@/lib/llm-core';
import {rehearseSystem} from '@/lib/prompts';
import type {Scenario} from '@/data/corpus/types';
import {ScenarioSchema,validatedJSON} from '../runtime-contracts';
import {RehearsalDescriptionSchema,MAX_REHEARSAL_CHARS} from '../rehearsal-input';
import {pick} from '../i18n';
import type {RehearseInput} from './types';

/** Only bilingual mirroring is presentation normalization. Missing actors,
 * objectives or facts are never manufactured to make an invalid draft pass. */
function mirror(value:unknown):unknown{
 if(Array.isArray(value))return value.map(mirror);
 if(value&&typeof value==='object'){
  const object=value as Record<string,unknown>;
  if('zh' in object&&'en' in object&&Object.keys(object).length===2&&typeof object.zh==='string'&&typeof object.en==='string')return {zh:object.zh||object.en,en:object.en||object.zh};
  return Object.fromEntries(Object.entries(object).map(([key,value])=>[key,mirror(value)]));
 }
 return value;
}
export async function runRehearse(input:RehearseInput,llm:LLM,model:string):Promise<{scenario:Scenario}>{
 const {description,lang,profile}=input;
 if(!RehearsalDescriptionSchema.safeParse(description).success)throw new LLMError(pick({zh:`请用 8–${MAX_REHEARSAL_CHARS} 字描述这场对话。`,en:`Describe the situation in 8–${MAX_REHEARSAL_CHARS} characters.`},lang),400);
 const schema=z.preprocess(raw=>raw&&typeof raw==='object'&&!Array.isArray(raw)?mirror({...raw,id:`custom-${crypto.randomUUID()}`,source:'Learner-described situation (generated)',custom:true}):raw,
  ScenarioSchema.refine(s=>s.characters.length<=3&&s.objectives.length>=2&&s.objectives.length<=3&&s.maxTurns>=6&&s.maxTurns<=10&&s.skills.length<=3&&s.characters.filter(c=>c.id!=='you').every(c=>!!c.hidden?.zh.trim()&&!!c.hidden?.en.trim()&&!!c.personality.zh.trim()&&!!c.personality.en.trim()&&!!c.stance.zh.trim()&&!!c.stance.en.trim()),'Use 1-2 NPCs with simulated motives, 2-3 original aims and a 6-10 turn initial setup'));
 const scenario=await validatedJSON({model,thinking:false,maxTokens:6000,system:rehearseSystem(lang),user:`LEARNER: ${profile?.name||'(anonymous)'}; about: ${profile?.bio||'(n/a)'}; target skills: ${(profile?.goals??[]).join(',')||'(n/a)'}\n\nSITUATION (the learner's words):\n${description.trim()}\nProduce the scenario JSON without adding facts about the learner.`},llm,schema,lang);
 return {scenario:scenario as Scenario};
}

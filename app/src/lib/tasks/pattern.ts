import {jsonCall,type LLM} from '@/lib/llm-core';
import {patternSystem} from '@/lib/prompts';
import {SKILLS,type SkillId} from '@/data/taxonomy';
import type {PatternInput,PatternResult} from './types';

// Locate normalized text, then restore the literal source span. Only the
// source may contain the requested quote, never the reverse.
export function locatePatternQuote(quote:string,source:string):string|undefined{
 const skip=/[“”„"'‘’\s　，,。．.、；;：:！!？?…—–-]/u;
 const positions:number[]=[];let text='';
 for(let i=0;i<source.length;i++)if(!skip.test(source[i])){text+=source[i].toLowerCase();positions.push(i);}
 const q=quote.split('').filter(c=>!skip.test(c)).join('').toLowerCase();
 if(q.length<6)return;
 const start=text.indexOf(q);if(start<0)return;
 return source.slice(positions[start],positions[start+q.length-1]+1);
}
export async function runPattern(input:PatternInput,llm:LLM,smartModel:string):Promise<PatternResult>{
 const none:PatternResult={found:false,pattern:'',why:'',evidence:[],nextStep:''};
 const unique=new Map(input.sessions.map(s=>[s.practiceId??s.sessionId,s]));
 const sessions=[...unique.values()].filter(s=>typeof s.sessionId==='string'&&s.weaknesses.length).slice(0,20);
 if(sessions.length<2)return none;
 const raw=await jsonCall<unknown>({model:smartModel,thinking:false,maxTokens:2000,system:patternSystem(input.lang),user:JSON.stringify({goals:input.goals,sessions})},llm);
 if(!raw||typeof raw!=='object')return none;
 const r=raw as Record<string,unknown>;
 if(r.found!==true||!Array.isArray(r.evidence))return none;
 const evidence:PatternResult['evidence']=[];
 for(const value of r.evidence){
  if(!value||typeof value!=='object')continue;
  const e=value as Record<string,unknown>;
  const session=sessions.find(s=>s.sessionId===e.sessionId);
  if(!session||typeof e.quote!=='string'||typeof e.messageId!=='string')continue;
  const source=session.weaknesses.find(w=>w.messageId===e.messageId&&locatePatternQuote(e.quote as string,w.evidence));
  if(!source)continue;
  const quote=locatePatternQuote(e.quote,source.evidence)!;
  if(evidence.some(v=>v.sessionId===session.sessionId))continue;
  evidence.push({sessionId:session.sessionId,messageId:source.messageId,title:session.title,quote});
 }
 if(evidence.length<2||typeof r.pattern!=='string'||!r.pattern.trim())return none;
 const skill=SKILLS.some(s=>s.id===r.skill)?r.skill as SkillId:undefined;
 return {found:true,pattern:r.pattern.trim(),why:typeof r.why==='string'?r.why.trim():'',nextStep:typeof r.nextStep==='string'?r.nextStep.trim():'',skill,evidence:evidence.slice(0,3)};
}

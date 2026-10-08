import type {Proficiency,Session} from './types';
import type {SkillId} from '@/data/taxonomy';
import {hasQuote} from './practice-policy';

/** Recent, evidence-backed performance, not accumulated rewards. Two neutral
 * prior observations keep a single model judgment from rewriting the profile.
 * Difficulty is reported as coverage, not an invented psychometric correction. */
export function estimateProficiency(sessions:Session[],baseline:Proficiency):Proficiency{
 const latest=new Map<string,Session>();
 // Select in recency order. Replacing a Map value does not move its key, so
 // deduplication in oldest-first order would misplace a new continuation.
 for(const session of [...sessions].sort((a,b)=>b.startedAt-a.startedAt)){
  if(session.report?.scoringVersion!==2)continue;
  const id=session.sceneContext?.practiceId??session.id;
  if(!latest.has(id))latest.set(id,session);
 }
 const independent=latest.values();
 const observations=new Map<SkillId,number[]>();
 for(const s of independent){
  const seen=new Set<SkillId>();
  const words=s.messages.filter(m=>m.role==='learner').map(m=>m.text);
  for(const rating of s.report?.ratings??[]){
   if(seen.has(rating.skill)||!rating.reason?.trim())continue;
   if(!s.scenario.skills.includes(rating.skill)&&!s.scenario.relatedSkills?.includes(rating.skill))continue;
   if(!Number.isInteger(rating.level)||rating.level<0||rating.level>3||!hasQuote(rating.evidence,words))continue;
   seen.add(rating.skill);
   const scores=observations.get(rating.skill)??[];
   if(scores.length<8)scores.push(1+rating.level*4/3);
   observations.set(rating.skill,scores);
  }
 }
 const result={...baseline};
 for(const [skill,scores] of observations)result[skill]=+((5+scores.reduce((a,b)=>a+b,0))/(2+scores.length)).toFixed(2);
 return result;
}

import {hasQuote} from './practice-policy';
import type {Session,SkillRating} from './types';

export interface PracticeComparison {
 previous:Session;
 rows:{skill:SkillRating['skill'];previous:SkillRating;current:SkillRating;change:'higher'|'same'|'lower'}[];
}

/** Compare the recorded conditions, not a shared title or a successful outcome. */
function conditions(session:Session){
 const {scenario:s,adaptation:a,sceneContext:c}=session;
 return JSON.stringify({
  id:s.id,learner:session.learnerCharacterId,mode:c?'3d':'text',intent:session.practiceIntent?.trim()||undefined,
  scene:c?.sceneId,opening:c?.openingId,difficulty:s.difficulty,timed:!!session.timed,
  background:s.background,objectives:s.objectives,openingLine:s.opening,maxTurns:s.maxTurns,
  characters:s.characters.map(p=>({id:p.id,role:p.role,stance:p.stance,personality:p.personality,hidden:p.hidden})),
  facts:s.simulationFacts,direction:s.simulationDirection,
  briefing:a?.briefing,adaptedObjectives:a?.objectives,
 });
}

function verifiedRatings(session:Session){
 if(session.status!=='assessed'||session.report?.scoringVersion!==2)return [];
 const ratings=session.report.ratings??[],words=session.messages.filter(m=>m.role==='learner').map(m=>m.text);
 const allowed=new Set([...session.scenario.skills,...session.scenario.relatedSkills??[]]);
 return ratings.filter(r=>allowed.has(r.skill)&&ratings.filter(v=>v.skill===r.skill).length===1
  &&Number.isInteger(r.level)&&r.level>=0&&r.level<=3&&hasQuote(r.evidence,words))
  .map(r=>({...r,evidence:r.evidence.trim()}));
}

/** Each row is supported by learner words in two independent, completed practices.
 * A continued 3D practice is one observation, including when reading old reports. */
export function comparePractice(current:Session,history:Session[]):PracticeComparison|null{
 const ratings=verifiedRatings(current);
 if(!ratings.length||!Number.isFinite(new Date(current.startedAt).getTime())||current.sceneContext&&!current.sceneContext.practiceId)return null;
 const currentId=current.sceneContext?.practiceId??current.id,key=conditions(current),seen=new Set<string>();
 for(const previous of [...history].sort((a,b)=>b.startedAt-a.startedAt)){
  if(previous.id===current.id||previous.startedAt>=current.startedAt||previous.status!=='assessed'||!Number.isFinite(new Date(previous.startedAt).getTime()))continue;
  if(previous.sceneContext&&!previous.sceneContext.practiceId)continue;
  const id=previous.sceneContext?.practiceId??previous.id;
  if(id===currentId||seen.has(id))continue;
  seen.add(id);
  if(conditions(previous)!==key)continue;
  const prior=new Map(verifiedRatings(previous).map(r=>[r.skill,r]));
  const rows=ratings.flatMap(now=>{
   const before=prior.get(now.skill);if(!before)return [];
   return [{skill:now.skill,previous:before,current:now,change:now.level>before.level?'higher' as const:now.level<before.level?'lower' as const:'same' as const}];
  });
  if(rows.length)return {previous,rows:rows.slice(0,3)};
 }
 return null;
}

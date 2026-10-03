import type {Report,Session} from './types';
import type {SkillId} from '@/data/taxonomy';
import {hasQuote} from './practice-policy';

/** Continued 3D snapshots share one practice, so earlier evidence cannot earn progress twice. */
export function creditPracticeReport(session:Session,report:Report,sessions:Session[]):Report {
  const practiceId=session.sceneContext?.practiceId;
  if(!practiceId)return report;
  const previous=sessions.filter(s=>s.id!==session.id&&s.status==='assessed'&&s.sceneContext?.practiceId===practiceId&&s.report);
  if(!previous.length)return report;
  const reviewedTurns=Math.max(...previous.map(s=>s.messages.filter(m=>m.role==='learner').length));
  const newWords=session.messages.filter(m=>m.role==='learner').slice(reviewedTurns).map(m=>m.text);
  const deltas:Report['deltas']={};
  for(const [skill,value] of Object.entries(report.deltas)){
    if(typeof value!=='number'||!Number.isFinite(value)||value<=0)continue;
    const key=skill as SkillId;
    if(!report.ratings?.some(r=>r.skill===key&&hasQuote(r.evidence,newWords)))continue;
    const credited=previous.reduce((sum,s)=>{const v=s.report!.deltas[key];return sum+(typeof v==='number'&&Number.isFinite(v)?Math.max(0,v):0);},0);
    const extra=+Math.max(0,value-credited).toFixed(2);
    if(extra>0)deltas[key]=extra;
  }
  return {...report,deltas};
}

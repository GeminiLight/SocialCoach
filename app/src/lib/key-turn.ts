import type {Lang} from '@/data/taxonomy';
import type {ChatMessage,KeyTurnAttempt,Session} from './types';
import {uid} from './format';
import {hasQuote} from './practice-policy';

export const KEY_TURN_SCENARIO='office-quick-favor';
export const KEY_TURN_LIMIT=4;

/** v1 supports the very first spoken response, before any disclosure or commitment. */
export function keyTurnCheckpoint(session:Session){
  if(session.status!=='assessed'||!session.report||session.sceneContext||session.scenario.custom||session.scenario.id!==KEY_TURN_SCENARIO)return null;
  const first=session.messages.findIndex(m=>m.role==='learner');
  if(first<1||!session.messages[first].text.trim())return null;
  const prefix=session.messages.slice(0,first).filter(m=>m.role!=='coach');
  if(prefix.length!==1||prefix[0].role!=='npc'||prefix[0].characterId!==session.scenario.opening.characterId||!prefix[0].text.trim())return null;
  if(session.scenario.characters.filter(c=>c.id!==session.learnerCharacterId).length!==1)return null;
  return {prefix,original:session.messages[first]};
}

export function createKeyTurnAttempt(session:Session,lang:Lang):KeyTurnAttempt|null{
  const checkpoint=keyTurnCheckpoint(session);
  return checkpoint?{version:1,id:uid(),sourceMessageId:checkpoint.original.id,lang,startedAt:Date.now(),revision:0,status:'active',messages:[]}:null;
}

export function keyTurnMessages(session:Session,attempt:KeyTurnAttempt):ChatMessage[]{
  const checkpoint=keyTurnCheckpoint(session);
  if(!checkpoint||checkpoint.original.id!==attempt.sourceMessageId)throw new Error('The retry checkpoint is unavailable.');
  return [...checkpoint.prefix,...attempt.messages];
}

export function keyTurnTurns(attempt:KeyTurnAttempt){return attempt.messages.filter(m=>m.role==='learner').length;}
export function keyTurnPending(attempt:KeyTurnAttempt){return attempt.messages.at(-1)?.role==='learner';}
export function canReviewKeyTurn(attempt:KeyTurnAttempt){return attempt.status==='active'&&keyTurnTurns(attempt)>0&&!keyTurnPending(attempt);}

/** A late network reply cannot replace a newer attempt, a review, or a reset. */
export function changeKeyTurn(session:Session,id:string,revision:number,patch:Partial<Pick<KeyTurnAttempt,'messages'|'status'|'report'|'endedAt'>>):Session{
  const old=session.keyTurnAttempts?.find(a=>a.id===id);
  if(!old||old.revision!==revision||old.status==='reviewed')return session;
  const next={...old,...patch,revision:old.revision+1};
  if(!validKeyTurnAttempt(session,next))return session;
  return {...session,keyTurnAttempts:session.keyTurnAttempts!.map(a=>a.id===id?next:a)};
}

export function validKeyTurnAttempt(session:Session,attempt:KeyTurnAttempt):boolean{
  const checkpoint=keyTurnCheckpoint(session);
  if(!checkpoint||attempt.sourceMessageId!==checkpoint.original.id||keyTurnTurns(attempt)>KEY_TURN_LIMIT)return false;
  const ids=new Set(session.messages.map(m=>m.id));
  let lastRole:'learner'|'npc'|undefined;
  for(const message of attempt.messages){
    if(ids.has(message.id)||!message.text.trim()||!['learner','npc'].includes(message.role))return false;
    ids.add(message.id);
    if(message.role==='learner'&&lastRole==='learner')return false;
    if(message.role==='npc'&&(!lastRole||message.characterId!==checkpoint.prefix[0].characterId))return false;
    lastRole=message.role as 'learner'|'npc';
  }
  if(attempt.status!=='active'&&(!attempt.messages.length||lastRole!=='npc'||!attempt.endedAt))return false;
  if((attempt.status==='reviewed')!==!!attempt.report)return false;
  return true;
}

/** Imported reports must still quote this drill, never the original answer or an NPC. */
export function keyTurnObservations(attempt:KeyTurnAttempt){
  const report=attempt.report;
  if(!report)return [];
  const lines=attempt.messages.filter(m=>m.role==='learner').map(m=>m.text);
  const items=[...report.strengths,...report.weaknesses].filter(i=>i.skill==='communication'&&hasQuote(i.evidence,lines)&&i.behavior.trim()).map(i=>({quote:i.evidence.trim(),text:i.behavior}));
  if(!items.length){const rating=report.ratings?.find(r=>r.skill==='communication'&&hasQuote(r.evidence,lines));if(rating?.reason.trim())items.push({quote:rating.evidence.trim(),text:rating.reason});}
  return items.slice(0,2);
}

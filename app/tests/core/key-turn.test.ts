import assert from 'node:assert/strict';
import {test} from 'node:test';
import {SCENARIOS} from '../../src/data/corpus';
import {buildSession,historyFor} from '../../src/lib/session-utils';
import {createKeyTurnAttempt,keyTurnCheckpoint,keyTurnMessages,changeKeyTurn,canReviewKeyTurn,keyTurnObservations} from '../../src/lib/key-turn';
import {parseArchive} from '../../src/lib/archive';
import {decodeBackup,mergeArchives} from '../../src/lib/backup';
import {estimateProficiency} from '../../src/lib/proficiency';
import {taskInput,TaskInputSchemas} from '../../src/lib/task-input';
import {roleplayModel} from '../../src/lib/tasks/roleplay';
import type {KeyTurnAttempt,Report,Session} from '../../src/lib/types';

const scenario=SCENARIOS.find(s=>s.id==='office-quick-favor')!;
const original='行，我先帮你改吧。',replacement='我还有自己的报告要交。你希望我具体改哪部分？';
export function fixture():Session{
 const session=buildSession(scenario,'arena','zh');
 const report:Report={scoringVersion:2,ratings:[{skill:'communication',level:1,evidence:original,reason:'在确认范围前答应了帮忙。'}],stars:1,outcome:'partial',verdictEvidence:original,verdict:'尚未确认帮忙范围。',summary:'虚构验收记录。',strengths:[],weaknesses:[],alternatives:[],knowledge:{theoryIds:[],caseIds:[],whyThis:''},reflectionQuestions:[],nextStep:'先确认范围。',deltas:{}};
 return {...session,id:'retry-parent',status:'assessed',report,startedAt:1,messages:[
  {id:'original-opening',role:'npc',characterId:'tang',text:scenario.opening.text.zh,ts:1},
  {id:'original-answer',role:'learner',text:original,ts:2},
  {id:'future-disclosure',role:'npc',characterId:'tang',text:'老板说第三页的论证有问题。',ts:3},
  {id:'future-commitment',role:'learner',text:'我今晚接着改六页。',ts:4},
 ]};
}
function answered(session:Session):KeyTurnAttempt{return {...createKeyTurnAttempt(session,'zh')!,revision:2,messages:[{id:'new-answer',role:'learner',text:replacement,ts:10},{id:'new-reply',role:'npc',characterId:'tang',text:'第三页最要紧，其他几页也想请你一起看看。',ts:11}]};}

test('checkpoint excludes future disclosures, prior answer, hints and commitments',()=>{
 const s=fixture(),a=createKeyTurnAttempt(s,'zh')!;
 assert.equal(keyTurnCheckpoint(s)?.original.text,original);
 const context=keyTurnMessages(s,answered(s));
 assert.equal(context.length,3);
 assert(!JSON.stringify(context).includes('我今晚接着改六页'));
 assert(!JSON.stringify(context).includes(original));
 assert.equal(a.messages.length,0);
});
test('unsupported modes, a prior silence, missing source and unreviewed records do not offer a misleading checkpoint',()=>{
 const s=fixture();
 for(const changed of [
  {...s,status:'ended' as const}, {...s,scenario:{...s.scenario,id:'other'}}, {...s,scenario:{...s.scenario,custom:true}},
  {...s,messages:s.messages.slice(1)},
  {...s,messages:[s.messages[0],{id:'silence',role:'event' as const,text:'',kind:'silence' as const,ts:1},...s.messages.slice(1)]},
 ])assert.equal(keyTurnCheckpoint(changed),null);
});
test('drill transition leaves the source record, report and growth history unchanged',()=>{
 const originalSession=fixture(),a=answered(originalSession),s={...originalSession,keyTurnAttempts:[a]};
 const next=changeKeyTurn(s,a.id,a.revision,{status:'ended',endedAt:12});
 assert.equal(next.messages,originalSession.messages);assert.equal(next.report,originalSession.report);
 assert.deepEqual(historyFor([next],'zh'),historyFor([originalSession],'zh'));
 assert.deepEqual(estimateProficiency([next],{}),estimateProficiency([originalSession],{}));
 assert.equal(s.keyTurnAttempts[0].status,'active');assert.equal(next.keyTurnAttempts![0].status,'ended');
});
test('late replies cannot overwrite a newer branch revision, a finished review, or a removed attempt',()=>{
 const s=fixture(),a=answered(s),current={...s,keyTurnAttempts:[a]};
 assert.equal(changeKeyTurn(current,a.id,0,{messages:[]}),current);
 assert.equal(changeKeyTurn(s,a.id,a.revision,{messages:[]}),s);
 const done={...a,status:'reviewed' as const,endedAt:12,report:s.report};
 const reviewed={...s,keyTurnAttempts:[done]};
 assert.equal(changeKeyTurn(reviewed,a.id,a.revision,{status:'active'}),reviewed);
});
test('a pending learner response cannot be reviewed; a completed exchange can',()=>{
 const s=fixture(),a=answered(s);
 assert(canReviewKeyTurn(a));
 assert(!canReviewKeyTurn({...a,messages:a.messages.slice(0,1)}));
 assert(!canReviewKeyTurn({...a,messages:[]}));
 const current={...s,keyTurnAttempts:[{...a,messages:a.messages.slice(0,1)}]};
 assert.equal(changeKeyTurn(current,a.id,a.revision,{status:'ended',endedAt:12}),current);
});
test('archives round-trip retry history while older records need no migration',()=>{
 const s=fixture(),a=answered(s);
 assert.equal(parseArchive({sessions:[s]}).sessions[0].keyTurnAttempts,undefined);
 const decoded=parseArchive(JSON.parse(JSON.stringify({sessions:[{...s,keyTurnAttempts:[a]}]})));
 assert.deepEqual(decoded.sessions[0].keyTurnAttempts,[a]);
 assert.deepEqual(decoded.sessions[0].messages,s.messages);
});
test('backup restores short practice and rejects ambiguous same-ID history merges',async()=>{
 const s=fixture(),a=answered(s),old=parseArchive({sessions:[s]}),updated=parseArchive({sessions:[{...s,keyTurnAttempts:[a]}]});
 const decoded=await decodeBackup(JSON.stringify({version:0,state:updated}));
 assert.deepEqual(decoded.archive.sessions[0].keyTurnAttempts,[a]);
 assert.throws(()=>mergeArchives(old,updated),/backup-conflict/);
 assert.deepEqual(mergeArchives(updated,updated).sessions,updated.sessions);
});
test('bad checkpoints, duplicates and overlong drills fail closed instead of losing source bytes',()=>{
 const s=fixture(),a=answered(s);
 for(const attempts of [[{...a,sourceMessageId:'future-commitment'}],[a,a],[{...a,messages:[s.messages[1]]}],[{...a,status:'reviewed',endedAt:12}],[{...a,messages:Array.from({length:5},(_,i)=>a.messages.map(m=>({...m,id:`${m.id}-${i}`}))).flat()}]]){
  assert.throws(()=>parseArchive({sessions:[{...s,keyTurnAttempts:attempts}]}),SyntaxError);
 }
});
test('focused observations must quote this attempt, never original words or an NPC',()=>{
 const s=fixture(),a=answered(s),report={...s.report!,strengths:[{skill:'communication' as const,evidence:original,behavior:'Wrong original quote'},{skill:'communication' as const,evidence:a.messages[1].text,behavior:'Wrong speaker'},{skill:'communication' as const,evidence:replacement,behavior:'先询问范围，并说清自己的交付。'}]};
 assert.deepEqual(keyTurnObservations({...a,report}),[{quote:replacement,text:'先询问范围，并说清自己的交付。'}]);
 assert.deepEqual(keyTurnObservations({...a,report:s.report}),[]);
});
test('hosted and BYOK input contracts bound key-turn mode to one scene and four responses',()=>{
 const s=fixture(),a=answered(s),input={practiceMode:'key-turn',scenario,learnerCharacterId:s.learnerCharacterId,messages:keyTurnMessages(s,a),lang:'zh'};
 assert.equal(taskInput(TaskInputSchemas.roleplay,input).practiceMode,'key-turn');
 assert.equal(roleplayModel(taskInput(TaskInputSchemas.roleplay,input),'fast','smart'),'smart');
 assert.equal(roleplayModel(taskInput(TaskInputSchemas.roleplay,{...input,practiceMode:undefined}),'fast','smart'),'fast');
 assert.throws(()=>taskInput(TaskInputSchemas.roleplay,{...input,scenario:{...scenario,id:'unrelated'}}));
 assert.throws(()=>taskInput(TaskInputSchemas.roleplay,{...input,messages:Array.from({length:5},(_,i)=>({...a.messages[0],id:`answer-${i}`}))}));
 assert.equal(taskInput(TaskInputSchemas.roleplay,{...input,practiceMode:undefined,scenario:{...scenario,id:'unrelated'}}).practiceMode,undefined);
});

import assert from 'node:assert/strict';
import {test} from 'node:test';
import {SCENARIOS} from '../../src/data/corpus';
import {buildSession} from '../../src/lib/session-utils';
import type {Report,Session} from '../../src/lib/types';
import {SKILLS} from '../../src/data/taxonomy';
import {comparePractice} from '../../src/lib/practice-comparison';

const scene=SCENARIOS.find(s=>s.skills.includes('communication'))!;
const before='我今天可以先做，但还没有确认时间。';
const after='我只负责已经确认的部分，需要先检查时间。';
function practice(id:string,at:number,quote=after,level:0|1|2|3=2):Session{
 const report:Report={scoringVersion:2,ratings:[{skill:'communication',level,evidence:quote,reason:'说明了自己承担的范围。'}],stars:level,outcome:'partial',verdictEvidence:quote,verdict:'明确范围',summary:'',strengths:[],weaknesses:[],alternatives:[],knowledge:{theoryIds:[],caseIds:[],whyThis:''},reflectionQuestions:[],nextStep:'再练一次',deltas:{}};
 return {...buildSession(scene,'arena','zh'),id,startedAt:at,status:'assessed',report,messages:[{id:id+'-line',role:'learner',text:quote,ts:at}],revealSeen:true};
}
async function compare(current:Session,history:Session[]){
 return comparePractice(current,history);
}
test('a repeated scene compares two genuine learner quotations before any rating interpretation',async()=>{
 const old=practice('old',1,before,1),current=practice('current',2);
 const result=await compare(current,[current,old]);
 assert.ok(result,'a second independent practice should have a comparison');
 assert.equal(result.previous.id,'old');
 assert.equal(result.rows[0].previous.evidence,before);
 assert.equal(result.rows[0].current.evidence,after);
 assert.equal(result.rows[0].change,'higher');
 assert.equal(old.messages[0].text,before);
});
test('the nearest earlier eligible practice is selected without rewriting historical records',async()=>{
 const old=practice('old',1),near=practice('near',3,before,1),current=practice('current',4),future=practice('future',5);
 const result=await compare(current,[future,old,current,near]);
 assert.equal(result?.previous.id,'near');assert.equal(result?.rows.length,1);
});
test('same and lower estimates remain visible rather than manufacturing improvement',async()=>{
 const old=practice('old',1,before,2);
 assert.equal((await compare(practice('same',2),[old]))?.rows[0].change,'same');
 assert.equal((await compare(practice('lower',3,after,1),[old]))?.rows[0].change,'lower');
});
test('NPC text, missing quotation and unrelated skills cannot support a comparison',async()=>{
 const old=practice('old',1,before),current=practice('current',2);
 old.messages=[{id:'npc-line',role:'npc',characterId:scene.characters.at(-1)!.id,text:before,ts:1}];
 assert.equal(await compare(current,[old]),null);
 old.messages=[{id:'learner',role:'learner',text:'完全不同的话。',ts:1}];
 assert.equal(await compare(current,[old]),null);
 const unrelated=SKILLS.find(s=>!scene.skills.includes(s.id)&&!scene.relatedSkills?.includes(s.id))!;
 const rating={...current.report!.ratings![0],skill:unrelated.id};
 assert.equal(await compare({...current,report:{...current.report!,ratings:[rating]}},[practice('valid',1,before)]),null);
});
test('a changed NPC information boundary does not silently become the same practice conditions',async()=>{
 const old=practice('old',1,before),current=practice('current',2);
 const changed={...old,scenario:{...scene,characters:scene.characters.map(c=>({...c,hidden:{zh:'不同的私有事实',en:'A different private fact'}}))}};
 assert.equal(await compare(current,[changed]),null);
});
test('changed identity, difficulty, briefing, goals and scene facts are not treated as equal conditions',async()=>{
 const old=practice('old',1,before),current=practice('current',2);
 for(const changed of [
  {...old,practiceIntent:'先修复关系'},
  {...old,learnerCharacterId:'different'},
  {...old,scenario:{...scene,difficulty:scene.difficulty===1?2:1} as Session['scenario']},
  {...old,scenario:{...scene,background:{...scene.background,zh:'另一个公开背景'}}},
  {...old,adaptation:{learnerCharacterId:old.learnerCharacterId,briefing:'不同处境',objectives:['不同目标'],focus:'边界'}},
  {...old,timed:true},
 ])assert.equal(await compare(current,[changed]),null);
});
test('one 3D practice and its continuation are excluded; a different opening is also excluded',async()=>{
 const context={kind:'3d' as const,sceneId:'work' as const,openingId:'work-toast',observations:[],practiceId:'live-practice'};
 const current={...practice('current',4),sceneContext:context};
 const continued={...practice('continued',3,before),sceneContext:context};
 const independent={...practice('independent',2,before),sceneContext:{...context,practiceId:'previous-practice'}};
 assert.equal(await compare(current,[continued]),null);
 assert.equal((await compare(current,[continued,independent]))?.previous.id,'independent');
 assert.equal(await compare(current,[{...independent,sceneContext:{...independent.sceneContext,openingId:'another-opening'}}]),null);
});
test('latest snapshot of the earlier 3D practice supplies its own evidence',async()=>{
 const context={kind:'3d' as const,sceneId:'work' as const,openingId:'work-toast',observations:[],practiceId:'earlier'};
 const older={...practice('older',1,before,1),sceneContext:context};
 const latest={...practice('latest',3,after,2),sceneContext:context};
 const current={...practice('current',4),sceneContext:{...context,practiceId:'current'}};
 assert.equal((await compare(current,[older,latest]))?.previous.id,'latest');
});
test('legacy, unfinished, unscored and duplicate skill ratings are excluded',async()=>{
 const old=practice('old',1,before),current=practice('current',2);
 assert.equal(await compare(current,[{...old,report:{...old.report!,scoringVersion:undefined}}]),null);
 assert.equal(await compare({...current,status:'ended'},[old]),null);
 assert.equal(await compare({...current,report:{...current.report!,ratings:[]}},[old]),null);
 assert.equal(await compare({...current,report:{...current.report!,ratings:[...current.report!.ratings!,...current.report!.ratings!]}},[old]),null);
});
test('imported finite but unrenderable dates cannot crash the comparison view',async()=>{
 const old=practice('old',1,before),current=practice('current',2);
 assert.equal(await compare(current,[{...old,startedAt:-1e20}]),null);
 assert.equal(await compare({...current,startedAt:1e20},[old]),null);
});
test('accepted padded quotations still locate the exact learner line without modifying the report',async()=>{
 const old=practice('old',1,before),current=practice('current',2);
 old.report!.ratings![0].evidence='  '+before+'\n';
 current.report!.ratings![0].evidence='\n'+after+'  ';
 const result=await compare(current,[old]);assert.ok(result);
 assert.ok(old.messages[0].text.includes(result.rows[0].previous.evidence));
 assert.ok(current.messages[0].text.includes(result.rows[0].current.evidence));
 assert.equal(old.report!.ratings![0].evidence,'  '+before+'\n');
});

import assert from 'node:assert/strict';
import {test} from 'node:test';
import {SCENARIOS} from '../../src/data/corpus';
import {ScenarioSchema} from '../../src/lib/runtime-contracts';
import {parseArchive,checkArchiveEnvelope} from '../../src/lib/archive';
import {estimateProficiency} from '../../src/lib/proficiency';
import {buildSession,historyFor} from '../../src/lib/session-utils';
import {createArchiveStorage} from '../../src/store/archive-storage';
import {captureDinnerContent,dinnerReviewContent} from '../../src/features/dinner/lib/review';
import {dinnerPrompt} from '../../src/features/dinner/lib/director';
import {decodeBackup,mergeArchives} from '../../src/lib/backup';
import {opening,type Save} from '../../src/features/dinner/lib/engine';
import {scenarios} from '../../src/features/dinner/lib/content';
import type {Report,Session} from '../../src/lib/types';
const scenario=SCENARIOS.find(s=>s.skills.includes('communication'))!;
const quote='我只负责已经确认的部分，需要先检查。';
function practice(n:number,level:0|1|2|3,practiceId?:string):Session{
 const report:Report={scoringVersion:2,ratings:[{skill:'communication',level,evidence:quote,reason:'说明限制'}],stars:level,outcome:'failure',verdictEvidence:quote,verdict:'有边界',summary:'',strengths:[],weaknesses:[{skill:'communication',evidence:quote,behavior:'澄清',deficit:'performance',whyItMatters:'明确范围'}],alternatives:[],knowledge:{theoryIds:[],caseIds:[],whyThis:''},reflectionQuestions:[],nextStep:'进一步澄清',deltas:{communication:.5}};
 return {...buildSession(scenario,'arena','zh'),id:'s'+n,startedAt:n,status:'assessed',report,messages:[{id:'m'+n,role:'learner',text:quote,ts:n}],...(practiceId?{sceneContext:{kind:'3d',practiceId,sceneId:'work',openingId:'work-toast',observations:[]}}:{})};
}
test('every existing corpus scenario satisfies the shared contract',()=>{for(const s of SCENARIOS)assert.ok(ScenarioSchema.safeParse(s).success,s.id);});
test('valid JSON with null sessions, invalid reports or a future version fails without merge',()=>{
 assert.throws(()=>parseArchive({sessions:null}),SyntaxError);
 assert.throws(()=>parseArchive({sessions:[{...practice(1,1),report:{...practice(1,1).report,weaknesses:null}}]}),SyntaxError);
 assert.throws(()=>checkArchiveEnvelope(JSON.stringify({version:100,state:{sessions:[]}})),SyntaxError);
});
test('legacy archives are accepted and unverifiable cached patterns are invalidated',()=>{
 const value=parseArchive({sessions:[practice(1,1)],patternInsight:{result:{found:true,pattern:'x',why:'x',nextStep:'x',evidence:[{title:'x',quote}]},from:['s1'],at:1}});
 assert.equal(value.sessions.length,1);assert.equal(value.patternInsight,null);
});
test('five low ratings cannot reach full proficiency; later evidence can correct a high estimate',()=>{
 const low=Array.from({length:5},(_,i)=>practice(i,1));
 assert.equal(estimateProficiency(low,{communication:2.5}).communication,2.38);
 const high=estimateProficiency(Array.from({length:8},(_,i)=>practice(i,3)),{}).communication!;
 assert.ok(high>4);
 const corrected=estimateProficiency([...low.map((s,i)=>({...s,startedAt:20+i})),...Array.from({length:8},(_,i)=>practice(i,3))],{communication:high}).communication!;
 assert.ok(corrected<high);
 const fake=practice(1,3);fake.report!.ratings![0].evidence='没有说过';assert.equal(estimateProficiency([fake],{communication:2}).communication,2);
});
test('continued snapshots are one observation, and scheduling gets quoted diagnosis separately from self-report',()=>{
 const id='0967cab7-f8f7-48a7-bddc-03a183de3b77',a=practice(1,2,id),b=practice(2,2,id);
 b.reflections=[{question:'当时怎么想？',answer:'我觉得他生气了。'}];
 assert.deepEqual(estimateProficiency([a,b],{}),estimateProficiency([b],{}));
 const history=historyFor([b,a],'zh');assert.equal(history.length,1);assert.equal(history[0].diagnosis?.[0].evidence,quote);assert.equal(history[0].reflections?.[0].answer,b.reflections[0].answer);
});
test('quota and stale-window writes preserve disk and allow a successful retry',async()=>{
 const entries=new Map<string,string>();let denied=false;const storage={getItem:(k:string)=>entries.get(k)??null,setItem:(k:string,v:string)=>{if(denied)throw new DOMException('full','QuotaExceededError');entries.set(k,v);},removeItem:(k:string)=>entries.delete(k)};
 Object.defineProperty(globalThis,'localStorage',{value:storage,configurable:true});
 const issues:(string|null)[]=[],a=createArchiveStorage(issue=>issues.push(issue)),b=createArchiveStorage(()=>{});
 const initial=JSON.stringify({version:0,state:{sessions:[]}});entries.set('archive',initial);a.getItem('archive');b.getItem('archive');
 const first=JSON.stringify({version:0,state:{sessions:[],bookmarks:['first']}});
 denied=true;await a.setItem('archive',first);assert.equal(entries.get('archive'),initial);assert.equal(issues.at(-1),'quota');
 denied=false;a.retry();await a.setItem('archive',first);assert.equal(entries.get('archive'),first);assert.equal(issues.at(-1),null);
 await b.setItem('archive',JSON.stringify({version:0,state:{sessions:[],bookmarks:['stale']}}));assert.equal(entries.get('archive'),first);assert.equal(b.dirty(),true);
});
test('a frozen 3D opening keeps its public facts and private direction on review and continuation',()=>{
 const snapshot=captureDinnerContent('work','work-toast',12,1);
 snapshot.publicScenario.background={zh:'旧版公开事实。',en:'Old public facts.'};snapshot.direction.setup={zh:'旧版冲突',en:'Old conflict'};
 const save:Save={version:1,briefVersion:1,contentSnapshot:snapshot,scenarioId:'work',variantId:'work-toast',maxTurns:12,lang:'zh',messages:[opening(scenarios[0],'zh','work-toast')],started:true,complete:false,draft:''};
 assert.equal(dinnerReviewContent(save).scenario.background.zh,'旧版公开事实。');
 const prompt=dinnerPrompt({scenarioId:'work',variantId:'work-toast',contentSnapshot:snapshot,briefVersion:1,maxTurns:12,lang:'zh',text:'我们先确认范围。',history:save.messages});assert.ok(prompt.includes('旧版冲突'));assert.ok(!JSON.stringify(snapshot.publicScenario).includes('agenda'));
});

test('the real store protects a malformed envelope and keeps unsaved messages through quota recovery',async()=>{
 const entries=new Map<string,string>([['socialcoach.v1',JSON.stringify({state:{sessions:null},version:0})]]);let denied=false;
 const storage={getItem:(k:string)=>entries.get(k)??null,setItem:(k:string,v:string)=>{if(denied)throw new DOMException('full','QuotaExceededError');entries.set(k,v);},removeItem:(k:string)=>entries.delete(k)};
 Object.defineProperty(globalThis,'window',{value:globalThis,configurable:true});Object.defineProperty(globalThis,'localStorage',{value:storage,configurable:true});
 const raw=entries.get('socialcoach.v1');const {useApp}=await import('../../src/store/useApp');await new Promise<void>(resolve=>queueMicrotask(resolve));
 assert.equal(useApp.getState().storageIssue,'unreadable');assert.ok(Array.isArray(useApp.getState().sessions));assert.equal(entries.get('socialcoach.v1'),raw);
 entries.set('socialcoach.v1',JSON.stringify({state:{sessions:[practice(1,1)]},version:0}));await useApp.persist.rehydrate();assert.equal(useApp.getState().storageIssue,null);
 const before=entries.get('socialcoach.v1');denied=true;useApp.getState().appendMessage('s1',{id:'new',role:'learner',text:'保留这句新话。',ts:2});await new Promise<void>(resolve=>queueMicrotask(resolve));
 assert.equal(useApp.getState().saveIssue,'quota');assert.equal(entries.get('socialcoach.v1'),before);assert.ok(useApp.getState().sessions[0].messages.some(m=>m.id==='new'));
 denied=false;useApp.getState().retrySave();await new Promise<void>(resolve=>queueMicrotask(resolve));assert.equal(useApp.getState().saveIssue,null);assert.ok(entries.get('socialcoach.v1')!.includes('保留这句新话。'));
});

test('backup preview accepts both export formats, strips credentials and rejects unsupported versions',async()=>{
 const session=practice(1,2);
 const old=await decodeBackup(JSON.stringify({profile:null,sessions:[session],proficiency:{communication:2.5},apiKey:'must-not-import'}));assert.equal(old.archive.sessions.length,1);assert.equal('apiKey' in old.archive,false);
 const current=await decodeBackup(JSON.stringify({state:{sessions:[session],settings:{tts:false,apiKey:'must-not-import'}},version:0}));assert.equal('apiKey' in current.archive.settings,false);
 await assert.rejects(decodeBackup(JSON.stringify({state:{sessions:[]},version:99})));
 await assert.rejects(decodeBackup(JSON.stringify({state:{sessions:null},version:0})));
});
test('backup merge keeps current preferences, adds independent records, and refuses ambiguous ID collisions',()=>{
 const a=parseArchive({sessions:[practice(1,2)],settings:{tts:false}}),b=parseArchive({sessions:[practice(2,1)],settings:{tts:true}});
 const merged=mergeArchives(a,b);assert.equal(merged.sessions.length,2);assert.equal(merged.settings.tts,false);
 const conflict=parseArchive({sessions:[{...practice(1,2),messages:[{id:'changed',role:'learner',text:'另一个版本。',ts:2}]}]});
 assert.throws(()=>mergeArchives(a,conflict),/backup-conflict/);assert.equal(a.sessions[0].messages[0].text,quote);
});

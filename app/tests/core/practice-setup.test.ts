import assert from 'node:assert/strict';
import {test} from 'node:test';
import {SCENARIOS} from '../../src/data/corpus';
import {fitRoles} from '../../src/lib/tasks/role-fit';
import {hasAssessableSpeech,practiceIntentContext} from '../../src/lib/practice-intent';
import {TaskInputSchemas} from '../../src/lib/task-input';
import {eventSchema} from '../../src/lib/analytics/schema';
import {assessmentDeadline} from '../../src/lib/assessment-delivery';
import type {LLM} from '../../src/lib/llm-core';

test('unsupported role compatibility stays uncertain instead of inventing biographical fit',async()=>{
 const scenario=SCENARIOS[0],characterId=scenario.characters.find(c=>c.playable)!.id;
 const profile={name:'Test',bio:'我没有管理下属的权限，也不想扮演领导。',goals:scenario.skills,contexts:[scenario.context],lang:'zh' as const,createdAt:1};
 const stub=(fit:string,evidence:string):LLM=>({chatStream:()=>{throw Error('unused');},chatText:async()=>JSON.stringify({fits:[{scenarioId:scenario.id,characterId,fit,evidence,reason:'This role is supported.'}]})});
 const unsupported=await fitRoles([scenario],profile,'zh',stub('compatible',''), 'fake');
 assert.equal(unsupported[0].fit,'uncertain');assert.equal(unsupported[0].evidence,'');
 const fabricated=await fitRoles([scenario],profile,'zh',stub('compatible','我是团队主管'), 'fake');
 assert.equal(fabricated[0].fit,'uncertain');
 const conflict=await fitRoles([scenario],profile,'zh',stub('conflict','不想扮演领导'),'fake');
 assert.equal(conflict[0].fit,'conflict');
});

test('a preference is labelled as setup, never substituted for actual speech',()=>{
 assert.equal(hasAssessableSpeech([{id:'x',role:'learner',text:'  \n',ts:1}]),false);
 assert.equal(hasAssessableSpeech([{id:'x',role:'npc',text:'I agree',ts:1}]),false);
 assert.match(practiceIntentContext('说清边界'),/not a spoken turn/);
 const scenario=SCENARIOS[0],learnerCharacterId=scenario.characters.find(c=>c.playable)!.id;
 const body={scenario,learnerCharacterId,messages:[],lang:'zh',goals:scenario.skills,practiceIntent:'x'.repeat(301)};
 assert.equal(TaskInputSchemas.assess.safeParse(body).success,false);
 assert.equal(TaskInputSchemas.assess.safeParse({...body,practiceIntent:'先问清楚'}).success,true);
});

test('assessment correlation accepts only metadata, rejecting intent and conversation text',()=>{
 const event={name:'assessment_stage',ts:1,session:'abcd',scenario:'custom',mode:'rehearse',request:'0967cab7-f8f7-48a7-bddc-03a183de3b77',stage:'failed',duration_ms:123,status:504,byok:false};
 assert.equal(eventSchema.safeParse(event).success,true);
 assert.equal(eventSchema.safeParse({...event,practiceIntent:'private'}).success,false);
 assert.equal(eventSchema.safeParse({...event,error:'private transcript'}).success,false);
});

test('a stalled review times out, while caller cancellation retains its original reason',async()=>{
 const stalled=(signal:AbortSignal)=>new Promise<never>((_,reject)=>{signal.addEventListener('abort',()=>reject(signal.reason),{once:true});});
 await assert.rejects(assessmentDeadline(stalled,'zh',undefined,10),e=>(e as {status:number}).status===504);
 const controller=new AbortController(),cancelled=assessmentDeadline(stalled,'en',controller.signal);
 const reason=new DOMException('Left the review','AbortError');controller.abort(reason);
 await assert.rejects(cancelled,e=>e===reason);
});

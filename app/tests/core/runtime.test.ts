import assert from 'node:assert/strict';
import {test} from 'node:test';
import {z} from 'zod';
import {taskLLM} from '../../src/lib/task-runtime';
import {readTaskBody,MAX_TASK_BODY} from '../../src/lib/task-input';
import {runReflect} from '../../src/lib/tasks/reflect';
import {reservedTokens,requiresBudgetSetup} from '../../src/lib/shared-budget';
import {roleplayOutput} from '../../src/lib/roleplay-output';
import {eventSchema} from '../../src/lib/analytics/schema';
import {SCENARIOS} from '../../src/data/corpus';
import type {LLM,ChatOpts} from '../../src/lib/llm-core';
const opts:ChatOpts={system:'test',messages:[{role:'user',content:'test'}],maxTokens:100};
test('one task cancellation reaches every repair and stops further model calls',async()=>{
 let calls=0,received:AbortSignal|undefined;
 const stub:LLM={chatText:async o=>{calls++;received=o.signal;return '{}';},chatStream:()=>{throw Error('not used');}};
 const abort=new AbortController(),llm=taskLLM(stub,'roleplay',abort.signal);
 await llm.chatText(opts);assert.ok(received);abort.abort();assert.equal(received.aborted,true);
 await assert.rejects(llm.chatText(opts));assert.equal(calls,1);
});
test('all repairs share one call and input budget',async()=>{
 let calls=0;const llm=taskLLM({chatText:async()=>{calls++;return '{}';},chatStream:()=>{throw Error('unused');}},'hint');
 await llm.chatText(opts);await assert.rejects(llm.chatText(opts));assert.equal(calls,1);
 await assert.rejects(taskLLM({chatText:async()=>'',chatStream:()=>{throw Error('unused');}},'hint').chatText({...opts,messages:[{role:'user',content:'x'.repeat(256001)}]}));
});
test('missing content-length cannot bypass the body limit and malformed JSON is a 400',async()=>{
 await assert.rejects(readTaskBody(new Request('http://local',{method:'POST',body:'x'.repeat(MAX_TASK_BODY+1)}),z.unknown()),e=>(e as {status:number}).status===413);
 await assert.rejects(readTaskBody(new Request('http://local',{method:'POST',body:'{broken'}),z.unknown()),e=>(e as {status:number}).status===400);
});
test('production generation requires shared budget and reservation covers SDK retries',()=>{
 assert.equal(requiresBudgetSetup({NODE_ENV:'production'}),true);
 assert.equal(requiresBudgetSetup({NODE_ENV:'production',LLM_BUDGET_REDIS_URL:'http://test',LLM_BUDGET_REDIS_TOKEN:'test'}),false);
 assert.ok(reservedTokens(opts)>opts.maxTokens*3);
});
test('reflection never emits an unquoted draft and verified replies lead with actual words',async()=>{
 const scenario=SCENARIOS[0],answer='我现在需要先确认自己的安排。';let emitted='';
 const input={scenario,answer,question:'你当时怎么想？',lang:'zh' as const};
 const invalid:LLM={chatText:async()=>JSON.stringify({evidence:'你总是讨好别人。',answer:'你一直在让步。',sources:[]}),chatStream:()=>{throw Error('unused');}};
 await assert.rejects(runReflect(input,invalid,'fake',d=>emitted+=d));assert.equal(emitted,'');
 const valid:LLM={...invalid,chatText:async()=>JSON.stringify({evidence:answer,answer:['你想先确认安排。'],example:'',sources:[]})};
 const reply=await runReflect(input,valid,'fake');assert.ok(reply.startsWith('“'+answer+'”'));
});
test('a global revealed flag cannot invent a per-character public disclosure',()=>{
 const scenario=SCENARIOS.find(s=>s.characters.some(c=>c.hidden))!,learner=scenario.characters.find(c=>c.playable)!,npc=scenario.characters.find(c=>c.id!==learner.id)!;
 const raw={meta:{objectives:scenario.objectives.map(()=>true),ended:false,stance:100,revealed:true},utterances:[{characterId:npc.id,text:'我还没有同意，也没有说出私下原因。'}]};
 const output=roleplayOutput(scenario,learner.id,'zh').complete(JSON.stringify(raw));assert.ok(output.includes('"revealed":false'));assert.ok(output.includes('"objectives":['+scenario.objectives.map(()=>false).join(',')+']'));
});
test('new analytics accept UUID practice association but reject dialogue or private fields',()=>{
 const event={name:'practice_stage',ts:1,mode:'3d',practice:'0967cab7-f8f7-48a7-bddc-03a183de3b77',scenario:'3d-work-toast',stage:'first_reply',duration_ms:20,turns:1,byok:false};
 assert.ok(eventSchema.safeParse(event).success);assert.equal(eventSchema.safeParse({...event,transcript:'private'}).success,false);
});

test('reflection cannot cite an older turn instead of the submitted answer',async()=>{
 const answer='我意识到这会影响我的周末安排。',old='我当时没有答应。';
 const llm:LLM={chatText:async()=>JSON.stringify({evidence:old,answer:['你在确认安排。'],example:'',sources:[]}),chatStream:()=>{throw Error('unused');}};
 await assert.rejects(runReflect({scenario:SCENARIOS[0],lang:'zh',question:'怎么想？',answer,messages:[{id:'old',role:'learner',text:old,ts:1}]},llm,'fake'));
});

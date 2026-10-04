import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SaveSchema,opening,scriptedReply,type Message} from '../../src/features/dinner/lib/engine';
import {dinnerPayload,parseDinnerInput,runDinner} from '../../src/features/dinner/lib/director';
import {scenarios} from '../../src/features/dinner/lib/content';
import type {LLM} from '../../src/lib/llm-core';

const scene=scenarios[0];
const history:Message[]=[opening(scene,'zh'),{role:'user',text:'我开车不喝酒，茶是敬意不是交付保证。'},{role:'npc',speakerId:'chen',text:'茶可以。交付还得谈。',story:{topic:'deadline',beat:'bridge'}}];
const body={scenarioId:'work' as const,variantId:'work-toast' as const,lang:'zh' as const,text:'林姐，我说的是检查，不是保证上线。',history};
const save={version:1,scenarioId:'work',variantId:'work-toast',messages:history,started:true,complete:false,lang:'zh',draft:''};
function fake(answers:unknown[],capture?: ()=>void):LLM{let n=0;return {chatText:async ()=>{capture?.();return JSON.stringify(answers[Math.min(n++,answers.length-1)]);},chatStream:()=>{throw Error('unused');}};}

test('a partial win and its actual development survive save/restore and the next model payload',()=>{
 const restored=SaveSchema.parse(save);
 const request=parseDinnerInput({...body,history:restored.messages});
 const payload=dinnerPayload(request);
 assert.deepEqual(payload.history[2].story,{topic:'deadline',beat:'bridge'});
 assert.equal(payload.history[1].text,history[1].text);
 assert.equal(payload.current_player_turn.text,body.text);
 assert.deepEqual(payload.playerEvidence,[history[1].text]);
 assert.equal('completed' in payload.history[2].story!,false);
});
test('legacy transcripts without development ids retain their actual words, without guessed progress',()=>{
 const legacy={...save,messages:history.map(({story,...m})=>({...m,...(story?{story:{topic:story.topic}}:{})}))};
 const restored=SaveSchema.parse(legacy),payload=dinnerPayload(parseDinnerInput({...body,history:restored.messages}));
 assert.equal(payload.history[2].story?.beat,undefined);
 assert.equal(payload.history[2].text,history[2].text);
});
test('another opening’s development and user-authored fake progress cannot enter a save',()=>{
 assert.equal(SaveSchema.safeParse({...save,messages:history.map((m,i)=>i===2?{...m,story:{topic:'deadline',beat:'care'}}:m)}).success,false);
 assert.equal(SaveSchema.safeParse({...save,messages:history.map((m,i)=>i===1?{...m,story:{topic:'deadline',beat:'message'}}:m)}).success,false);
});
test('a development from another opening is repaired on the same turn, and a second invalid draft stays unsaved',async()=>{
 const good={...scriptedReply(scene,body.text,2,'zh',undefined,undefined,{history}),speakerId:'lin',replyTo:body.text,story:{topic:'deadline',beat:'message'}};
 let calls=0;
 const answer=await runDinner(body,fake([{...good,story:{topic:'deadline',beat:'care'}},good],()=>calls++),'fast');
 assert.equal(calls,2);assert.equal(answer.story?.beat,'message');assert.equal(history.length,3);
 await assert.rejects(runDinner(body,fake([{...good,story:{topic:'deadline',beat:'care'}}]),'fast'));
 assert.equal(history.length,3);
});

test('known cross-opening leaks are blocked without rejecting an actual player-supplied artifact',async()=>{
 const {sceneFactError}=await import('../../src/features/dinner/lib/fact-boundary');
 assert.ok(sceneFactError('elevator-privacy','你手上那份材料归不归你核？',['谈话内容不分享']));
 assert.equal(sceneFactError('elevator-privacy','那份材料归谁核？',['我想谈那份材料的负责人']),undefined);
 assert.ok(sceneFactError('office-interruption','六点半要给客户。',['我还没讲完']));
 assert.equal(sceneFactError('office-interruption','六点半先给客户？',['我提议六点半给客户']),undefined);
 assert.ok(sceneFactError('elevator-blame','日志我碰不到，也没核过。',['权限还没核对']));
 assert.ok(sceneFactError('elevator-blame','日志我查不了，权限拿不到。',['日志访问还未知']));
 assert.ok(sceneFactError('elevator-blame','我没有日志权限。',['权限还未确认']));
 assert.ok(sceneFactError('elevator-blame','I have no access to the logs.',['Access is unconfirmed.']));
 assert.ok(sceneFactError('elevator-blame','原因我不知道，日志我也没权限看。',['这里没有日志']));
 assert.ok(sceneFactError('elevator-blame','权限和日志我没后台，接不了。',['您能核对经手内容吗']));
 assert.ok(sceneFactError('elevator-blame','报告今晚就要往上走，等不起。',['先查原因']));
 assert.equal(sceneFactError('elevator-blame','我提议今晚先报待查，可以吗？',['先查原因']),undefined);
 assert.equal(sceneFactError('elevator-blame','如果今晚必须上报，先写待核。',['先查原因']),undefined);
 assert.ok(sceneFactError('work-toast','复测我能做，但明早才排得上。',['请确认复测范围']));
 assert.equal(sceneFactError('work-toast','我提议明早复测，过不过未知。',['请确认复测范围']),undefined);
 assert.equal(sceneFactError('elevator-blame','如果我没有日志权限，就先申请核对。',['先核事实']),undefined);
 assert.equal(sceneFactError('elevator-blame','日志我查不了吗？',['先核事实']),undefined);
 assert.equal(sceneFactError('elevator-blame','If I have no access to the logs, I can ask for a check.',['Access is unconfirmed.']),undefined);
 assert.equal(sceneFactError('elevator-blame','日志权限还没核对，我提议先查。',['先核事实']),undefined);
 assert.ok(sceneFactError('office-interruption','数据来源是上周的表。',['数据查过没有？']));
 assert.ok(sceneFactError('office-overtime','排版算你一句准话。',['我能讨论排版，没答应负责。']));
 assert.equal(sceneFactError('office-overtime','排版你接不接？',['我能讨论排版']),undefined);
 assert.equal(sceneFactError('office-overtime','排版算你一句准话。',['主方案排版我接']),undefined);
 assert.ok(sceneFactError('school-workload','你明确答应的只有演示和答辩提纲。',['我可以谈演示，答辩没答应']));
 assert.equal(sceneFactError('school-workload','答辩你接不接？',['我只谈演示']),undefined);
 assert.equal(sceneFactError('school-workload','你答应的是演示，不是答辩。',['我只接演示']),undefined);
 assert.equal(sceneFactError('school-workload','你答应过答辩吗？',['我只谈演示']),undefined);
 assert.equal(sceneFactError('school-workload','你答应做答辩。',['我负责答辩']),undefined);
});

test('a valid answer to an already active opening moment is kept without replaying it or making a second request',async()=>{
 const value={...body,text:'陈总，我开车不喝酒，但可以敬茶。',history:[opening(scene,'zh')]};
 const result={...scriptedReply(scene,value.text,1,'zh'),replyTo:value.text,story:{topic:'toast',event:'work-toast',beat:'bridge'}};
 let calls=0;
 const reply=await runDinner(value,fake([result],()=>calls++),'fast');
 assert.equal(calls,1);assert.equal(reply.text,result.text);assert.equal(reply.story?.event,undefined);assert.equal(reply.story?.beat,'bridge');
 const later={...value,history:[...history,{role:'user' as const,text:'先确认范围'},{role:'npc' as const,...result,story:{topic:'deadline' as const,event:'work-deadline' as const}}]};
 const fromHistory=await runDinner(later,fake([{...result,story:{topic:'deadline',event:'work-deadline'}}]),'fast');
 assert.equal(fromHistory.story?.event,undefined);
 // An unseen moment still cannot be requested prematurely.
 await assert.rejects(runDinner(value,fake([{...result,story:{topic:'deadline',event:'work-deadline'}}]),'fast'));
});

test('a development copied into topic is classified locally without accepting a foreign subject or changing speech',async()=>{
 const office=scenarios.find(s=>s.id==='office')!,text='何主管，邮件要主方案和数据摘要，先谈哪个优先。';
 const value={scenarioId:'office',variantId:'office-overtime',lang:'zh',text,history:[opening(office,'zh','office-overtime')]};
 const result={...scriptedReply(office,text,1,'zh'),replyTo:text,text:'主方案和数据摘要都要，先谈哪部分可以确认。',story:{topic:'priority',beat:'priority'}};
 let calls=0;
 const reply=await runDinner(value,fake([result],()=>calls++),'fast');
 assert.equal(calls,1);assert.equal(reply.text,result.text);assert.equal(reply.story?.topic,'workload');assert.equal(reply.story?.beat,'priority');
 await assert.rejects(runDinner(value,fake([{...result,story:{topic:'privacy',beat:'priority'}}]),'fast'));
 await assert.rejects(runDinner(value,fake([{...result,story:{topic:'care',beat:'care'}}]),'fast'));
});

import assert from 'node:assert/strict';
import {test} from 'node:test';
import {runPattern} from '../../src/lib/tasks/pattern';
import {runRehearse} from '../../src/lib/tasks/rehearse';
import type {LLM} from '../../src/lib/llm-core';

const stub=(value:unknown):LLM=>({chatText:async()=>JSON.stringify(value),chatStream:()=>{throw Error('not used');}});
const quote='算了，我知道预算紧，你别为难。';
const sessions=[1,2].map(n=>({sessionId:`s${n}`,title:'同一场景',at:n,gaveGroundOn:[],turns:1,weaknesses:[{behavior:'撤回请求',evidence:quote,messageId:`m${n}`,skill:'communication',deficit:'performance'}]}));
const result={found:true,pattern:'撤回请求',why:'重复行为',nextStep:'保留自己的决定',evidence:sessions.map(s=>({sessionId:s.sessionId,messageId:s.weaknesses[0].messageId,title:s.title,quote}))};

test('same-title independent sessions can support a pattern',async()=>{
 const r=await runPattern({lang:'zh',goals:['communication'],sessions},stub(result),'fake');
 assert.equal(r.found,true);
});
test('a quote with a fabricated suffix cannot support a pattern',async()=>{
 const independent=sessions.map((s,i)=>({...s,title:`场景${i}`}));
 const r=await runPattern({lang:'zh',goals:['communication'],sessions:independent},stub({...result,evidence:result.evidence.map((e,i)=>({...e,title:independent[i].title,quote:e.quote+'我同意无条件加班。'}))}),'fake');
 assert.equal(r.found,false);
});
test('one practice saved twice is not two independent instances',async()=>{
 const samePractice=sessions.map((s,i)=>({...s,title:`快照${i}`,practiceId:'one-practice'}));
 const r=await runPattern({lang:'zh',goals:['communication'],sessions:samePractice},stub({...result,evidence:result.evidence.map((e,i)=>({...e,title:samePractice[i].title}))}),'fake');
 assert.equal(r.found,false);
});
test('an incomplete generated scenario fails at the task boundary',async()=>{
 await assert.rejects(runRehearse({lang:'zh',description:'明天我要拒绝主管让我周末加班的要求。'},stub({skills:['communication'],characters:[]}),'fake'));
});

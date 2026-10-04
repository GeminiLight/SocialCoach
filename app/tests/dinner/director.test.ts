import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDinnerInput, runDinner } from '../../src/features/dinner/lib/director';
import { scenarios } from '../../src/features/dinner/lib/content';
import { opening, scriptedReply, renderedCue } from '../../src/features/dinner/lib/engine';
import { createWorld, roomContext } from '../../src/features/dinner/lib/room';
import { createDrama, syncDrama, chooseDrama, dinnerContext } from '../../src/features/dinner/lib/drama';
import type { ChatOpts, LLM } from '../../src/lib/llm-core';

const scene=scenarios[0];
const input={scenarioId:'work',lang:'zh',text:'我用茶敬您',history:[opening(scene,'zh')]};
const reply={...scriptedReply(scene,input.text,1,'zh'),replyTo:input.text};
function model(answer:unknown, capture?:(o:ChatOpts)=>void):LLM {
  return {chatText:async o=>{capture?.(o);return '```json\n'+JSON.stringify(answer)+'\n```';},chatStream:()=>{throw new Error('Unexpected stream');}};
}

test('3D uses the shared JSON task and selected fast model, with no SDK structured format',async()=>{
  let captured:ChatOpts|undefined;
  const signal=new AbortController().signal;
  assert.deepEqual(await runDinner(input,model(reply,o=>{captured=o;}),'my-fast-model',signal),{...reply,cue:renderedCue(reply,scene,'zh')});
  assert.equal(captured?.model,'my-fast-model');assert.equal(captured?.signal,signal);
  assert.equal('output_config' in captured!,false);assert.equal('response_format' in captured!,false);
  assert.ok(captured?.messages[0].content.includes(input.text));
});
test('unknown or duplicate room actors never reach a model',()=>{
  const room=roomContext(createWorld(scene));
  assert.throws(()=>parseDinnerInput({...input,room:{...room,nearbyCharacterId:'fake'}}));
  assert.throws(()=>parseDinnerInput({...input,room:{...room,npcs:room.npcs.map(n=>({...n,characterId:room.npcs[0].characterId}))}}));
});
test('only paired dialogue from the scene cast is accepted',()=>{
  assert.throws(()=>parseDinnerInput({...input,history:[{role:'npc',speakerId:'fake',text:'Hi'}]}));
  assert.throws(()=>parseDinnerInput({...input,history:[...input.history,{role:'user',text:'Hi'}]}));
  assert.throws(()=>parseDinnerInput({...input,text:'a'.repeat(501)}));
});
test('observed choices reach the director without implying drinking or a concession',async()=>{
  const world=createWorld(scene),drama=createDrama();syncDrama(drama,scene,0,true,false);chooseDrama(drama,'tea',world,0);
  const dinner=dinnerContext(drama)!;
  let prompt='';await runDinner({...input,dinner},model(reply,o=>{prompt=JSON.stringify(o.system);}), 'fast');
  assert.ok(prompt.includes('not proof of drinking'));assert.ok(prompt.includes('not agreement to a date'));assert.ok(prompt.includes('not an agreement on credit'));
  assert.throws(()=>parseDinnerInput({...input,dinner:{...dinner,eventId:'family-phone'}}));
  assert.throws(()=>parseDinnerInput({...input,dinner:{...dinner,previous:[]}}));
});
test('future events cannot be passed off as completed actions',()=>{
  assert.throws(()=>parseDinnerInput({...input,dinner:{eventId:'work-deadline',phase:'reacting',choice:'calendar',previous:[{eventId:'work-deadline',choice:'calendar',turn:2,posture:'seated',zone:'table'}]}}));
});
test('a model cannot invent actors or omit reactions',async()=>{
  await assert.rejects(runDinner(input,model({...reply,speakerId:'fake'}),'fast'));
  await assert.rejects(runDinner(input,model({...reply,reactions:reply.reactions.slice(1)}),'fast'));
});
test('cancellation stops before the provider and rejects late responses',async()=>{
  const controller=new AbortController();controller.abort();let called=false;
  await assert.rejects(runDinner(input,model(reply,()=>{called=true;}),'fast',controller.signal));assert.equal(called,false);
  const active=new AbortController();await assert.rejects(runDinner(input,model(reply,()=>active.abort()),'fast',active.signal));
});
test('provider failures propagate without silently substituting scripted dialogue',async()=>{
  const failing:LLM={chatText:async()=>{throw new Error('Provider failed');},chatStream:()=>{throw new Error('Unexpected');}};
  await assert.rejects(runDinner(input,failing,'fast'),/Provider failed/);
});

test('a natural closing proposal survives only with both current spoken quotations',async()=>{
  const text='今天先到这里，剩下的测试明天核对。';
  const closing={...reply,replyTo:'今天先到这里',text:'行，明天拿到测试结果再定上线。',closure:{kind:'deferred',learnerQuote:'今天先到这里',npcQuote:'明天拿到测试结果再定上线'}};
  const result=await runDinner({...input,text},model(closing),'fast');
  assert.deepEqual(result.closure,closing.closure);
  await assert.rejects(runDinner({...input,text},model({...closing,closure:{...closing.closure,learnerQuote:'我答应周三上线'}}),'fast'));
  await assert.rejects(runDinner({...input,text},model({...closing,closure:{...closing.closure,npcQuote:'问题已经全部解决'}}),'fast'));
});

test('a closing NPC interjection can supply the actual closing quotation',async()=>{
  const text='先吃饭吧，相亲这件事就到这里。';
  const family=scenarios.find(s=>s.id==='family')!;
  const answer={speakerId:family.characters[1].id,replyTo:'先吃饭吧',text:'好，饭后聊你自己的近况。',interjection:{speakerId:family.characters[2].id,text:'先吃饭，相亲今天就不再说了。'},reactions:family.characters.map(c=>({characterId:c.id,emotion:'neutral',gesture:'idle'})),closure:{kind:'boundary',learnerQuote:'相亲这件事就到这里',npcQuote:'相亲今天就不再说了'}};
  const result=await runDinner({scenarioId:'family',lang:'zh',text,history:[opening(family,'zh')]},model(answer),'fast');
  assert.deepEqual(result.closure,answer.closure);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scenarios } from '../../src/features/dinner/lib/content';
import { opening, SaveSchema, scriptedReply, type Message } from '../../src/features/dinner/lib/engine';
import { parseDinnerInput, runDinner, dinnerPrompt } from '../../src/features/dinner/lib/director';
import { variants, storyScenario, nextDinnerLimit, addressedCharacter, storyHint } from '../../src/features/dinner/lib/story';
import { createDrama, syncDrama, settleForSpeech, chooseDrama, eventDialogue, dinnerContext, actionEvidence } from '../../src/features/dinner/lib/drama';
import { createWorld, roomContext } from '../../src/features/dinner/lib/room';
import type { ChatOpts, LLM } from '../../src/lib/llm-core';

const base=scenarios[0];
function transcript(turns:number){const messages:Message[]=[opening(base,'zh')];for(let i=0;i<turns;i++)messages.push({role:'user',text:`第${i+1}句，我还没有承诺上线。`},{role:'npc',speakerId:'chen',text:`第${i+1}次回应，继续核对条件。`,story:{topic:'deadline'}});return messages;}
const request=(turns:number,maxTurns=24)=>({scenarioId:'work',variantId:'work-toast',maxTurns,lang:'zh',text:'我还想确认条件',history:transcript(turns)});
function fake(answer:unknown,capture?:(o:ChatOpts)=>void):LLM{return {chatText:async o=>{capture?.(o);const latest=JSON.parse(o.messages[0].content as string).current_player_turn.text;return JSON.stringify({...answer as object,replyTo:(answer as {replyTo?:string}).replyTo??latest});},chatStream:()=>{throw Error('no stream');}};}

test('fifth, twelfth, eighteenth and twenty-fourth turns can be requested and restored',()=>{
 for(const n of [5,12,18,24]){assert.equal(parseDinnerInput(request(n-1)).history.length,2*n-1);const messages=transcript(n);const restored=SaveSchema.parse({version:1,scenarioId:'work',variantId:'work-toast',maxTurns:24,messages,started:true,complete:n===24,lang:'zh',draft:''});assert.equal(restored.messages.length,2*n+1);}
 assert.throws(()=>parseDinnerInput(request(24)));assert.throws(()=>parseDinnerInput(request(12,12)));assert.doesNotThrow(()=>parseDinnerInput(request(12,nextDinnerLimit(12))));assert.equal(nextDinnerLimit(24),24);
});
test('old completed four-turn saves remain readable and can be extended without replacing evidence',()=>{
 const messages=transcript(4);const saved=SaveSchema.parse({version:1,scenarioId:'work',messages,started:true,complete:true,lang:'zh',draft:''});assert.deepEqual(saved.messages,messages);assert.doesNotThrow(()=>parseDinnerInput({...request(4),history:saved.messages}));
});
test('driving boundary, follow-up and named teammate stay connected past turn four',()=>{
 const history:Message[]=[opening(base,'zh')];
 for(const [i,text] of ['我今天开车，不能喝酒。','我说的就是开车。','陈总，我不想反复解释喝酒这件事。','小周，请说明我今晚开车。','林姐，具体有哪些测试没过？','如果明早测试不过，哪些范围能先交付？'].entries()){
  const reply=scriptedReply(base,text,i+1,'zh',undefined,undefined,{history});
  if(i<3){assert.equal(reply.story?.topic,'toast');assert.doesNotMatch(reply.text,/就这一杯|周三上线|是不是不给/);}
  if(i===3)assert.equal(reply.speakerId,'zhou');if(i===4)assert.equal(reply.speakerId,'lin');
  history.push({role:'user',text},{role:'npc',...reply});
 }
 assert.equal(history.length,13);assert.equal(history.at(-1)?.story?.topic,'scope');
});
test('all six openings have bilingual 18-turn trajectories with retained topic and no foreign actors',()=>{
 for(const variant of variants)for(const lang of ['zh','en'] as const){
  const scene=storyScenario(scenarios.find(s=>s.id===variant.scene)!,variant),history:Message[]=[opening(scene,lang,variant.id)];
  assert.equal(history[0].text,variant.opening[lang]);
  for(let n=1;n<=18;n++){
   const topic=history.at(-1)?.story?.topic??variant.topic;
   const text=storyHint(topic,lang)[n%2];const targetId=scene.characters[n%3].id;
   const result=scriptedReply(scene,text,n,lang,undefined,undefined,{history,variantId:variant.id,targetId});
   assert.equal(result.speakerId,targetId);assert.equal(result.reactions.length,3);
   history.push({role:'user',text,targetId},{role:'npc',...result});
  }
  assert.equal(SaveSchema.safeParse({version:1,scenarioId:scene.id,variantId:variant.id,maxTurns:18,messages:history,started:true,complete:true,lang,draft:''}).success,true);
 }
});
test('turn number alone cannot interrupt dialogue and a gesture cannot insert a canned NPC claim',()=>{
 const d=createDrama(),world=createWorld(base);syncDrama(d,base,0,true,false);const before=opening(base,'zh').text;
 chooseDrama(d,'tea',world,0);assert.equal(eventDialogue(d,'zh'),undefined);assert.equal(actionEvidence(d.records[0],'zh').reply,undefined);assert.equal(opening(base,'zh').text,before);
 settleForSpeech(d);for(let n=1;n<10;n++)syncDrama(d,base,n,true,false);assert.equal(d.active,'work-toast');
 syncDrama(d,base,10,true,false,{requestedEvent:'work-deadline'});assert.equal(d.active,'work-deadline');
});
test('privacy and workload openings cannot accidentally start the old toast',()=>{
 for(const variant of variants.filter(v=>!v.openingEvent)){const d=createDrama(),scene=scenarios.find(s=>s.id===variant.scene)!;syncDrama(d,scene,0,true,false,{openingEvent:null});assert.equal(d.active,undefined);}
 assert.throws(()=>parseDinnerInput({...request(0),variantId:'family-privacy'}));
});
test('exact earlier utterances, action interjections and current context all reach the model',async()=>{
 const history=transcript(11),heard={speakerId:'lin',text:'我问的是客户范围，不是酒。',cue:'林姐朝前倾身。'};
 history[1]={...history[1],heard,targetId:'lin'};
 let captured:ChatOpts|undefined;
 const reply=scriptedReply(base,'林姐，先确认范围。',12,'zh');
 await runDinner({...request(11,18),text:'林姐，先确认范围。',targetId:'lin',history,heard,room:roomContext(createWorld(base))},fake(reply,o=>captured=o),'fast');
 const payload=JSON.parse(captured!.messages[0].content as string);
 assert.equal(payload.history[1].heard.text,heard.text);assert.equal(payload.history[1].text,history[1].text);assert.equal(payload.history.length,23);assert.equal(payload.heard.text,heard.text);
 const prompt=JSON.stringify(captured!.system);assert.match(prompt,/12 of a 18-turn/);assert.match(prompt,/must be the speaker/);assert.match(prompt,/full|entire transcript/);
});
test('unavailable events, wrong addressed speaker and foreign topics fail visibly',async()=>{
 const reply=scriptedReply(base,'我不喝',1,'zh');
 await assert.rejects(runDinner({...request(0),targetId:'lin'},fake(reply),'fast'));
 await assert.rejects(runDinner(request(0),fake({...reply,story:{topic:'toast',event:'work-deadline'}}),'fast'));
 await assert.rejects(runDinner(request(5),fake({...reply,story:{topic:'privacy'}}),'fast'));
 const d=createDrama();syncDrama(d,base,0,true,false);settleForSpeech(d);syncDrama(d,base,5,true,false,{requestedEvent:'work-deadline'});
 await assert.rejects(runDinner({...request(5),dinner:dinnerContext(d)},fake({...reply,story:{topic:'deadline',event:'work-deadline'}}),'fast'));
});
test('third-person mentions are not mistaken for an addressee; explicit selection wins',()=>{
 assert.equal(addressedCharacter(base,'我跟小周一起做的，陈总您听我说'),undefined);
 assert.equal(addressedCharacter(base,'林姐，您希望先验收哪一项？'),'lin');
 assert.equal(addressedCharacter(base,'小周说要测试','chen'),'chen');
});
test('closing instructions follow selected length, never assume four turns',()=>{
 assert.match(dinnerPrompt(parseDinnerInput(request(3,12))),/Do not close the dinner prematurely/);
 assert.match(dinnerPrompt(parseDinnerInput(request(11,12))),/natural pause/);
 assert.doesNotMatch(dinnerPrompt(parseDinnerInput(request(4,18))),/turn 5 of 4/);
});

test('a full segment restores as paused even if interrupted before its completion flag persisted',()=>{
 const save=SaveSchema.parse({version:1,scenarioId:'work',maxTurns:12,messages:transcript(12),started:true,complete:false,lang:'zh',draft:''});assert.equal(save.complete,true);
});
test('an invalid draft is repaired once with the same player turn, never saved as a reply',async()=>{
 const reply=scriptedReply(base,'林姐，范围怎么确认？',3,'zh');let calls=0;
 const llm:LLM={chatText:async()=>JSON.stringify(++calls===1?{...reply,speakerId:'chen'}:{...reply,replyTo:'范围怎么确认'}),chatStream:()=>{throw Error('no stream');}};
 const result=await runDinner({...request(2),text:'林姐，范围怎么确认？',targetId:'lin'},llm,'fast');assert.equal(calls,2);assert.equal(result.speakerId,'lin');
});
test('a refusal prevents the phone moment and unrelated opening facts stay out of the prompt',()=>{
 const input=parseDinnerInput({scenarioId:'family',variantId:'family-introduction',maxTurns:12,lang:'zh',text:'我不看照片，也不加联系方式。',history:[opening(scenarios[1],'zh'),{role:'user',text:'不考虑相亲'},{role:'npc',speakerId:'aunt',text:'看看照片？',story:{topic:'introduction'}}]});
 const prompt=dinnerPrompt(input);assert.match(prompt,/Available optional physical moments: \[\]/);assert.doesNotMatch(prompt,/妈妈转述了|工作有变动/);
});

test('stage directions describe rendered gestures instead of invented eating or phone actions',async()=>{
 const reply={...scriptedReply(base,'我不喝',1,'zh'),cue:'陈总把手机扔出窗外，又夹了一筷子菜。'};
 const result=await runDinner({...request(0),text:'我不喝'},fake(reply),'fast');
 assert.doesNotMatch(result.cue,/手机|窗外|筷子/);assert.match(result.cue,/倾身/);
});

test('offline phone and photo moments follow explicit interest, not elapsed turns',()=>{
 const family=scenarios[1],school=scenarios[2];
 assert.equal(scriptedReply(family,'我想先看照片',5,'zh').story?.event,'family-phone');
 assert.equal(scriptedReply(family,'我不想看照片',5,'zh').story?.event,undefined);
 assert.equal(scriptedReply(school,'现在可以先拍合照',7,'zh').story?.event,'school-photo');
 assert.equal(scriptedReply(school,'先不要拍照',7,'zh').story?.event,undefined);
});

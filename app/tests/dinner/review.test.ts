import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildDinnerReview,matchesDinnerReview,dinnerReplayUrl} from '../../src/features/dinner/lib/review';
import {scenarios} from '../../src/features/dinner/lib/content';
import {variants,storyScenario,variantFor} from '../../src/features/dinner/lib/story';
import {opening,scriptedReply,SaveSchema,type Save} from '../../src/features/dinner/lib/engine';
import {createWorld,roomContext} from '../../src/features/dinner/lib/room';
import {createDrama,syncDrama,chooseDrama,dinnerContext} from '../../src/features/dinner/lib/drama';
import {validateSceneContext,sanitizeSceneNotes} from '../../src/lib/scene-context';
import {runAssess,sanitizeReport} from '../../src/lib/tasks/assess';
import {buildDebriefInput} from '../../src/lib/debrief-chat';
import {runDebriefChat} from '../../src/lib/tasks/debrief-chat';
import type {Report} from '../../src/lib/types';
import type {ChatOpts,LLM} from '../../src/lib/llm-core';
import {creditPracticeReport} from '../../src/lib/scene-credit';

export function reviewFixture(sceneId:Save['scenarioId']='work',lang:Save['lang']='zh',variantId=variantFor(sceneId).id):Save {
  const scene=storyScenario(scenarios.find(s=>s.id===sceneId)!,variantFor(sceneId,variantId));
  const text=lang==='zh'?'我只答应已确认的部分，其他安排先问我。':'I only agree to the confirmed part. Ask me before arranging anything else.';
  return SaveSchema.parse({version:1,scenarioId:sceneId,variantId,lang,maxTurns:12,started:true,complete:false,draft:'UNSENT_DRAFT_SENTINEL',view:'third',messages:[opening(scene,lang,variantId),{role:'user',text,targetId:scene.characters[0].id,room:roomContext(createWorld(scene))},{role:'npc',...scriptedReply(scene,text,1,lang)}]});
}

for(const v of variants)for(const lang of ['zh','en'] as const)test(`${v.id} / ${lang}: completed 3D evidence enters the common report without private state`,()=>{
  const save=reviewFixture(v.scene,lang,v.id),before=JSON.stringify(save),session=buildDinnerReview(save,'test',123);
  assert.equal(session.status,'ended');assert.deepEqual(session.objectiveDone,[]);assert.equal(session.learnerCharacterId,'you');
  assert.deepEqual(session.messages.filter(m=>m.role==='learner').map(m=>m.text),save.messages.filter(m=>m.role==='user').map(m=>m.text));
  assert.ok(session.scenario.custom);assert.ok(session.scenario.source.includes('wiki/'));assert.equal(session.scenario.characters.length,4);
  assert.ok(session.scenario.characters.every(c=>!c.hidden));assert.equal(session.sceneContext?.observations[0].turn,1);
  assert.deepEqual(validateSceneContext(session.sceneContext,session.messages),session.sceneContext);
  assert.ok(!JSON.stringify(session).includes('UNSENT_DRAFT_SENTINEL'));assert.ok(!JSON.stringify(session).includes('"third"'));
  assert.equal(JSON.stringify(save),before);assert.ok(matchesDinnerReview(session,save));
  assert.equal(dinnerReplayUrl(session.sceneContext!),`/3d?scene=${v.scene}&opening=${v.id}&restart=1`);
});

test('opening alone cannot generate an assessment; legacy saves and a cached report link remain readable',()=>{
  const save=reviewFixture();assert.throws(()=>buildDinnerReview({...save,messages:[save.messages[0]]},'none'));
  const legacy={...save};delete legacy.variantId;assert.ok(SaveSchema.safeParse(legacy).success);
  assert.ok(SaveSchema.safeParse({...save,reviewSessionId:'cd0f7e9e-335a-4c2f-a427-4aab275c7c68'}).success);
});
test('interjections are preserved once and a continued conversation invalidates the cached report',()=>{
  const save=reviewFixture(),scene=scenarios[0];
  save.messages[2].interjection={speakerId:'zhou',text:'这两项测试还没有通过。'};
  const next='小周，那两项具体卡在哪一步？';
  save.messages.push({role:'user',text:next,heard:{...save.messages[2].interjection}},{role:'npc',...scriptedReply(scene,next,2,'zh')});
  const session=buildDinnerReview(save,'test');assert.equal(session.messages.filter(m=>m.text==='这两项测试还没有通过。').length,1);
  save.messages.push({role:'user',text:'我先确认范围。'},{role:'npc',...scriptedReply(scene,'我先确认范围。',3,'zh')});
  assert.equal(matchesDinnerReview(session,save),false);
});
test('physical actions stay distinct from words and only preceding observed actions attach to a spoken turn',()=>{
  const save=reviewFixture(),scene=scenarios[0],world=createWorld(scene),drama=createDrama();
  syncDrama(drama,scene,0,true,false);assert.ok(chooseDrama(drama,'tea',world,0));
  save.messages[1].dinner=dinnerContext(drama);save.dinner=drama;
  const session=buildDinnerReview(save,'test');
  assert.equal(session.messages.filter(m=>m.role==='learner').length,1);
  assert.ok(session.sceneContext?.observations[0].facts.some(f=>f.includes('用茶')));
  assert.equal(session.sceneContext?.actions?.[0].afterTurn,0);
});
test('scene feedback rejects fabricated, NPC-only, wrong-turn and unknown observations',()=>{
  const session=buildDinnerReview(reviewFixture(),'test'),context=session.sceneContext!;
  const good={evidence:'我只答应已确认的部分',observationId:'spoken-1',note:'这句话守住了范围，指定回应对象仍不代表私聊。'};
  const bad=[{...good,evidence:session.messages[0].text},{...good,evidence:'我全部都同意'},{...good,observationId:'unknown'},{...good,note:''}];
  assert.deepEqual(sanitizeSceneNotes([...bad,good,good],context),[good]);
  const wrong={...context,observations:[{...context.observations[0],turn:2}]};assert.throws(()=>validateSceneContext(wrong,session.messages));
  assert.throws(()=>validateSceneContext({...context,observations:[...context.observations,...context.observations]},session.messages));
  assert.throws(()=>validateSceneContext({...context,actions:[{id:'future',afterTurn:2,action:'尚未发生的举杯'}]},session.messages));
  const action={id:'same',afterTurn:0,action:'用茶回应'};
  assert.throws(()=>validateSceneContext({...context,actions:[action,action]},session.messages));
  assert.deepEqual(sanitizeSceneNotes([good]),[]);
});

function reportFixture(quote:string):Report{return {scoringVersion:2,stars:2,ratings:[{skill:'communication',level:2,evidence:quote,reason:'说明自己愿意负责的范围。'}],outcome:'partial',verdictEvidence:quote,verdict:'你把承诺限定在已确认的范围里。',summary:`“${quote}”给出了明确限制。`,strengths:[{skill:'communication',evidence:quote,behavior:'明确范围'}],weaknesses:[],alternatives:[],knowledge:{theoryIds:[],caseIds:[],whyThis:''},reflectionQuestions:[],nextStep:'确认谁负责下一步。',deltas:{communication:.2},sceneNotes:[{evidence:quote,observationId:'spoken-1',note:'向领导说清限制，其他在场的人也能听见。'}]};}
test('3D uses the existing assessment task, verified ratings and knowledge retrieval; text reports stay compatible',async()=>{
  const session=buildDinnerReview(reviewFixture(),'test'),quote=session.messages.find(m=>m.role==='learner')!.text,raw=reportFixture(quote);
  let request:ChatOpts|undefined;
  const llm:LLM={chatText:async()=>{throw Error('Unexpected');},chatStream:o=>{request=o;return {deltas:(async function*(){yield JSON.stringify(raw);})(),text:()=>JSON.stringify(raw),refused:()=>false};}};
  const output=await runAssess({scenario:session.scenario,learnerCharacterId:'you',messages:session.messages,goals:session.scenario.skills,lang:'zh',sceneContext:session.sceneContext},llm,'same-smart');
  assert.equal(request?.model,'same-smart');assert.equal(output.ratings?.[0].level,2);assert.equal(output.sceneNotes?.length,1);
  assert.ok(request?.messages[0].content.includes('not tracked'));assert.ok(request?.messages[0].content.includes('spoken-1'));
  assert.ok(JSON.stringify(request?.system).includes('RETRIEVED KNOWLEDGE'));
  const text=sanitizeReport(raw,session.scenario,[],[],session.messages,session.scenario.skills,'zh');assert.equal(text.sceneNotes,undefined);assert.equal(text.stars,2);
  const controller=new AbortController();controller.abort();await assert.rejects(()=>runAssess({scenario:session.scenario,learnerCharacterId:'you',messages:session.messages,goals:[],lang:'zh'},llm,'same-smart',undefined,controller.signal));
});
test('3D follow-up assistant sees public observations and exact words, retaining the shared quote and source checks',async()=>{
  const session=buildDinnerReview(reviewFixture(),'test');session.report=reportFixture(session.messages[1].text);
  const input=buildDebriefInput(session,'走近领导说这句话，旁边的人还听得见吗？','zh');
  assert.deepEqual(input.sceneContext,session.sceneContext);assert.ok(!JSON.stringify(input).includes('"deltas"'));
  const output=await runDebriefChat(input,{chatText:async()=>JSON.stringify({evidence:session.messages[1].text,answer:['走近不会把这段对话变成私聊。在场的人都能听见这句边界。'],example:'',sources:[]}),chatStream:()=>{throw Error('Unexpected');}},'same-fast');
  assert.equal(output.evidence,session.messages[1].text);
  const bad={...input,sceneContext:{...input.sceneContext!,observations:[{...input.sceneContext!.observations[0],learnerQuote:'我愿意喝酒。'}]}};
  let calls=0;await assert.rejects(()=>runDebriefChat(bad,{chatText:async()=>{calls++;return '{}';},chatStream:()=>{throw Error('Unexpected');}},'same-fast'));assert.equal(calls,0);
});

test('continuing one 3D practice credits only additional progress, preserving earlier reports and new practices',()=>{
  const save={...reviewFixture(),practiceId:'ef89b0f8-1b15-431b-80d6-d8a6d9e70d33'};
  const first=buildDinnerReview(save,'first'),quote=first.messages[1].text;
  first.status='assessed';first.report={...reportFixture(quote),deltas:{communication:.2}};
  const extended={...save,messages:[...save.messages,{...save.messages[1],text:'我只负责已确认的部分。'},{...save.messages[2],text:'你的范围需要说清楚。'}]};
  const second=buildDinnerReview(extended,'second'),newQuote=second.messages.filter(m=>m.role==='learner').at(-1)!.text;
  const incoming={...reportFixture(newQuote),ratings:[...reportFixture(newQuote).ratings!,{skill:'ethical-responsibility' as const,level:2 as const,evidence:newQuote,reason:'限定承担的责任。'}],deltas:{communication:.4,'ethical-responsibility':.3}};
  const before=JSON.stringify(first);
  const credited=creditPracticeReport(second,incoming,[second,first]);
  assert.deepEqual(credited.deltas,{communication:.2,'ethical-responsibility':.3});
  assert.deepEqual(incoming.deltas,{communication:.4,'ethical-responsibility':.3});assert.equal(JSON.stringify(first),before);
  second.status='assessed';second.report=credited;
  const third=buildDinnerReview(extended,'third');
  assert.deepEqual(creditPracticeReport(third,incoming,[third,second,first]).deltas,{});
  const thirdWithWords=buildDinnerReview({...extended,messages:[...extended.messages,{...save.messages[1],text:'我也会先确认依赖。'},{...save.messages[2],text:'那我们继续确认。'}]},'third-with-words');
  const better={...reportFixture('我也会先确认依赖。'),deltas:{communication:.5}};
  assert.deepEqual(creditPracticeReport(thirdWithWords,better,[thirdWithWords,second,first]).deltas,{communication:.1});
  const oldEvidence={...better,ratings:reportFixture(quote).ratings};
  assert.deepEqual(creditPracticeReport(thirdWithWords,oldEvidence,[second,first]).deltas,{});
  const fresh=buildDinnerReview({...save,practiceId:'912312e9-4283-44ed-8c4e-ec6907052937'},'fresh');
  assert.equal(creditPracticeReport(fresh,incoming,[first,second]),incoming);
  const legacy=buildDinnerReview(reviewFixture(),'text-compatible');
  assert.equal(creditPracticeReport(legacy,incoming,[first,second]),incoming);
});

test('the shared store applies continued 3D progress once and leaves ordinary text practice independent',async()=>{
  const {useApp}=await import('../../src/store/useApp');
  const original=useApp.getState();
  const save={...reviewFixture(),practiceId:'0967cab7-f8f7-48a7-bddc-03a183de3b77'};
  const first=buildDinnerReview(save,'store-first');
  const extended={...save,messages:[...save.messages,{...save.messages[1],text:'我只负责已确认的部分。'},{...save.messages[2],text:'那我们确认你的范围。'}]};
  const second=buildDinnerReview(extended,'store-second');
  try{
    useApp.setState({profile:null,sessions:[first,second],proficiency:{communication:2.5},practiceDays:[]});
    const initialReport={...reportFixture(first.messages[1].text),deltas:{communication:.2}};
    useApp.getState().applyReport(first.id,initialReport);
    useApp.getState().applyReport(first.id,initialReport);
    const nextReport={...reportFixture('我只负责已确认的部分。'),deltas:{communication:.4}};
    useApp.getState().applyReport(second.id,nextReport);
    useApp.getState().applyReport(second.id,nextReport);
    assert.equal(useApp.getState().proficiency.communication,2.9);
    assert.deepEqual(useApp.getState().sessions.find(s=>s.id===second.id)?.report?.deltas,{communication:.2});
    assert.deepEqual(useApp.getState().sessions.find(s=>s.id===first.id)?.report?.deltas,{communication:.2});
    assert.equal(useApp.getState().practiceDays.length,1);
    const savedText=JSON.stringify({sessions:useApp.getState().sessions,proficiency:useApp.getState().proficiency});
    assert.ok(savedText);
    const exported=JSON.parse(savedText);
    assert.equal(exported.sessions.find((s:{id:string})=>s.id===second.id).sceneContext.practiceId,save.practiceId);
    assert.deepEqual(exported.sessions.find((s:{id:string})=>s.id===second.id).report.deltas,{communication:.2});
    const text={...buildDinnerReview(reviewFixture(),'store-text'),sceneContext:undefined};
    useApp.getState().addSession(text);useApp.getState().applyReport(text.id,initialReport);
    assert.equal(useApp.getState().proficiency.communication,3.1);
  }finally{useApp.setState(original,true);}
});

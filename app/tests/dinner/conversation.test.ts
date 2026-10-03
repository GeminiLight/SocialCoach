import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runDinner } from '../../src/features/dinner/lib/director';
import { opening, SaveSchema, scriptedReply } from '../../src/features/dinner/lib/engine';
import { scenarios } from '../../src/features/dinner/lib/content';
import type { LLM } from '../../src/lib/llm-core';
import { dinnerTranscript } from '../../src/features/dinner/lib/transcript';
import { actionEvidence, type Drama } from '../../src/features/dinner/lib/drama';

const scene=scenarios[0];
const text='小周，请说明测试的限制。';
const input={scenarioId:'work',lang:'zh',text,history:[opening(scene,'zh')]};
const reply={...scriptedReply(scene,text,1,'zh'),replyTo:text};
const longText='当前测试还没有通过，不能保证周三上线。'.repeat(10);
const model=(value:unknown):LLM=>({chatText:async()=>JSON.stringify(value),chatStream:()=>{throw Error('unused');}});

test('a long monologue cannot enter a new dinner turn, while old transcripts stay intact',async()=>{
 await assert.rejects(runDinner(input,model({...reply,text:longText}),'test'),/没有接上/);
 const history=[...input.history,{role:'user',text},{role:'npc',...reply,text:longText}];
 const save=SaveSchema.parse({version:1,scenarioId:'work',messages:history,started:true,complete:false,lang:'zh',draft:''});
 assert.equal(save.messages[2].text,longText);
});

test('one concise rewrite keeps the condition and current question, with no truncation',async()=>{
 let calls=0;
 const concise='退款回调和导入权限两项还没过。明早可以给结果，但现在不能保证上线。';
 const llm:LLM={chatText:async()=>JSON.stringify({...reply,text:++calls===1?longText:concise}),chatStream:()=>{throw Error('unused');}};
 assert.equal((await runDinner(input,llm,'test')).text,concise);
 assert.equal(calls,2);
});

test('English spoken replies have a word budget as well as a character budget',async()=>{
 const body={...input,lang:'en',text:'Zhou, which tests are still failing?'};
 await assert.rejects(runDinner(body,model({...reply,replyTo:body.text,text:'No '.repeat(61)}),'test'));
 const short='Two checks still fail. I can report the results tomorrow, but I cannot promise a launch.';
 assert.equal((await runDinner(body,model({...reply,replyTo:body.text,text:short}),'test')).text,short);
});

test('history includes the opening and whole original lines; gestures never fabricate speech',()=>{
 const record:Drama['records'][number]={eventId:'work-toast',choice:'tea',turn:0,posture:'seated',zone:'table',silent:true};
 const messages=[opening(scene,'zh'),{role:'user' as const,text,targetId:'zhou'},{role:'npc' as const,...reply,text:longText}];
 const before=JSON.stringify(messages);
 const lines=dinnerTranscript(messages,[record],scene,'zh');
 assert.equal(lines.length,4);assert.equal(lines[0].text,messages[0].text);assert.equal(lines[1].role,'action');assert.equal(lines[2].targetId,'zhou');assert.equal(lines[3].text,longText);
 assert.equal(JSON.stringify(messages),before);
});

test('legacy spoken action interjections appear once in chronological order',()=>{
 const record:Drama['records'][number]={eventId:'work-toast',choice:'tea',turn:0,posture:'seated',zone:'table'};
 const spoken=actionEvidence(record,'zh').reply!;
 const messages=[opening(scene,'zh'),{role:'user' as const,text,heard:{speakerId:'chen',text:spoken}},{role:'npc' as const,...reply}];
 const lines=dinnerTranscript(messages,[record],scene,'zh');
 assert.deepEqual(lines.map(l=>l.role),['npc','action','npc','user','npc']);
 assert.equal(lines.filter(l=>l.text===spoken).length,1);
 const pending=dinnerTranscript([messages[0]],[record],scene,'zh');assert.equal(pending.at(-1)?.text,spoken);
});

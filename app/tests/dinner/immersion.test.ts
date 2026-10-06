import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scenarios} from '../../src/features/dinner/lib/content';
import {opening,SaveSchema,validateReply,type Message} from '../../src/features/dinner/lib/engine';
import {runDinner,parseDinnerInput} from '../../src/features/dinner/lib/director';
import {dinnerTranscript} from '../../src/features/dinner/lib/transcript';
import {spokenBeats,createPlayback,stepPlayback} from '../../src/features/dinner/lib/playback';
import {actorBeat,chooseDrama,createDrama,stepDrama,syncDrama} from '../../src/features/dinner/lib/drama';
import {createWorld} from '../../src/features/dinner/lib/room';
import {conversationalRaise} from '../../src/features/dinner/lib/presence';
import type {LLM} from '../../src/lib/llm-core';
const scene=scenarios[2];
const reply={speakerId:'senior',text:'先核对文案，但汇报负责人这句保留。',cue:'许学长看向你。',reactions:scene.characters.map(c=>({characterId:c.id,emotion:'neutral' as const,gesture:'idle' as const})),interjection:{speakerId:'yue',text:'我的设计别再写成辅助执行。'}};
const history:Message[]=[opening(scene,'zh'),{role:'user',text:'先核对文案再发布。'},{role:'npc',...reply}];
test('another person can interject without inventing a fourth NPC, impersonating the main speaker, or consuming a player turn',()=>{
 assert.equal(validateReply(reply,scene).interjection?.speakerId,'yue');
 for(const speakerId of ['senior','mom','player'])assert.throws(()=>validateReply({...reply,interjection:{speakerId,text:'嗯'}},scene));
 const saved=SaveSchema.parse({version:1,scenarioId:'school',lang:'zh',maxTurns:12,messages:history,started:true,complete:false,draft:''});
 assert.equal(saved.messages.filter(m=>m.role==='user').length,1);assert.deepEqual(saved.messages[2].interjection,reply.interjection);
 assert.throws(()=>parseDinnerInput({scenarioId:'school',lang:'zh',text:'我刚才说的就是你的设计。',history:[...history.slice(0,2),{...history[2],interjection:{speakerId:'mom',text:'嗯'}}]}));
 assert.throws(()=>SaveSchema.parse({...saved,messages:[history[0],{...history[1],interjection:reply.interjection},history[2]]}));
});
test('interjections appear after the main reply in playback and verbatim history',()=>{
 const lines=dinnerTranscript(history,[],scene,'zh');
 assert.equal(lines.length,4);assert.equal(lines[2].text,reply.text);assert.equal(lines[3].speakerId,'yue');assert.equal(lines[3].text,reply.interjection.text);assert.equal(lines[3].turn,1);
 assert.deepEqual(spokenBeats(history[2]),[{speakerId:'senior',text:reply.text},reply.interjection]);assert.deepEqual(spokenBeats(history[1]),[]);
 const p=createPlayback(spokenBeats(history[2]));
 for(let i=0;i<1000&&!p.finished;i++)stepPlayback(p,.05);
 assert.equal(p.index,1);assert.equal(p.finished,true);const ended={...p};stepPlayback(p,20);assert.deepEqual(p,ended);
});
test('pausing a conversation does not skip to the other speaker or jump after a hidden-tab delay',()=>{
 const p=createPlayback(spokenBeats(history[2]));stepPlayback(p,.05);const before={...p};
 for(let i=0;i<100;i++)stepPlayback(p,20,true);assert.deepEqual(p,before);
 stepPlayback(p,20);assert.equal(p.elapsed,before.elapsed+.05);assert.equal(p.index,0);
});
test('ordinary spoken toasts raise and rest on a finite clock',()=>{
 assert.equal(conversationalRaise(0),0);assert.equal(conversationalRaise(1),1);assert.equal(conversationalRaise(7),0);assert.equal(conversationalRaise(100),0);
});
test('waiting people lower their cups without forcing a response; a late toast resumes smoothly',()=>{
 const d=createDrama(),world=createWorld(scenarios[0]);syncDrama(d,scenarios[0],0,true,false);
 for(let i=0;i<240;i++)stepDrama(d,.05,false);
 for(let i=0;i<3;i++)assert.equal(actorBeat(d,i,'work').raise,0);
 assert.equal(d.phase,'waiting');assert.equal(d.records.length,0);
 assert.equal(chooseDrama(d,'tea',world,0),true);assert.equal(actorBeat(d,0,'work').raise,0);
 stepDrama(d,.05,false);assert.ok(actorBeat(d,0,'work').raise>0&&actorBeat(d,0,'work').raise<.1);
 for(let i=0;i<22;i++)stepDrama(d,.05,false);assert.equal(actorBeat(d,0,'work').raise,1);
});
test('the director repairs oversized interjections while keeping the selected addressee and full prior side dialogue',async()=>{
 const text='小月，我会把你的设计单独写出来。';let attempts=0,payload='',prompt='';
 const answer={...reply,speakerId:'yue',text:'设计和海报分开写，后续修改也别默认全算我的。',replyTo:text,interjection:{speakerId:'senior',text:'汇报那一行也要留下。'}};
 const llm:LLM={chatText:async o=>{attempts++;payload=String(o.messages[0].content);prompt=JSON.stringify(o.system);return JSON.stringify(attempts===1?{...answer,interjection:{speakerId:'senior',text:'长'.repeat(46)}}:answer);},chatStream:()=>{throw new Error('Unexpected');}};
 const result=await runDinner({scenarioId:'school',variantId:'school-credit',lang:'zh',text,history,targetId:'yue'},llm,'selected-model');
 assert.equal(attempts,2);assert.equal(result.speakerId,'yue');assert.deepEqual(result.interjection,answer.interjection);
 assert.ok(payload.includes(reply.interjection.text));assert.ok(prompt.includes('队友负责执行'));assert.ok(prompt.includes('REPAIR REQUIRED'));
 // A school repair must retain its own facts without another opening's
 // matchmaking or office-data instructions.
 assert.ok(!prompt.includes('NO MATCHMAKING'));assert.ok(!prompt.includes('Office data remains unchecked'));
});

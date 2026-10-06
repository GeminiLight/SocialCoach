import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dinnerPayload,dinnerPrompt,parseDinnerInput,runDinner} from '../../src/features/dinner/lib/director';
import {opening,type Message} from '../../src/features/dinner/lib/engine';
import {scenarios} from '../../src/features/dinner/lib/content';
import {captureDinnerContent} from '../../src/features/dinner/lib/review';
import {DinnerContentSchema} from '../../src/features/dinner/lib/content-snapshot';
import type {LLM} from '../../src/lib/llm-core';
import {sceneFactError} from '../../src/features/dinner/lib/fact-boundary';

test('each character’s last observed emotion survives a speaker change without inventing a new state',()=>{
 const scene=scenarios.find(s=>s.id==='family')!;
 const history:Message[]=[opening(scene,'zh','family-privacy'),{role:'user',text:'妈，为什么没问我就转发？'},{role:'npc',speakerId:'mom',text:'我以为亲戚之间说一句没事。',reactions:scene.characters.map(c=>({characterId:c.id,emotion:c.id==='mom'?'annoyed':'neutral',gesture:'idle'}))},{role:'user',text:'爸，先让我把话说完。'},{role:'npc',speakerId:'dad',text:'行，你说。'}];
 const body=parseDinnerInput({scenarioId:'family',variantId:'family-privacy',maxTurns:12,lang:'zh',text:'妈，我刚才语气重了，但转发前还是请先问我。',history});
 const payload=dinnerPayload(body) as ReturnType<typeof dinnerPayload>&{lastObservedReactions?:unknown};
 assert.deepEqual(payload.lastObservedReactions,history[2].reactions);
 assert.ok(JSON.stringify(payload).includes('我以为亲戚之间说一句没事。'));
});

test('family rehearsal does not receive another opening’s concrete work constraints',()=>{
 const scene=scenarios.find(s=>s.id==='family')!;
 const body=parseDinnerInput({scenarioId:'family',variantId:'family-introduction',maxTurns:12,lang:'en',text:'No introduction, please.',history:[opening(scene,'en','family-introduction')]});
 const prompt=dinnerPrompt(body);
 assert.ok(!prompt.includes('month-end staffing'));
 assert.ok(!prompt.includes('Office data remains unchecked'));
 assert.ok(!prompt.includes('Do not add an HR conversation'));
 assert.ok(!prompt.includes('In the HR-privacy opening'));
 assert.ok(!prompt.includes('the draft is on my phone'));
 assert.ok(prompt.includes('NO MATCHMAKING'));
});

test('new cast voices are frozen with the practice and a legacy snapshot remains readable',()=>{
 const content=captureDinnerContent('family','family-introduction',12,1);
 const cast=content.direction.cast as Array<typeof content.direction.cast[number]&{voice?:{zh:string;en:string}}>;
 assert.ok(cast.every(c=>c.voice?.zh.trim()&&c.voice.en.trim()));
 assert.equal(new Set(cast.map(c=>c.voice?.en)).size,3);
 const custom=structuredClone(content);
 const customCast=custom.direction.cast as typeof cast;
 customCast[0].voice={zh:'说话缓慢，先说自己的顾虑。',en:'Speak slowly; name your own concern first.'};
 const scene=scenarios.find(s=>s.id==='family')!;
 const body=parseDinnerInput({scenarioId:'family',variantId:'family-introduction',contentSnapshot:custom,maxTurns:12,lang:'en',text:'What bothers you?',history:[opening(scene,'en','family-introduction')]});
 assert.ok(dinnerPrompt(body).includes(customCast[0].voice.en));
 const legacy=structuredClone(content);for(const c of legacy.direction.cast as typeof cast)delete c.voice;
 assert.equal(DinnerContentSchema.safeParse(legacy).success,true);
});

test('an exact long NPC replay gets one unseen repair and preserves the current player turn',async()=>{
 const scene=scenarios.find(s=>s.id==='family')!,history=[opening(scene,'zh','family-introduction')];
 const input={scenarioId:'family',variantId:'family-introduction',maxTurns:12,lang:'zh',targetId:'aunt',text:'大姨，我不接受介绍，您听清楚了吗？',history};
 const repeated={replyTo:'我不接受介绍',speakerId:'aunt',text:history[0].text,reactions:history[0].reactions};
 const fresh={...repeated,text:'听清楚了。介绍的人那边，我还得想想怎么回话。'};
 let calls=0;const model:LLM={chatText:async o=>{calls++;assert.ok(o.messages[0].content.includes(input.text));return JSON.stringify(calls===1?repeated:fresh);},chatStream:()=>{throw Error('Unexpected');}};
 const reply=await runDinner(input,model,'test');
 assert.equal(reply.text,fresh.text);assert.equal(calls,2);assert.equal(history.length,1);
});

test('asking for the exact earlier line can repeat it; it does not spend a repair',async()=>{
 const scene=scenarios.find(s=>s.id==='family')!,history=[opening(scene,'zh','family-introduction')];
 const input={scenarioId:'family',variantId:'family-introduction',maxTurns:12,lang:'zh',targetId:'aunt',text:'大姨，刚才那句原话再说一遍。',history};
 let calls=0;const model:LLM={chatText:async()=>{calls++;return JSON.stringify({replyTo:'原话再说一遍',speakerId:'aunt',text:history[0].text,reactions:history[0].reactions});},chatStream:()=>{throw Error('Unexpected');}};
 assert.equal((await runDinner(input,model,'test')).text,history[0].text);assert.equal(calls,1);
});

test('telling an NPC not to repeat is not permission to replay the earlier line',async()=>{
 const scene=scenarios.find(s=>s.id==='family')!,history=[opening(scene,'zh','family-introduction')];
 const input={scenarioId:'family',variantId:'family-introduction',maxTurns:12,lang:'zh',targetId:'aunt',text:'别再复述刚才那句了，我说了不接受介绍。',history};
 let calls=0;const model:LLM={chatText:async()=>{calls++;return JSON.stringify({replyTo:'不接受介绍',speakerId:'aunt',text:calls===1?history[0].text:'那我就照实转达，不过我还得想想怎么开口。',reactions:history[0].reactions});},chatStream:()=>{throw Error('Unexpected');}};
 assert.equal((await runDinner(input,model,'test')).text,'那我就照实转达，不过我还得想想怎么开口。');assert.equal(calls,2);
});

for(const [lang,text,fresh] of [
 ['zh','你怎么又重复原话？请回答问题。','我问的是你愿不愿意让我照实转达，不是说你答应了。'],
 ['zh','你为什么又把那句再说一遍？请直接回答。','我还想听听你的打算，介绍的事你可以明确拒绝。'],
 ['en','Why did you repeat that quote? Please answer the question.','I still want an answer, but you can refuse the introduction.'],
 ['en',"I don't need another quote. Please answer my question.",'I want to know what I should tell the person who offered the introduction.'],
] as const) {
 test(`a repetition complaint cannot authorize replay: ${lang} ${text}`,async()=>{
  const scene=scenarios.find(s=>s.id==='family')!,history=[opening(scene,lang,'family-introduction')];
  const input={scenarioId:'family',variantId:'family-introduction',maxTurns:12,lang,targetId:'aunt',text,history};
  let calls=0;const model:LLM={chatText:async()=>JSON.stringify({replyTo:text.slice(0,25),speakerId:'aunt',text:++calls===1?history[0].text:fresh,reactions:history[0].reactions}),chatStream:()=>{throw Error('Unexpected');}};
  assert.equal((await runDinner(input,model,'test')).text,fresh);assert.equal(calls,2);assert.equal(history.length,1);
 });
}

for(const text of ['Aunt, please repeat your last line.','Aunt, could you quote your exact words?','Why did you repeat that quote? Please repeat your last line so I can compare.']) {
 test(`an explicit English quotation request keeps the replay exemption: ${text}`,async()=>{
  const scene=scenarios.find(s=>s.id==='family')!,history=[opening(scene,'en','family-introduction')];
  const input={scenarioId:'family',variantId:'family-introduction',maxTurns:12,lang:'en',targetId:'aunt',text,history};
  let calls=0;const model:LLM={chatText:async()=>{calls++;return JSON.stringify({replyTo:text.slice(0,25),speakerId:'aunt',text:history[0].text,reactions:history[0].reactions});},chatStream:()=>{throw Error('Unexpected');}};
  assert.equal((await runDinner(input,model,'test')).text,history[0].text);assert.equal(calls,1);
 });
}

test('one spoken exchange cannot invent an expired speaking slot',()=>{
 assert.ok(sceneFactError('office-interruption','一分钟到了。谁去查、查多久，给个数。',['先让我说一分钟。','先查访问，再试两名客服。']));
 assert.ok(sceneFactError('office-interruption',"Your minute is up. We need to decide now.",['Let me speak for one minute.']));
 assert.equal(sceneFactError('office-interruption','如果一分钟到了，我们再决定是否继续。',['让我说一分钟。']),undefined);
 assert.equal(sceneFactError('office-interruption','一分钟到了，那就先暂停。',['一分钟到了，先暂停吧。']),undefined);
 assert.ok(sceneFactError('office-interruption','一分钟到了，该决定了。',['别说“一分钟到了”，我才讲了两句。']));
 assert.ok(sceneFactError('office-interruption','一分钟到了，该决定了。',['一分钟到了吗？']));
});

test('a shortened surname-aunt form cannot invent an unnamed introducer',()=>{
 assert.ok(sceneFactError('family-introduction','那我怎么跟你王姨那边交代？',['我不考虑相亲，照片也不看。']));
 assert.ok(sceneFactError('family-introduction','刘姨还等着我回话。',[]));
 assert.equal(sceneFactError('family-introduction','那我就告诉王姨你不接受介绍。',['请告诉王姨，我不接受介绍。']),undefined);
 assert.equal(sceneFactError('family-introduction','那我就告诉王阿姨你不接受介绍。',['请告诉王姨，我不接受介绍。']),undefined);
 assert.ok(sceneFactError('family-introduction','刘姨那边我会回话。',['请告诉王姨，我不接受介绍。']));
 assert.equal(sceneFactError('family-introduction','介绍的人那边，我会照实说。',[]),undefined);
});

test('an unrequested mixed-language filler is repaired before the Chinese NPC line is visible',async()=>{
 const scene=scenarios.find(s=>s.id==='family')!,history=[opening(scene,'zh','family-privacy')];
 const input={scenarioId:'family',variantId:'family-privacy',maxTurns:12,lang:'zh',targetId:'mom',text:'妈妈，我说笑不是答应别人替我安排。',history};
 let calls=0;const model:LLM={chatText:async()=>{calls++;return JSON.stringify({replyTo:'我说笑不是答应',speakerId:'mom',text:calls===1?'我Know，我哪敢替你答应。':'我知道，你没答应。妈是想听听你自己的打算。',reactions:history[0].reactions});},chatStream:()=>{throw Error('Unexpected');}};
 const result=await runDinner(input,model,'test');assert.equal(calls,2);assert.ok(!result.text.includes('Know'));assert.equal(history.length,1);
});

test('a private content snapshot cannot duplicate one NPC while omitting the other two',()=>{
 const scene=scenarios.find(s=>s.id==='family')!,snapshot=captureDinnerContent('family','family-privacy',12,1);
 snapshot.direction.cast=snapshot.direction.cast.map(()=>snapshot.direction.cast[0]);
 assert.throws(()=>parseDinnerInput({scenarioId:'family',variantId:'family-privacy',maxTurns:12,lang:'zh',text:'妈，我想再说一句。',history:[opening(scene,'zh','family-privacy')],contentSnapshot:snapshot}));
});

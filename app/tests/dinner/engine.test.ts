import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scenarios } from '../../src/features/dinner/lib/content';
import { createDrama, syncDrama, chooseDrama, dinnerContext } from '../../src/features/dinner/lib/drama';
import { createWorld } from '../../src/features/dinner/lib/room';
import { detectIntent, extractJSON, opening, SaveSchema, scriptedReply, validateReply } from '../../src/features/dinner/lib/engine';

test('all dinner branches have exactly one reaction per real character in both languages',()=>{
  for(const scene of scenarios)for(const lang of ['zh','en'] as const)for(const input of ['我不喝','用茶代酒','好吧我喝了','闭嘴','嗯？'])for(let turn=1;turn<=4;turn++) {
    const reply=validateReply(scriptedReply(scene,input,turn,lang),scene);
    assert.equal(reply.reactions.length,3);assert.ok(reply.text.length>0);assert.ok(reply.cue.length>0);
  }
});
test('polite refusal does not remove NPC resistance on the first turn',()=>{
  const result=scriptedReply(scenarios[0],'我不喝酒，谢谢。',1,'zh');
  assert.match(result.text,/就这一杯/);assert.equal(result.reactions[0].emotion,'pressing');
});
test('bridge actions and yielding lead to different concrete consequences',()=>{
  const scene=scenarios[0];assert.notEqual(scriptedReply(scene,'我用茶敬您，项目我扛住',4,'zh').text,scriptedReply(scene,'好吧我喝了',4,'zh').text);
});
test('supporting characters take turns, rather than the lead speaking every round',()=>{
  const scene=scenarios[0];assert.equal(scriptedReply(scene,'我不喝',2,'zh').speakerId,'lin');assert.equal(scriptedReply(scene,'我不喝',3,'zh').speakerId,'zhou');
});
test('English boundaries and bridge proposals choose appropriate branches',()=>{
  assert.equal(detectIntent('I don’t drink'),'boundary');assert.equal(detectIntent('Let me toast you with tea'),'bridge');assert.equal(detectIntent('Fine, I will do it'),'unclear');assert.equal(detectIntent("Fine, I'll drink"),'yield');
  assert.equal(detectIntent('I know you care, but I want to decide when I get married.'),'boundary');
  assert.equal(detectIntent('The presentation mattered. Let’s name the code and design contributions too.'),'bridge');
});
test('model replies cannot invent speakers, duplicate NPCs, or use unknown animations',()=>{
  const scene=scenarios[0],reply=scriptedReply(scene,'我不喝',1,'zh');
  assert.throws(()=>validateReply({...reply,speakerId:'imaginary'},scene));assert.throws(()=>validateReply({...reply,reactions:[reply.reactions[0],reply.reactions[0],reply.reactions[2]]},scene));assert.throws(()=>validateReply({...reply,reactions:reply.reactions.map(r=>({...r,gesture:'dance'}))},scene));
});
test('structured extraction tolerates fences but rejects incomplete JSON',()=>{
  assert.deepEqual(extractJSON('```json\n{"text":"a {quoted} line"}\n```'),{text:'a {quoted} line'});assert.throws(()=>extractJSON('{"text":'));assert.throws(()=>extractJSON('hello'));
});
test('local restore rejects an unpaired user turn and unknown cast',()=>{
  const base={version:1,scenarioId:'work',lang:'zh',started:true,complete:false,draft:'原话',messages:[opening(scenarios[0],'zh')]};
  assert.equal(SaveSchema.safeParse(base).success,true);assert.equal(SaveSchema.safeParse({...base,messages:[...base.messages,{role:'user',text:'原话'}]}).success,false);assert.equal(SaveSchema.safeParse({...base,messages:[{role:'npc',speakerId:'unknown',text:'hello'}]}).success,false);
});
test('saved and exported user evidence preserves literal words',()=>{
  const words='陈总，这杯我用茶敬您。\n但酒我真的不喝。';const scene=scenarios[0];const reply=scriptedReply(scene,words,1,'zh');
  const save={version:1,scenarioId:'work',lang:'zh',started:true,complete:false,draft:'',messages:[opening(scene,'zh'),{role:'user',text:words},{role:'npc',speakerId:reply.speakerId,text:reply.text,reactions:reply.reactions}]};
  assert.equal(SaveSchema.parse(JSON.parse(JSON.stringify(save))).messages[1].text,words);
});

test('an irritated lead keeps the same resistance when closing a dinner',()=>{
  for(const scene of scenarios){const result=scriptedReply(scene,'闭嘴',4,'zh');assert.equal(result.reactions[0].emotion,'annoyed');assert.equal(result.reactions[0].gesture,'fold');}
});
test('a physical choice is acknowledged once instead of repeated on later turns',()=>{
  const scene=scenarios[0],world=createWorld(scene),drama=createDrama();syncDrama(drama,scene,0,true,false);chooseDrama(drama,'tea',world,0);const context=dinnerContext(drama);
  assert.match(scriptedReply(scene,'用茶敬您',1,'zh',undefined,context).text,/茶端来了/);
  assert.doesNotMatch(scriptedReply(scene,'项目交付我负责',2,'zh',undefined,context).text,/茶端来了/);
});

test('tea proposals are not treated as consent to drink wine',()=>{
  for(const text of ['那我喝茶','好吧，我用茶陪您',"Fine, I'll drink tea"]){
    assert.equal(detectIntent(text),'bridge');
    assert.equal(scriptedReply(scenarios[0],text,1,'en').reactions[0].emotion,'pressing');
  }
  assert.equal(detectIntent('I will decide for myself'),'boundary');
  assert.equal(detectIntent('I do not want to see the photo tonight.'),'boundary');
  assert.equal(detectIntent('我不答应相亲'),'boundary');
});

test('unclear replies do not invent agreement, previous delays, tea or a private conversation',()=>{
  for(const lang of ['zh','en'] as const)for(let turn=1;turn<=4;turn++){
    const input=lang==='zh'?'嗯？':'Hmm?';
    assert.doesNotMatch(scriptedReply(scenarios[1],input,turn,lang).text,/你总说以后|当你没反对|keep saying later|assume you don.t object/i);
    assert.doesNotMatch(scriptedReply(scenarios[2],input,turn,lang).text,/所以你也同意|so you agree/i);
    assert.doesNotMatch(scriptedReply(scenarios[0],lang==='zh'?'项目交付我负责':'I own the project delivery',turn,lang).text,/今天茶|tea counts/i);
    assert.doesNotMatch(scriptedReply(scenarios[1],lang==='zh'?'我们一起吃饭':'Let us eat together',turn,lang).text,/你说私下|她说私下|you say we.ll talk privately|they said privately/i);
  }
});

test('deadline action replies belong to the teammate and do not pretend to be the client',()=>{
  const scene=scenarios[0],world=createWorld(scene),d=createDrama();
  d.active='work-deadline';d.seen=['work-deadline'];d.phase='waiting';chooseDrama(d,'calendar',world,2);
  const reply=scriptedReply(scene,'测试还要时间',3,'zh',undefined,dinnerContext(d));
  assert.equal(reply.speakerId,'zhou');assert.match(reply.text,/给我也看|测试/);
  assert.doesNotMatch(reply.text,/手机上的日程我看到了|怎么落实|问题还没说完/);
  const last=scriptedReply(scene,'今天先确认需求，测试过了再约上线',4,'zh',undefined,{...dinnerContext(d)!,choice:undefined,phase:'settled'});
  assert.match(last.text,/周三|明早/);assert.doesNotMatch(last.text,/杯|酒/);assert.equal(last.reactions[0].emotion,'pressing');
});

test('a project proposal or family bridge does not invent tea or a private-talk offer',()=>{
  assert.doesNotMatch(scriptedReply(scenarios[0],'项目交付我负责',1,'zh').text,/茶可以/);
  assert.doesNotMatch(scriptedReply(scenarios[1],'我们一起吃饭吧',1,'zh').text,/私下聊可以/);
  assert.match(scriptedReply(scenarios[0],'用茶敬您',1,'zh').text,/茶可以/);
});

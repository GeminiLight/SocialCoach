import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Box3,BoxGeometry,Group,Mesh,MeshStandardMaterial,MeshPhysicalMaterial,Vector3} from 'three';
import {batchStaticMeshes} from '../../src/features/dinner/lib/staticBatch';
import {nextPixelRatio} from '../../src/features/dinner/lib/renderBudget';
import {createSaveScheduler} from '../../src/features/dinner/lib/saveScheduler';
import {createDrama,dramaUiKey,syncDrama,stepDrama,chooseDrama,dinnerContext} from '../../src/features/dinner/lib/drama';
import {createWorld,roomContext,snapshot,roomUiKey} from '../../src/features/dinner/lib/room';
import {scenarios} from '../../src/features/dinner/lib/content';
import {opening,scriptedReply,renderedCue,type Message} from '../../src/features/dinner/lib/engine';
import {dinnerPayload,parseDinnerInput,runDinner} from '../../src/features/dinner/lib/director';
import type {LLM} from '../../src/lib/llm-core';

test('static batching preserves transformed geometry, normals and shared material ownership',()=>{
  const root=new Group();root.position.set(2,3,4);root.rotation.y=.7;
  const a=new Mesh(new BoxGeometry(1,2,3),new MeshStandardMaterial()),b=new Mesh(new BoxGeometry(1,2,3),new MeshStandardMaterial());
  a.position.set(-2,1,0);a.rotation.z=.3;b.position.set(2,-1,1);b.scale.set(2,.5,1);
  a.castShadow=b.castShadow=true;root.add(a,b);root.updateWorldMatrix(true,true);
  const before=new Box3().setFromObject(root,true),dispose=batchStaticMeshes(root);
  const merged=root.children.filter(o=>o instanceof Mesh&&o.visible) as Mesh[];
  assert.equal(merged.length,1);assert.equal(merged[0].geometry.index!.count,72);assert.equal(merged[0].castShadow,true);
  merged[0].updateWorldMatrix(true,false);const after=new Box3().setFromObject(merged[0],true);
  assert.ok(before.min.distanceTo(after.min)<1e-5);assert.ok(before.max.distanceTo(after.max)<1e-5);
  const normals=merged[0].geometry.getAttribute('normal');
  for(let i=0;i<normals.count;i++)assert.ok(Math.abs(new Vector3().fromBufferAttribute(normals,i).length()-1)<1e-5);
  let geometryDisposed=0,materialDisposed=0;merged[0].geometry.addEventListener('dispose',()=>geometryDisposed++);a.material.addEventListener('dispose',()=>materialDisposed++);
  dispose();assert.equal(root.children.length,2);assert.equal(a.visible,true);assert.equal(b.visible,true);assert.equal(geometryDisposed,1);assert.equal(materialDisposed,0);
});
test('transparent surfaces, physical materials and different shadow / shading properties are not combined',()=>{
  const root=new Group();
  const materials=[new MeshStandardMaterial({transparent:true,opacity:.3}),new MeshPhysicalMaterial(),new MeshStandardMaterial({roughness:.2}),new MeshStandardMaterial({roughness:.8})];
  const originals=materials.map(m=>new Mesh(new BoxGeometry(),m));root.add(...originals);
  const dispose=batchStaticMeshes(root);assert.equal(root.children.length,4);assert.ok(originals.every(m=>m.visible));dispose();
});
test('pixel ratio responds to sustained low frame rates within bounded quality, with a stable middle band',()=>{
  assert.equal(nextPixelRatio(1.5,30,1.5),1.2);assert.equal(nextPixelRatio(.75,20,1.5),.75);
  assert.equal(nextPixelRatio(1.2,50,1.5),1.2);assert.equal(nextPixelRatio(1.2,60,1.25),1.25);assert.equal(nextPixelRatio(1.5,60,1),1);
});
test('camera settling noise does not refresh the whole UI, but actual movement and focus changes do',()=>{
  const world=createWorld(scenarios[0]),before=snapshot(world),key=roomUiKey(before);
  world.viewYaw+=.00001;assert.equal(roomUiKey(snapshot(world)),key);
  world.player.x+=.02;assert.notEqual(roomUiKey(snapshot(world)),key);
  assert.notEqual(snapshot(world).player.x,before.player.x);
  world.attentionMode='free';assert.notEqual(roomUiKey(snapshot(world)),key);
  world.viewYaw=Math.PI-.00001;const wrapped=roomUiKey(snapshot(world));world.viewYaw=Math.PI+.00001;assert.equal(roomUiKey(snapshot(world)),wrapped);
});
test('animation saves coalesce, while edits and leaving the page capture the exact latest pose',()=>{
  const pending=new Set<()=>void>(),saved:{draft:string;x:number}[]=[];
  const scheduler=createSaveScheduler((callback,delay)=>{assert.equal(delay,500);pending.add(callback);return()=>{pending.delete(callback);};});
  let draft='',x=0;
  const capture=()=>{const currentDraft=draft;return()=>saved.push({draft:currentDraft,x});};
  scheduler.request(capture(),true);
  for(let i=0;i<100;i++){x=i/12345;scheduler.request(capture(),false);}
  assert.equal(saved.length,1);assert.equal(pending.size,1);
  for(const callback of pending){pending.delete(callback);callback();}
  assert.equal(saved.length,2);assert.equal(saved[1].x,x);
  scheduler.request(capture(),false);draft='妈妈，这件事先问我。';scheduler.request(capture(),true);
  assert.equal(pending.size,0);assert.equal(saved[2].draft,draft);
  x=.0123456789;scheduler.flush();assert.equal(saved[3].x,x);
  scheduler.request(capture(),false);scheduler.flush();assert.equal(pending.size,0);
  scheduler.cancel();scheduler.flush();assert.equal(saved.length,5);
});
test('an unreadable save cancels delayed writes and cannot be overwritten by a lifecycle flush',()=>{
  let callback:(()=>void)|undefined,writes=0;
  const scheduler=createSaveScheduler(next=>{callback=next;return()=>{callback=undefined;};});
  scheduler.request(()=>writes++,false);scheduler.cancel();
  assert.equal(callback,undefined);scheduler.flush();assert.equal(writes,0);
});
test('thirty seconds of a waiting animation produce a few UI transitions instead of per-tick snapshots',()=>{
  const d=createDrama();syncDrama(d,scenarios[0],0,true,false);let last='',changes=0;
  for(let i=0;i<1800;i++){stepDrama(d,1/60,false);const key=dramaUiKey(d,'work');if(key!==last){changes++;last=key;}}
  assert.ok(changes>=5&&changes<15,`actual UI transitions: ${changes}`);
  const world=createWorld(scenarios[0]);assert.ok(chooseDrama(d,'tea',world,0));const keys=new Set<string>();
  for(let i=0;i<300;i++){stepDrama(d,1/60,false);keys.add(dramaUiKey(d,'work'));}
  assert.ok(keys.size>3);assert.equal(d.phase,'settled');assert.equal(d.inventory,'tea');assert.equal(d.records.length,1);
});
test('compact model context preserves every utterance, interjection, observed location and action',()=>{
  const scene=scenarios[0],world=createWorld(scene),d=createDrama();syncDrama(d,scene,0,true,false);chooseDrama(d,'tea',world,0);
  const dinner=dinnerContext(d)!,room=roomContext(world),heard={speakerId:'lin',text:'客户只确认了第一项。',cue:'林姐看向你。'};
  const history:Message[]=[opening(scene,'zh')];
  for(let i=0;i<11;i++){const text=`第${i+1}次：我只答应第一项。`;history.push({role:'user',text,room,dinner,heard,targetId:'chen'},{role:'npc',...scriptedReply(scene,text,i+1,'zh'),interjection:{speakerId:'lin',text:'我没有答应今晚加班。'},mode:'model'});}
  const body=parseDinnerInput({scenarioId:'work',lang:'zh',maxTurns:18,text:'陈总，确认第一项就够了吗？',history,room,dinner});
  const payload=dinnerPayload(body);
  assert.deepEqual(payload.history.map(m=>m.text),history.map(m=>m.text));assert.deepEqual(payload.playerEvidence,history.filter(m=>m.role==='user').map(m=>m.text));
  assert.deepEqual(payload.history[1].heard,heard);assert.deepEqual(payload.history[1].room,room);assert.deepEqual(payload.history[2].interjection,history[2].interjection);
  assert.deepEqual(payload.dinner,dinner);assert.equal(payload.observedActions[0].choice,'tea');assert.equal(payload.history[1].dinner?.eventId,dinner.eventId);
  assert.equal(payload.current_player_turn.text,body.text);assert.ok(JSON.stringify(payload.history).length<JSON.stringify(history).length*.8);
});
test('the director derives cues without waiting for model narration and still validates identities',async()=>{
  const scene=scenarios[0],text='陈总，我不喝酒。';const reply={...scriptedReply(scene,text,1,'zh'),replyTo:text};
  const {cue:ignored,...withoutCue}=reply;void ignored;
  const model:LLM={chatText:async()=>JSON.stringify(withoutCue),chatStream:()=>{throw Error('Unexpected');}};
  const result=await runDinner({scenarioId:'work',lang:'zh',text,history:[opening(scene,'zh')]},model,'fast');
  assert.equal(result.text,reply.text);assert.equal(result.cue,renderedCue(reply,scene,'zh'));
  await assert.rejects(runDinner({scenarioId:'work',lang:'zh',text,history:[opening(scene,'zh')]},{...model,chatText:async()=>JSON.stringify({...withoutCue,speakerId:'outsider'})},'fast'));
});

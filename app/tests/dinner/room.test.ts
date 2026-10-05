import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scenarios } from '../../src/features/dinner/lib/content';
import { opening, SaveSchema, scriptedReply, validateReply } from '../../src/features/dinner/lib/engine';
import { createWorld, distance, findPath, goNear, goHome, inviteNpc, movePosition, PLAYER_HOME, roomContext, snapshot, stepWorld, walkable, walkPlayer, type World } from '../../src/features/dinner/lib/room';
const scene=scenarios[0];
const reactions=opening(scene,'zh').reactions!;
function run(world:World,seconds:number){for(let i=0;i<seconds*30;i++)stepWorld(world,1/30,{x:0,z:0},Math.PI,reactions);}

test('movement cannot tunnel through table, furniture or room walls',()=>{
  const north=movePosition({x:0,z:3.55},0,-20,0);assert.ok(north.z>=3.08);
  const east=movePosition({x:4,z:0},20,0);assert.equal(east.x,5.75);
  const plant=movePosition({x:-4.75,z:-2},0,-2);assert.ok(plant.z>-2.61);
  const npc=movePosition({x:4,z:0},0,2,-1,[{x:4,z:1}]);assert.ok(npc.z<.3);
});
test('paths go around the table and do not cut furniture corners',()=>{
  const path=findPath(PLAYER_HOME,{x:0,z:-4.2},0);assert.ok(path.length>25);
  let previous=PLAYER_HOME;for(const point of path){assert.ok(walkable(point,0));for(let i=1;i<=10;i++){const p={x:previous.x+(point.x-previous.x)*i/10,z:previous.z+(point.z-previous.z)*i/10};assert.ok(Math.hypot(p.x,p.z)>=3.075);}previous=point;}
});
test('player reaches a selected floor destination and returns to a real seat',()=>{
  const world=createWorld(scene);walkPlayer(world,{x:3.7,z:2.5});run(world,12);assert.ok(distance(world.player,{x:3.75,z:2.5})<.15);assert.equal(world.player.seated,false);
  goHome(world);run(world,12);assert.equal(world.player.seated,true);assert.equal(distance(world.player,world.layout.player),0);
  world.player.seated=false;world.player.x=5;world.player.z=4;world.player.intent='home';world.player.path=[];run(world,.1);assert.equal(world.player.seated,false);assert.ok(world.player.x>4.9,'A failed route must never teleport to the seat');
});
test('diagonal movement is normalized and paused rooms stay still',()=>{
  const a=createWorld(scene),b=createWorld(scene);a.player.x=b.player.x=4;a.player.z=b.player.z=2;a.player.seated=b.player.seated=false;
  stepWorld(a,.05,{x:1,z:0},Math.PI,reactions);stepWorld(b,.05,{x:1,z:1},Math.PI,reactions);
  assert.ok(Math.abs(distance(a.player,{x:4,z:2})-distance(b.player,{x:4,z:2}))<.001);
  const before=snapshot(b);stepWorld(b,.05,{x:1,z:1},Math.PI,reactions,true);assert.deepEqual(snapshot(b),before);
});
test('an annoyed NPC refuses an invitation, while another can approach and return',()=>{
  const refused=createWorld(scene);inviteNpc(refused,scene.characters[1].id,'annoyed');run(refused,3);assert.equal(refused.npcs[1].seated,true);assert.equal(refused.event.key,'refused');
  const world=createWorld(scene);inviteNpc(world,scene.characters[2].id,'neutral');assert.equal(world.npcs[2].seated,true);run(world,.3);assert.equal(world.npcs[2].seated,true);run(world,20);assert.ok(distance(world.npcs[2],world.player)<2.1);assert.ok(distance(world.npcs[2],world.npcs[2].home)>1);
  goHome(world);run(world,20);assert.equal(world.npcs[2].seated,true);assert.equal(distance(world.npcs[2],world.npcs[2].home),0);
});
test('departing never makes the seated cast follow, including the pressing lead in every scene',()=>{
  for(const scenario of scenarios.filter(s=>!s.space)){const world=createWorld(scenario),before=snapshot(world).npcs;walkPlayer(world,{x:3.8,z:4.75});run(world,25);assert.deepEqual(snapshot(world).npcs,before);inviteNpc(world,scenario.characters[0].id,'neutral');run(world,10);assert.equal(world.event.key,'stays');assert.deepEqual(snapshot(world).npcs,before);}
});
test('walking over stops beside each chair at a social distance with no furniture crossings',()=>{
  for(const character of scene.characters){const world=createWorld(scene),npc=world.npcs.find(n=>n.id===character.id)!;goNear(world,character.id);assert.ok(world.player.path.length);assert.equal(world.lookTarget,character.id);run(world,25);const range=distance(world.player,npc);assert.ok(range>1.35&&range<2.2,`Range ${range} for ${character.id}`);const relative=Math.atan2(world.player.x-npc.x,world.player.z-npc.z)-npc.homeHeading;assert.ok(Math.abs(Math.atan2(Math.sin(relative),Math.cos(relative)))<Math.PI*.6,'Do not stop behind the person');assert.equal(npc.seated,true);}
});
test('an accepted invitation goes to the invitation spot, then returns when the player leaves',()=>{
  const world=createWorld(scene);walkPlayer(world,{x:4,z:3});run(world,12);const spot={x:world.player.x,z:world.player.z};inviteNpc(world,scene.characters[2].id,'neutral');run(world,8);const npc=world.npcs[2];assert.equal(npc.seated,false);assert.ok(distance(npc,spot)<2.1);walkPlayer(world,{x:-4,z:3.5});run(world,25);assert.equal(npc.seated,true);assert.equal(distance(npc,npc.home),0);assert.equal(world.npcs[0].seated,true);
});
test('calling someone already within conversation distance keeps them seated',()=>{
  const world=createWorld(scene);goNear(world,scene.characters[2].id);run(world,20);inviteNpc(world,scene.characters[2].id,'neutral');run(world,5);assert.equal(world.npcs[2].seated,true);assert.equal(world.event.key,'acknowledged');
});
test('view and spatial evidence restore without breaking older saves or accepting unknown cast',()=>{
  const world=createWorld(scene);const save={version:1,scenarioId:'work',messages:[opening(scene,'zh')],started:true,complete:false,lang:'zh',draft:'尚未发送'};
  assert.equal(SaveSchema.safeParse(save).success,true);
  const moved={...save,view:'third',room:snapshot(world)};assert.equal(SaveSchema.safeParse(moved).success,true);assert.deepEqual(snapshot(createWorld(scene,moved.room)),moved.room);
  assert.equal(SaveSchema.safeParse({...moved,room:{...moved.room,npcs:moved.room.npcs.map(n=>({...n,id:'fake-person'}))}}).success,false);
  assert.equal(SaveSchema.safeParse({...moved,room:{...moved.room,player:{...moved.room.player,x:0,z:0}}}).success,false);
  assert.equal(SaveSchema.safeParse({...moved,room:{...moved.room,attention:{mode:'person',characterId:'fake-person',yaw:0,pitch:0}}}).success,false);
  const legacyRoom={...moved.room,npcs:moved.room.npcs.map((n,i)=>i===0?{...n,x:4,z:3,seated:false}:n)};const restored=createWorld(scene,legacyRoom);assert.equal(restored.npcs[0].seated,true);assert.deepEqual(restored.player,world.player);
  const context=roomContext(world);assert.equal(SaveSchema.safeParse({...save,messages:[...save.messages,{role:'user',text:'我不喝酒',room:{...context,nearbyCharacterId:'fake-person'}},opening(scene,'zh')]}).success,false);
});
test('standing is acknowledged in visible cues without appending a report to every spoken line',()=>{
  for(const scenario of scenarios.filter(s=>!s.space))for(const lang of ['zh','en'] as const)for(let turn=1;turn<=4;turn++)for(const text of ['不喝','用茶敬您','那我喝','闭嘴','hello']){
    const world=createWorld(scenario);world.player.seated=false;world.player.x=4.5;world.player.z=3;
    const reply=scriptedReply(scenario,text,turn,lang,roomContext(world)),seated=scriptedReply(scenario,text,turn,lang);
    assert.doesNotThrow(()=>validateReply(reply,scenario));assert.match(reply.cue,lang==='zh'?/你在包厢另一侧回答/:/You answer from across the room/);
    assert.deepEqual(reply.reactions,seated.reactions);
    if(text==='hello')assert.notEqual(reply.text,seated.text);
    else assert.equal(reply.text,seated.text);
  }
});
test('an invitation withdrawn by departure never makes a seated guest chase the player',()=>{
  const world=createWorld(scene);inviteNpc(world,scene.characters[2].id,'neutral');world.player.x=-4;world.player.z=3.5;world.player.seated=false;run(world,4);assert.equal(world.npcs[2].seated,true);assert.equal(world.npcs[2].intent,'idle');assert.equal(distance(world.npcs[2],world.npcs[2].home),0);
});

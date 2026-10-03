import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scenarios} from '../../src/features/dinner/lib/content';
import {createWorld,snapshot,roomContext,goHome,goNear,inviteNpc,walkPlayer,stepWorld,findPath,walkable,navigationLayout,setLiftDoor,operateLift,distance,type World} from '../../src/features/dinner/lib/room';
import {layouts,LIFT_GATE_Z,OFFICE_BOARD} from '../../src/features/dinner/lib/spaces';
import {opening,SaveSchema,validateReply,scriptedReply} from '../../src/features/dinner/lib/engine';
import {variants,factsForVariant,storyScenario,variantFor} from '../../src/features/dinner/lib/story';
import {createDrama,syncDrama,chooseDrama,dinnerContext,eventDialogue,choiceDestination,readyForChoice} from '../../src/features/dinner/lib/drama';
import {parseDinnerInput,dinnerPrompt} from '../../src/features/dinner/lib/director';

const scene=(id:'elevator'|'office')=>scenarios.find(s=>s.id===id)!;
const run=(w:World,seconds=14)=>{for(let i=0;i<seconds*30;i++)stepWorld(w,1/30,{x:0,z:0},Math.PI,[]);};
const save=(id:'elevator'|'office')=>{const s=scene(id);return {version:1,scenarioId:id,lang:'zh',messages:[opening(s,'zh')],started:true,complete:false,draft:'',room:snapshot(createWorld(s))};};

test('new rooms have their own postures, furniture and reachable conversation positions',()=>{
 for(const id of ['elevator','office'] as const){
  const s=scene(id),w=createWorld(s);
  assert.equal(w.player.seated,id==='office');assert.deepEqual(w.npcs.map(n=>n.seated),id==='office'?[false,true,false]:[false,false,false]);
  assert.equal(roomContext(w).zone,id==='office'?'desk':'lobby');
  const original=w.npcs.map(n=>({x:n.x,z:n.z,seated:n.seated}));
  for(const person of s.characters){goNear(w,person.id);assert.ok(w.player.path.length,`${id}/${person.id} needs a reachable approach`);run(w);const n=w.npcs.find(n=>n.id===person.id)!;assert.ok(distance(w.player,n)<2.1);assert.equal(w.lookTarget,n.id);inviteNpc(w,n.id,'neutral');run(w,2);}
  assert.deepEqual(w.npcs.map(n=>({x:n.x,z:n.z,seated:n.seated})),original,'NPCs must not follow the player');
  goHome(w);run(w);assert.equal(distance(w.player,w.player.home),0);assert.equal(w.player.seated,id==='office');assert.deepEqual(w.npcs.map(n=>n.seated),original.map(n=>n.seated));
 }
 assert.equal(walkable({x:0,z:0},0,[],layouts.elevator),true,'No invisible dining table');
 assert.equal(walkable({x:0,z:2.05},0,[],layouts.office),false,'The office desk blocks walking');
});

test('office route goes around desks and reaches the actual whiteboard',()=>{
 const w=createWorld(scene('office'));walkPlayer(w,OFFICE_BOARD);assert.ok(w.player.path.length);
 let previous={...w.player};for(const point of w.player.path){for(let i=1;i<=10;i++)assert.ok(walkable({x:previous.x+(point.x-previous.x)*i/10,z:previous.z+(point.z-previous.z)*i/10},0,[],w.layout));previous={...previous,...point};}
 run(w);assert.ok(distance(w.player,OFFICE_BOARD)<.3);assert.equal(roomContext(w).zone,'board');
});

test('elevator doors animate, block navigation, pause and reopen around a person',()=>{
 const w=createWorld(scene('elevator'));setLiftDoor(w,'closed');run(w,2);assert.equal(w.lift!.openness,0);
 assert.equal(walkable({x:0,z:LIFT_GATE_Z},0,[],navigationLayout(w)),false);
 assert.equal(findPath(w.player,{x:0,z:-3.5},0,w.npcs,navigationLayout(w)).some(p=>p.z<LIFT_GATE_Z),false,'A closed door must not be crossed');
 const before=snapshot(w);stepWorld(w,.05,{x:0,z:1},0,[],true);assert.deepEqual(snapshot(w),before);
 setLiftDoor(w,'open');run(w,2);walkPlayer(w,{x:0,z:-3.5});run(w);assert.equal(roomContext(w).zone,'cabin');setLiftDoor(w,'closed');run(w,2);assert.equal(w.lift!.openness,0);operateLift(w,'open');run(w,4);assert.equal(w.lift!.openness,1,'The inside panel must let the player out');
 w.player.x=0;w.player.z=LIFT_GATE_Z;w.player.path=[];setLiftDoor(w,'closed');run(w,.2);assert.equal(w.lift!.target,'open');assert.equal(w.lift!.blocked,true);assert.equal(w.lift!.openness,1);
});

test('room restore preserves office standing and elevator doors; foreign layouts and poses are rejected',()=>{
 for(const id of ['office','elevator'] as const){const w=createWorld(scene(id));walkPlayer(w,{x:4.5,z:3.3});run(w);if(w.lift){setLiftDoor(w,'closed');run(w,2);}const saved=snapshot(w),restored=createWorld(scene(id),saved);assert.deepEqual(snapshot(restored),saved);assert.equal(SaveSchema.safeParse({...save(id),room:saved}).success,true);}
 assert.equal(SaveSchema.safeParse({...save('office'),room:{...save('office').room,space:'dinner'}}).success,false);
 assert.equal(SaveSchema.safeParse({...save('elevator'),room:{...save('elevator').room,player:{x:0,z:3.55,heading:Math.PI,seated:true}}}).success,false);
 assert.equal(SaveSchema.safeParse({...save('elevator'),room:{...save('elevator').room,lift:{openness:0,target:'closed'},player:{x:0,z:LIFT_GATE_Z,heading:0,seated:false}}}).success,false);
 const w=createWorld(scenarios[0]);assert.equal(SaveSchema.safeParse({version:1,scenarioId:'work',lang:'zh',messages:[opening(scenarios[0],'zh')],started:true,complete:false,draft:'',room:snapshot(w)}).success,true,'Legacy dinner room without a space field stays readable');
});

test('new physical choices require arrival, record actual zones and never fabricate consent or NPC speech',()=>{
 for(const id of ['elevator','office'] as const){const s=scene(id),v=variantFor(id),w=createWorld(s),d=createDrama();syncDrama(d,s,0,true,false,{openingEvent:v.openingEvent});const choice=id==='elevator'?'hold-door':'board';assert.equal(readyForChoice(d,choice,w),false);assert.equal(chooseDrama(d,choice,w,0),false);walkPlayer(w,choiceDestination(choice,w)!);run(w);assert.equal(chooseDrama(d,choice,w,0),true);assert.equal(eventDialogue(d,'zh'),undefined);assert.equal(d.records[0].silent,true);assert.equal(d.records[0].zone,id==='elevator'?'lobby':'board');assert.equal(d.inventory,'none');assert.doesNotThrow(()=>parseDinnerInput({scenarioId:id,variantId:v.id,lang:'zh',text:'我只是做了动作，没有答应。',history:[opening(s,'zh',v.id)],room:roomContext(w),dinner:dinnerContext(d)}));}
});

test('four openings have isolated facts, valid current contexts and food-free gesture contracts',()=>{
 for(const v of variants.filter(v=>v.scene==='elevator'||v.scene==='office'))for(const lang of ['zh','en'] as const){const s=storyScenario(scene(v.scene as 'elevator'|'office'),v);const body=parseDinnerInput({scenarioId:s.id,variantId:v.id,lang,text:lang==='zh'?'您还没有回答我刚才的问题。':'You have not answered my question.',history:[opening(s,lang,v.id)],room:roomContext(createWorld(s))});assert.match(dinnerPrompt(body),/NO toast/);const reply=scriptedReply(s,body.text,1,lang,body.room,undefined,{variantId:v.id});assert.doesNotThrow(()=>validateReply(reply,s));assert.throws(()=>validateReply({...reply,reactions:reply.reactions.map((r,i)=>i? r:{...r,gesture:'toast'})},s));}
 const hr=factsForVariant(variantFor('elevator','elevator-privacy'),'zh').join('');assert.match(hr,/猜测/);assert.doesNotMatch(hr,/账号无法打开/);
 const blame=factsForVariant(variantFor('elevator','elevator-blame'),'zh').join('');assert.match(blame,/完整性、账号日志、权限和故障原因均未核对/);
 const floor=factsForVariant(variantFor('office','office-interruption'),'en').join('');assert.match(floor,/no 18:30/);assert.match(floor,/player supplies their proposal/);
});

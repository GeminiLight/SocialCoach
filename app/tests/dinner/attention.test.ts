import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3} from 'three';
import {scenarios} from '../../src/features/dinner/lib/content';
import {opening} from '../../src/features/dinner/lib/engine';
import {createWorld,focusPerson,focusConversation,freeLook,goNear,snapshot,stepWorld} from '../../src/features/dinner/lib/room';
import {attentionSubject,bearing,cameraPose,gazePose,playerEyeHeight,trackAttention,turnToward,wrapAngle} from '../../src/features/dinner/lib/attention';
const scene=scenarios[0];
const reactions=opening(scene,'zh').reactions!;
test('attention stays on the approached person throughout walking and after arrival',()=>{
  for(const character of scene.characters){const world=createWorld(scene);goNear(world,character.id);let movingFrames=0;for(let i=0;i<600;i++){stepWorld(world,1/30,{x:0,z:0},world.viewYaw,reactions);trackAttention(world,1/30);const target=attentionSubject(world)!;assert.equal(target.id,character.id);if(i>60)assert.ok(Math.abs(wrapAngle(world.viewYaw-bearing(world.player,target)))<.15);if(world.player.moving)movingFrames++;}assert.ok(movingFrames>30);assert.equal(world.attentionMode,'person');}
});
test('manual looking remains free until attention is explicitly resumed and saves restore it',()=>{
  const world=createWorld(scene);focusPerson(world,scene.characters[1].id);freeLook(world);world.viewYaw=.5;world.viewPitch=.2;goNear(world,scene.characters[0].id);freeLook(world);for(let i=0;i<90;i++){stepWorld(world,1/30,{x:1,z:0},world.viewYaw,reactions);trackAttention(world,1/30);}assert.equal(world.viewYaw,.5);assert.equal(world.viewPitch,.2);const restored=createWorld(scene,snapshot(world));assert.equal(restored.attentionMode,'free');assert.equal(restored.viewYaw,.5);focusConversation(world);trackAttention(world,1/30,true);assert.equal(attentionSubject(world)?.id,scene.characters[0].id);
});
test('short smooth turns cross the pi boundary without spinning around',()=>{
  const start=Math.PI-.02,target=-Math.PI+.02,turned=turnToward(start,target,1/30);assert.ok(wrapAngle(turned-start)>0);assert.ok(Math.abs(wrapAngle(turned-start))<.04);const opposite=turnToward(0,Math.PI,.05);assert.ok(Math.abs(opposite)<=.21);
});
test('both camera views keep the player and approached face in portrait and landscape framing',()=>{
  for(const character of scene.characters){const world=createWorld(scene);goNear(world,character.id);for(let i=0;i<650;i++){stepWorld(world,1/30,{x:0,z:0},world.viewYaw,reactions);trackAttention(world,1/30);}const subject=attentionSubject(world)!;for(const aspect of [1280/720,390/844])for(const view of ['first','third'] as const){const pose=cameraPose(world,view,aspect),camera=new PerspectiveCamera(pose.fov,aspect,.1,60);camera.position.set(...pose.position as [number,number,number]);camera.lookAt(...pose.target as [number,number,number]);camera.updateMatrixWorld();const face=new Vector3(subject.x,subject.seated?2.48:2.88,subject.z).project(camera);assert.ok(Math.abs(face.x)<.65&&Math.abs(face.y)<.65,`${view} face ${face.toArray()}`);if(view==='third'){const player=new Vector3(world.player.x,playerEyeHeight(world.player),world.player.z).project(camera);assert.ok(Math.abs(player.x)<.95&&Math.abs(player.y)<.75);}}}
});
test('a seated character looks upward at a standing visitor with limited torso and neck rotation',()=>{
  const world=createWorld(scene),npc=world.npcs[0];const gaze=gazePose(npc,{x:1.8,z:-3.3,eye:2.98});assert.ok(gaze.pitch<0);assert.ok(Math.abs(gaze.torso)<=.48);assert.ok(Math.abs(gaze.head)<=1.08);const behind=gazePose(npc,{x:0,z:-4,eye:2.98});assert.ok(Math.abs(behind.torso+behind.head)<Math.PI*.51,'A neck cannot spin around');
});
test('third-person camera leaves a clear view of the approached face beside the player head',()=>{
  for(const character of scene.characters){const world=createWorld(scene);goNear(world,character.id);for(let i=0;i<650;i++){stepWorld(world,1/30,{x:0,z:0},world.viewYaw,reactions);trackAttention(world,1/30);}const subject=attentionSubject(world)!;for(const aspect of [1280/720,390/844]){const pose=cameraPose(world,'third',aspect),camera=new PerspectiveCamera(pose.fov,aspect,.1,60);camera.position.set(...pose.position as [number,number,number]);camera.lookAt(...pose.target as [number,number,number]);camera.updateMatrixWorld();const direction=camera.getWorldDirection(new Vector3());const heads=[new Vector3(world.player.x,2.88,world.player.z),new Vector3(subject.x,2.48,subject.z)];const depths=heads.map(p=>p.clone().sub(camera.position).dot(direction));const projected=heads.map(p=>p.clone().project(camera));const scale=1/Math.tan(pose.fov*Math.PI/360),width=depths.reduce((sum,d)=>sum+.36*scale/(d*aspect),0),height=depths.reduce((sum,d)=>sum+.43*scale/d,0);assert.ok(((projected[0].x-projected[1].x)/width)**2+((projected[0].y-projected[1].y)/height)**2>1,`Keep ${character.id} clear at ${aspect}: ${((projected[0].x-projected[1].x)/width)**2+((projected[0].y-projected[1].y)/height)**2}`);}}
});
test('conversation follows a new speaker but a chosen person keeps priority',()=>{
  const world=createWorld(scene);world.speakerId=scene.characters[1].id;trackAttention(world,.05,true);assert.equal(attentionSubject(world)?.id,scene.characters[1].id);focusPerson(world,scene.characters[0].id);world.speakerId=scene.characters[2].id;trackAttention(world,.05,true);assert.equal(attentionSubject(world)?.id,scene.characters[0].id);
});

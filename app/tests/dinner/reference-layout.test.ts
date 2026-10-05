import test from 'node:test';
import assert from 'node:assert/strict';
import {scenarios} from '../../src/features/dinner/lib/content';
import {createWorld,snapshot,RoomSaveSchema,standPlayer} from '../../src/features/dinner/lib/room';
import {layouts,spaceFor} from '../../src/features/dinner/lib/spaces';
import {opening,SaveSchema} from '../../src/features/dinner/lib/engine';
const scene=scenarios[0];

test('old work saves re-seat people at the new real table while preserving conversation, draft and free look',()=>{
 const old={player:{...layouts.dinner.player},npcs:scene.characters.map((c,i)=>({id:c.id,...layouts.dinner.people[i]})),attention:{mode:'free' as const,yaw:.4,pitch:.15}};
 const save=SaveSchema.parse({version:1,scenarioId:'work',messages:[opening(scene,'zh')],started:true,complete:false,lang:'zh',draft:'还没有发送的原话',room:old});
 const world=createWorld(scene,save.room),layout=spaceFor(scene);
 assert.equal(save.draft,'还没有发送的原话');assert.equal(save.messages[0].text,opening(scene,'zh').text);
 assert.equal(world.viewYaw,.4);assert.equal(world.viewPitch,.15);assert.equal(world.player.z,layout.player.z);
 world.npcs.forEach((n,i)=>assert.equal(n.x,layout.people[i].x));
 assert.equal(snapshot(world).profile,'compact-work');assert.ok(RoomSaveSchema.safeParse(snapshot(world)).success);
});
test('new work poses survive restoration and standing does not create invalid saves',()=>{
 const world=createWorld(scene);standPlayer(world);
 const saved=snapshot(world);assert.ok(RoomSaveSchema.safeParse(saved).success);
 const restored=createWorld(scene,saved);assert.equal(restored.player.seated,false);assert.equal(restored.player.z,world.player.z);
 assert.ok(SaveSchema.safeParse({version:1,scenarioId:'work',messages:[opening(scene,'zh')],started:true,complete:false,lang:'zh',draft:'',room:saved}).success);
});
test('the compact work profile cannot be attached to another scene',()=>{
 const family=scenarios.find(s=>s.id==='family')!;
 const room={...snapshot(createWorld(family)),profile:'compact-work'};
 assert.equal(SaveSchema.safeParse({version:1,scenarioId:'family',messages:[opening(family,'zh')],started:true,complete:false,lang:'zh',draft:'',room}).success,false);
 assert.equal(createWorld(family).player.z,layouts.dinner.player.z);
});

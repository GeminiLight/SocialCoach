import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { avatarMetrics } from '../../src/features/dinner/lib/avatarAssets';
import { scenarios } from '../../src/features/dinner/lib/content';
import { eyeHeight } from '../../src/features/dinner/lib/attention';
import { createWorld } from '../../src/features/dinner/lib/room';

const directory=new URL('../../public/3d/v2/',import.meta.url);
function load(file:string) {
  const bytes=readFileSync(new URL(file,directory));
  assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(8),bytes.length);
  return {bytes,gltf:JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString())};
}

test('every live cast has a self-contained rig, neutral expressions and seated / standing action clips',()=>{
  for(const id of new Set([...scenarios.flatMap(s=>s.characters.map(c=>c.id)),'player'])) {
    const {gltf,bytes}=load(`${id}.glb`),nodes=gltf.nodes.map((n:{name:string})=>n.name);
    assert.ok(bytes.length<3.5*1024*1024,`${id}: excessive actor download`);
    for(const name of ['head','pelvis','hand_r','thigh_l','calf_r'])assert.ok(nodes.includes(name),`${id}: missing ${name}`);
    for(const posture of ['Seated','Standing'])for(const action of ['Idle','Toast','Phone','Palm','Fold','Lean'])assert.ok(gltf.animations.some((a:{name:string})=>a.name===posture+action));
    assert.ok(gltf.skins.length>0);
    for(const mesh of gltf.meshes)assert.ok((mesh.weights??[]).every((n:number)=>n===0),'Faces must not begin with closed eyes or a forced smile');
    for(const image of gltf.images)assert.ok(image.bufferView!==undefined&&!image.uri,'No third-party runtime texture fetch');
    for(const node of gltf.nodes)if(node.skin!==undefined)assert.ok(gltf.scenes[0].nodes.includes(gltf.nodes.indexOf(node)),'Skinned meshes must not depend on ignored parent transforms');
  }
});

test('camera anchors follow the anatomical export for all distinct casts',()=>{
  const ids=scenarios.flatMap(s=>s.characters.map(c=>c.id));assert.equal(new Set(ids).size,15);
  for(const scene of scenarios)for(const actor of createWorld(scene).npcs)for(const seated of [false,true]) {
    const metadata=JSON.parse(readFileSync(new URL(`${actor.id}.json`,directory),'utf8'));
    const expected=seated?metadata.seatedEye:metadata.standingEye;
    assert.equal(eyeHeight({...actor,seated}),expected);assert.ok(expected>2&&expected<3.3);
    assert.deepEqual(avatarMetrics[actor.id],{standingEye:metadata.standingEye,seatedEye:metadata.seatedEye,scale:metadata.scale});
  }
});

test('room exports preserve interactive surfaces and manifest integrity',()=>{
  const manifest=JSON.parse(readFileSync(new URL('manifest.json',directory),'utf8'));
  for(const model of manifest.models) {
    const {bytes}=load(model.file);assert.equal(createHash('sha256').update(bytes).digest('hex'),model.sha256,`${model.file}: stale manifest`);
    assert.equal(bytes.length,model.bytes);
  }
  for(const space of ['work','family','school','elevator','office']) {
    const {gltf}=load(`room-${space}.glb`),names=gltf.nodes.map((n:{name:string})=>n.name);
    assert.ok(names.includes('Floor'));
    const important=space==='elevator'?['LiftDoorLeft','LiftDoorRight','LiftOpen','LiftClosed']:space==='office'?['OfficeBoard']:[];
    for(const name of important)assert.ok(names.includes(name),`${space}: lost ${name} interaction`);
  }
});

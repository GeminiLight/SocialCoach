import test from 'node:test';
import assert from 'node:assert/strict';
import { AnimationClip, Bone, Euler, Group, Quaternion, QuaternionKeyframeTrack, VectorKeyframeTrack } from 'three';
import { createPoseMixer, presentationTurn, undoPresentation } from '../../src/features/dinner/lib/rigMotion';

function fixture() {
  const root=new Group(),head=new Bone(),pelvis=new Bone();head.name='head';pelvis.name='pelvis';root.add(pelvis);pelvis.add(head);
  const seated=new Quaternion().setFromEuler(new Euler(.12,0,0));
  const clip=new AnimationClip('SeatedIdle',1,[
    new QuaternionKeyframeTrack('head.quaternion',[0,1],[...seated.toArray(),...seated.toArray()]),
    new VectorKeyframeTrack('pelvis.position',[0,1],[0,1.06,0,0,1.06,0]),
  ]);
  return {root,head,pelvis,seated,rig:createPoseMixer(root,[clip])};
}

test('gaze stays bounded over repeated constant pose samples without losing the seated pose',()=>{
  const {head,pelvis,seated,rig}=fixture();
  const previous={head:new Quaternion()},bones={head},scratch={delta:new Quaternion(),euler:new Euler()};
  rig.actions.SeatedIdle.setEffectiveWeight(1);rig.start();
  for(let frame=0;frame<1200;frame++) {
    undoPresentation(bones,previous);rig.mixer.update(1/60);
    assert.ok(head.quaternion.clone().normalize().angleTo(seated)<1e-6,'Constant animations must retain their pose');
    assert.ok(Math.abs(pelvis.position.y-1.06)<1e-6);
    presentationTurn(head,previous,scratch,0,.25);
    assert.ok(Math.abs(head.quaternion.clone().normalize().angleTo(seated)-.25)<1e-6,'Gaze must not accumulate into a head spin');
  }
});

test('setup, cleanup, setup preserves reusable mixer bindings and actions',()=>{
  const {head,pelvis,seated,rig}=fixture();
  for(let mount=0;mount<5;mount++) {
    rig.start();rig.actions.SeatedIdle.setEffectiveWeight(1);rig.mixer.update(.1);
    assert.ok(head.quaternion.clone().normalize().angleTo(seated)<1e-6);assert.ok(Math.abs(pelvis.position.y-1.06)<1e-6);
    rig.stop();
  }
});

test('display turns on one actor never alter another actor or world position',()=>{
  const a=fixture(),b=fixture();a.root.position.set(4,0,2);b.root.position.set(-2,0,1);
  presentationTurn(a.head,{head:new Quaternion()},{delta:new Quaternion(),euler:new Euler()},.1,.5);
  assert.deepEqual(b.head.quaternion.toArray(),[0,0,0,1]);assert.deepEqual(b.root.position.toArray(),[-2,0,1]);assert.deepEqual(a.root.position.toArray(),[4,0,2]);
});

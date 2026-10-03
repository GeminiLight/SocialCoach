import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Group,MeshBasicMaterial,SkinnedMesh,Vector3,PerspectiveCamera} from 'three';
import {castAppearance} from '../../src/features/dinner/lib/cast';
import {scenarios} from '../../src/features/dinner/lib/content';
import {faceGeometry} from '../../src/features/dinner/lib/avatar';
import {bindPortrait,bindRestPose,portraitRig,headCenter,portraitScale} from '../../src/features/dinner/lib/anatomy';
import {createWorld,focusPerson} from '../../src/features/dinner/lib/room';
import {eyeHeight,cameraPose,trackAttention} from '../../src/features/dinner/lib/attention';

test('different builds keep the head attached and attention aligned with the rendered eyes',()=>{
  for(const character of scenarios.flatMap(s=>s.characters))for(const seated of [true,false]){
    const appearance=castAppearance(character.id),body=new Group(),rig=portraitRig();
    body.scale.set(...appearance.build);body.position.y=seated?1.32:1.72;
    const geometry=bindPortrait(faceGeometry(appearance.age==='mature',appearance.feminine,character.id));
    const material=new MeshBasicMaterial(),mesh=new SkinnedMesh(geometry,material);
    bindRestPose(mesh,rig.skeleton);body.add(mesh,rig.root);body.updateMatrixWorld(true);
    const eye=new Vector3(0,headCenter+.023*portraitScale,.01).applyMatrix4(body.matrixWorld);
    const actor={...createWorld(scenarios.find(s=>s.characters.some(c=>c.id===character.id))!).npcs.find(n=>n.id===character.id)!,seated};
    assert.ok(Math.abs(eye.y-eyeHeight(actor))<1e-6,`${character.id}: camera must follow the actual eye height`);
    rig.head.rotation.set(-.2,.65,0);body.updateMatrixWorld(true);
    const vertices=geometry.getAttribute('position'),actual=new Vector3(),expected=new Vector3();
    for(let i=0;i<vertices.count;i+=17){
      expected.fromBufferAttribute(vertices,i);mesh.applyBoneTransform(i,actual.copy(expected)).applyMatrix4(mesh.matrixWorld);
      if(expected.y<=.745)expected.applyMatrix4(body.matrixWorld);
      else if(expected.y>=.86)expected.applyMatrix4(rig.skeleton.boneInverses[1]).applyMatrix4(rig.head.matrixWorld);
      else continue;
      assert.ok(actual.distanceTo(expected)<1e-6,`${character.id}: scaled neck/head detached during turn`);
    }
    geometry.dispose();material.dispose();rig.skeleton.dispose();
  }
});

test('all three casts remain in view when following their individual eye heights',()=>{
  for(const scene of scenarios)for(const character of scene.characters){
    const world=createWorld(scene);focusPerson(world,character.id);trackAttention(world,.1,true);
    const actor=world.npcs.find(n=>n.id===character.id)!;
    for(const aspect of [1280/720,390/844])for(const view of ['first','third'] as const){
      const pose=cameraPose(world,view,aspect),camera=new PerspectiveCamera(pose.fov,aspect,.1,60);
      camera.position.set(...pose.position as [number,number,number]);camera.lookAt(...pose.target as [number,number,number]);camera.updateMatrixWorld();
      const face=new Vector3(actor.x,eyeHeight(actor),actor.z).project(camera);
      assert.ok(Math.abs(face.x)<.65&&Math.abs(face.y)<.65,`${scene.id}/${character.id}/${view}: face out of frame`);
    }
  }
});

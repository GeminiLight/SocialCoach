import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MeshBasicMaterial,SkinnedMesh,Vector3,type BufferGeometry} from 'three';
import {garmentGeometry,garmentRig,bindPortrait,portraitRig,trouserGeometry,trouserRig,bindRestPose} from '../../src/features/dinner/lib/anatomy';
import {faceGeometry} from '../../src/features/dinner/lib/avatar';

function checkSkin(geometry:BufferGeometry,bones:number) {
  const weights=geometry.getAttribute('skinWeight'),indices=geometry.getAttribute('skinIndex');
  for(let i=0;i<weights.count;i++){
    assert.ok(Math.abs(weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i)-1)<1e-6);
    for(const read of ['getX','getY','getZ','getW'] as const){
      assert.ok(weights[read](i)>=0&&weights[read](i)<=1);
      assert.ok(indices[read](i)>=0&&indices[read](i)<bones);
    }
  }
}

test('the garment is a complete closed surface with no truncated triangle buffer or open shoulder seams',()=>{
  for(const feminine of [false,true]){
    const geometry=garmentGeometry(feminine),p=geometry.getAttribute('position'),index=geometry.getIndex()!;
    assert.ok(p.count<16000);assert.ok(index.count/3<35000);
    const vertices=new Map<string,number>(),ids:number[]=[];
    for(let i=0;i<p.count;i++){
      const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e5)).join(',');
      if(!vertices.has(key))vertices.set(key,vertices.size);
      ids.push(vertices.get(key)!);
    }
    const edges=new Map<string,number>();
    for(let i=0;i<index.count;i+=3){
      const triangle=[ids[index.getX(i)],ids[index.getX(i+1)],ids[index.getX(i+2)]];
      if(new Set(triangle).size<3)continue;
      for(let e=0;e<3;e++){
        const a=triangle[e],b=triangle[(e+1)%3],key=a<b?`${a}:${b}`:`${b}:${a}`;
        edges.set(key,(edges.get(key)??0)+1);
      }
    }
    assert.ok([...edges.values()].every(n=>n===2),'all surface edges have two incident triangles');
    checkSkin(geometry,5);geometry.dispose();
  }
});

test('cuff vertices follow only their forearm, while the center of the chest stays anchored',()=>{
  for(const feminine of [false,true]){
    const geometry=garmentGeometry(feminine),p=geometry.getAttribute('position'),w=geometry.getAttribute('skinWeight');
    for(let i=0;i<p.count;i++){
      if(Math.abs(p.getX(i))>.38&&p.getY(i)<-.13)assert.ok(w.getZ(i)>.999,'cuff must not inherit torso weight');
      if(Math.abs(p.getX(i))<.2)assert.equal(w.getX(i),1,'the chest must not stretch with a toast');
    }
    const rig=garmentRig(feminine),material=new MeshBasicMaterial(),mesh=new SkinnedMesh(geometry,material);
    mesh.add(rig.root);mesh.bind(rig.skeleton);
    for(const [upper,forearm] of [[-1.78,-.25],[-.70,-1.15],[0,0]]){
      rig.right.rotation.x=upper;rig.rightForearm.rotation.z=forearm;mesh.updateMatrixWorld(true);
      const v=new Vector3();
      for(let i=0;i<p.count;i++){
        mesh.applyBoneTransform(i,v.fromBufferAttribute(p,i));
        assert.ok([v.x,v.y,v.z].every(Number.isFinite));assert.ok(v.length()<2);
      }
    }
    rig.skeleton.dispose();geometry.dispose();material.dispose();
  }
});

test('turning the head keeps the lower neck inside the collar and moves facial features rigidly',()=>{
  for(const id of ['chen','lin','dad']){
    const geometry=bindPortrait(faceGeometry(false,false,id)),rig=portraitRig(),material=new MeshBasicMaterial(),mesh=new SkinnedMesh(geometry,material);
    mesh.add(rig.root);mesh.bind(rig.skeleton);checkSkin(geometry,2);
    rig.head.rotation.set(-.23,.65,0);mesh.updateMatrixWorld(true);
    const p=geometry.getAttribute('position'),v=new Vector3(),original=new Vector3();
    for(let i=0;i<p.count;i++){
      original.fromBufferAttribute(p,i);mesh.applyBoneTransform(i,v.copy(original));
      if(original.y<=.745)assert.ok(v.distanceTo(original)<1e-6,'neck base moved out of collar');
      if(original.y>=.86){
        original.applyMatrix4(rig.skeleton.boneInverses[1]).applyMatrix4(rig.head.matrixWorld);
        assert.ok(v.distanceTo(original)<1e-6,'skin separated from eyes or jaw');
      }
    }
    rig.skeleton.dispose();geometry.dispose();material.dispose();
  }
});

test('seated knees deform one continuous trouser surface with fixed hip anchors',()=>{
  const geometry=trouserGeometry(),rig=trouserRig(),material=new MeshBasicMaterial(),mesh=new SkinnedMesh(geometry,material);
  mesh.add(rig.root);mesh.bind(rig.skeleton);checkSkin(geometry,2);
  rig.shin.rotation.x=Math.PI/2;mesh.updateMatrixWorld(true);
  const p=geometry.getAttribute('position'),v=new Vector3(),original=new Vector3();
  for(let i=0;i<p.count;i++){
    original.fromBufferAttribute(p,i);mesh.applyBoneTransform(i,v.copy(original));
    assert.ok([v.x,v.y,v.z].every(Number.isFinite));
    if(original.y>=-.475)assert.ok(v.distanceTo(original)<1e-6);
  }
  rig.skeleton.dispose();geometry.dispose();material.dispose();
});

test('replacing a material during a toast preserves the original bind pose',()=>{
  const geometry=garmentGeometry(false),rig=garmentRig(false),material=new MeshBasicMaterial();
  const first=new SkinnedMesh(geometry,material);first.add(rig.root);bindRestPose(first,rig.skeleton);
  rig.root.position.set(.2,1.32,-.4);rig.right.rotation.set(-1.78,0,.23);first.updateMatrixWorld(true);
  const original=rig.skeleton.boneInverses.map(m=>m.clone());
  const index=geometry.getAttribute('position').count-1,p=new Vector3().fromBufferAttribute(geometry.getAttribute('position'),index);
  const before=first.applyBoneTransform(index,p.clone());
  const replacement=new SkinnedMesh(geometry,material);bindRestPose(replacement,rig.skeleton);
  original.forEach((matrix,i)=>assert.deepEqual(rig.skeleton.boneInverses[i].elements,matrix.elements));
  assert.ok(replacement.applyBoneTransform(index,p.clone()).distanceTo(before)<1e-6);
  rig.skeleton.dispose();geometry.dispose();material.dispose();
});

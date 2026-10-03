import { useEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Group, Mesh, MeshStandardMaterial } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Palette } from '../lib/palette';
import { l, type Lang, type Scenario } from '../lib/content';
import { operateLift, walkPlayer, type World } from '../lib/room';
import { Sign } from './PlaceEnvironment';

useGLTF.setDecoderPath('/3d/draco/');
export const assetUrl = (name:string) => `/3d/v2/${name}.glb`;
export function useSceneAsset(name:string) { return useGLTF(assetUrl(name),true); }

/** Geometry/textures stay in the loader cache; transforms and materials belong
 * to each instance. Never dispose a cached texture when switching a scene. */
export function instantiateAsset(source:Group,p:Palette) {
  const scene=clone(source),materials=new Set<MeshStandardMaterial>();
  scene.traverse(object=>{
    if(!(object instanceof Mesh))return;
    object.castShadow=object.name!=='Ceiling'&&object.name!=='Floor';object.receiveShadow=true;
    // Skinned bounds change when seated or raising a cup.
    if('isSkinnedMesh' in object)object.frustumCulled=false;
    object.material=(Array.isArray(object.material)?object.material:[object.material]).map(material=>{
      const local=material.clone() as MeshStandardMaterial;
      const token=local.name.replace(/^sc:/,'').replace(/\.\d+$/,'') as keyof Palette;
      if(local.name.startsWith('sc:')&&p[token])local.color.set(p[token]);
      materials.add(local);return local;
    });
    if(object.material.length===1)object.material=object.material[0];
  });
  return {scene,dispose:()=>{
    materials.forEach(material=>material.dispose());
    scene.traverse(object=>{if(object instanceof Mesh&&'skeleton' in object)(object as import('three').SkinnedMesh).skeleton.dispose();});
  }};
}

export function AssetCup({palette:p,wine=false,position=[0,0,0]}:{palette:Palette;wine?:boolean;position?:[number,number,number]}) {
  const asset=useSceneAsset('props');
  const instance=useMemo(()=>{
    const cloned=instantiateAsset(asset.scene,p);
    const prefix=wine?'Wine':'Tea';
    cloned.scene.children.forEach(object=>{object.visible=object.name.startsWith(prefix);});
    return cloned;
  },[asset.scene,p,wine]);
  useEffect(()=>instance.dispose,[instance]);
  return <group position={position}><primitive object={instance.scene} position={[0,wine?0:-.095,0]} dispose={null}/></group>;
}

export function AssetRoom({p,world,scenario,lang,paused,onEvidence,surfaces}:{p:Palette;world:World;scenario:Scenario;lang:Lang;paused:boolean;onEvidence:()=>void;surfaces:{landscape:import('three').Texture|null;familyArt:import('three').Texture|null}}) {
  const kind=scenario.space??scenario.id;
  const asset=useSceneAsset(`room-${kind}`);
  const instance=useMemo(()=>instantiateAsset(asset.scene,p),[asset.scene,p]);
  const doors=useMemo(()=>[instance.scene.getObjectByName('LiftDoorLeft'),instance.scene.getObjectByName('LiftDoorRight')],[instance]);
  const root=useRef<Group>(null!);
  useEffect(()=>instance.dispose,[instance]);
  useFrame(()=>{if(kind==='elevator')doors.forEach((door,i)=>{if(door)door.position.x=(i===0?-1:1)*(.875+(world.lift?.openness??1)*1.72);});});
  const click=(event:ThreeEvent<MouseEvent>)=>{
    event.stopPropagation();if(paused||event.delta>=5)return;
    const name=event.object.name;
    if(name==='Floor')walkPlayer(world,{x:event.point.x,z:event.point.z});
    else if(name.startsWith('LiftOpen'))operateLift(world,'open');
    else if(name.startsWith('LiftClosed'))operateLift(world,'closed');
    else if(name.startsWith('EvidenceDocument')||name==='OfficeBoard')onEvidence();
  };
  return <group ref={root} onClick={click}>
    <primitive object={instance.scene} dispose={null}/>
    {kind==='work'&&surfaces.landscape&&<mesh position={[0,3.55,-4.972]}><planeGeometry args={[3.84,1.77]}/><meshStandardMaterial map={surfaces.landscape} roughness={1}/></mesh>}
    {kind==='family'&&surfaces.familyArt&&<mesh position={[4,2.7,-5.028]}><planeGeometry args={[.70,.58]}/><meshStandardMaterial map={surfaces.familyArt} roughness={1}/></mesh>}
    {kind==='elevator'&&<>
      <Sign at={[0,4.72,-2.077]} size={[1.36,.36]} lines={[l('12 F','12 F')]} p={p} lang={lang} dark/>
      <Sign at={[-3.76,3.55,-2.182]} size={[2.0,.92]} lines={[l('12  项目组','12  PROJECT TEAM'),l('会议室  ←','MEETING ROOMS  ←'),l('等候区  →','LOBBY  →')]} p={p} lang={lang}/>
      {(['open','closed'] as const).map((target,i)=><Sign key={target} name={target==='open'?'LiftOpen':'LiftClosed'} at={[2.5,2.32-i*.42,-1.964]} size={[.19,.17]} lines={[target==='open'?l('◀ ▶','◀ ▶'):l('▶ ◀','▶ ◀')]} p={p} lang={lang}/>)}
    </>}
    {kind==='office'&&<>
      <Sign at={[3.4,4.35,-5.097]} size={[2.38,.70]} lines={[l('项目组 · 工作区','PROJECT TEAM'),l('讨论区 02','MEETING 02')]} p={p} lang={lang}/>
      <Sign name="OfficeBoard" at={[4.85,2.65,-3.754]} size={[1.47,2.32]} lines={[l('待确认','TO CONFIRM'),l('范围 · 负责人','SCOPE · OWNER'),l('核对 · 下一步','CHECK · NEXT STEP')]} p={p} lang={lang}/>
    </>}
  </group>;
}

export function AssetHand({p,open=false}:{p:Palette;open?:boolean}) {
  const asset=useSceneAsset(open?'hand-open':'hand-grip');
  const instance=useMemo(()=>instantiateAsset(asset.scene,p),[asset.scene,p]);
  useEffect(()=>instance.dispose,[instance]);
  return <primitive object={instance.scene} rotation={[0,Math.PI,0]} dispose={null}/>;
}

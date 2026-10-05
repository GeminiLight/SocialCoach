/* eslint-disable react-hooks/immutability -- The animation mixer owns this cloned rig. */
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { createPortal, useFrame } from '@react-three/fiber';
import { Bone, Euler, Group, MathUtils, Mesh, Quaternion } from 'three';
import { attentionSubject, eyeHeight, gazePose, playerEyeHeight, wrapAngle } from '../lib/attention';
import { actorBeat, playerBeat, type Drama } from '../lib/drama';
import { advancePresence, conversationalRaise, createPresence, presencePose } from '../lib/presence';
import type { Character, Lang, Scenario } from '../lib/content';
import type { Actor, World } from '../lib/room';
import type { Reply } from '../lib/engine';
import type { Palette } from '../lib/palette';
import {createPoseMixer,undoPresentation,presentationTurn} from '../lib/rigMotion';
import { avatarMetrics } from '../lib/avatarAssets';
import { facialExpression } from '../lib/facialExpression';
import { instantiateAsset, useSceneAsset, AssetCup } from './SceneAssets';
import { Phone } from './DinnerProps';

type Props={character:Character;actor:Actor;world:World;reaction?:Reply['reactions'][number];active:boolean;onSelect:()=>void;p:Palette;reduced:boolean;drama:Drama;index:number;scenario:Scenario;lang:Lang;line:string;player?:boolean;paused?:boolean;lookOffset?:RefObject<number>};

export function RiggedCharacter({character,actor,world,reaction,active,onSelect,p,reduced,drama,index,scenario,lang,line,player=false,paused=false,lookOffset}:Props) {
  const asset=useSceneAsset(character.id),root=useRef<Group>(null!),held=useRef<Group>(null!),cup=useRef<Group>(null!),phone=useRef<Group>(null!);
  const metric=avatarMetrics[character.id];
  const rig=useMemo(()=>{
    const instance=instantiateAsset(asset.scene,p),animation=createPoseMixer(instance.scene,asset.animations);
    const bones:Record<string,Bone>={},faces:Mesh[]=[];
    instance.scene.traverse(object=>{if(object instanceof Bone)bones[object.name]=object;if(object instanceof Mesh&&object.morphTargetDictionary)faces.push(object);});
    const presentation=Object.fromEntries(Object.keys(bones).map(name=>[name,new Quaternion()]));
    return {...instance,...animation,bones,faces,presentation};
  },[asset,p]);
  useEffect(()=>{rig.start();return()=>{rig.stop();rig.dispose();};},[rig]);
  const presence=useRef(createPresence(character.id));
  const motion=useRef({seat:actor.seated?1:0,raise:0,phone:0,palm:0,fold:0,lean:0,posed:false});
  const rotations=useMemo(()=>({parent:new Quaternion(),target:new Quaternion(),delta:new Quaternion(),euler:new Euler()}),[]);
  useEffect(()=>{presence.current=createPresence(character.id);motion.current.posed=false;},[character.id,actor]);
  useFrame((_,dt)=>{
    const state=motion.current,frozen=paused||document.hidden;
    if(frozen&&state.posed)return;
    const timing=advancePresence(presence.current,{dt,line,speakerId:world.speakerId,paused:frozen});
    const event=!!drama.active&&drama.phase!=='settled';
    const presenceState=presencePose(timing,{index,active,reduced,event,playback:true});
    const beat=actorBeat(drama,index,scenario.id),own=playerBeat(drama);
    const raise=player?own.raise:event?beat.raise:reaction?.gesture==='toast'?conversationalRaise(timing.elapsed):0;
    const phoneAmount=player?Math.max(own.phone,drama.inventory==='phone'?.65:0):beat.phone;
    const smoothing=reduced||!state.posed?1:1-Math.exp(-10*Math.min(dt,.05));state.posed=true;
    state.seat=MathUtils.lerp(state.seat,actor.seated?1:0,smoothing);state.raise=MathUtils.lerp(state.raise,raise,smoothing);
    state.phone=MathUtils.lerp(state.phone,phoneAmount,smoothing);state.palm=MathUtils.lerp(state.palm,player?own.palm:0,smoothing);
    state.fold=MathUtils.lerp(state.fold,!player&&!event&&!actor.moving&&reaction?.gesture==='fold'?1:0,smoothing);
    state.lean=MathUtils.lerp(state.lean,!player&&!event&&!actor.moving&&reaction?.gesture==='lean'?1:0,smoothing);
    root.current.position.set(actor.x,0,actor.z);root.current.rotation.y+=wrapAngle(actor.heading-root.current.rotation.y)*smoothing;
    const gesture=state.phone>.01?'Phone':state.raise>.01?'Toast':state.palm>.01?'Palm':state.fold>.01?'Fold':state.lean>.01?'Lean':'Idle';
    const amount=MathUtils.clamp(gesture==='Phone'?state.phone:gesture==='Toast'?state.raise:gesture==='Palm'?state.palm:gesture==='Fold'?state.fold:gesture==='Lean'?state.lean:0,0,1);
    for(const [name,action] of Object.entries(rig.actions)) {
      const seat=name.startsWith('Seated')?state.seat:1-state.seat;
      const weight=name.endsWith(gesture)&&gesture!=='Idle'?amount:name.endsWith('Idle')?1-amount:0;
      action.setEffectiveWeight(seat*weight);
    }
    undoPresentation(rig.bones,rig.presentation);
    rig.mixer.update(frozen?0:Math.min(dt,.05));

    const subject=player?attentionSubject(world):beat.gaze>=0&&beat.gaze!==index?world.npcs[beat.gaze]:world.player;
    const target=subject?{x:subject.x,z:subject.z,eye:subject===world.player?playerEyeHeight(subject):eyeHeight(subject)}:{x:actor.x+Math.sin(world.viewYaw)*6,z:actor.z+Math.cos(world.viewYaw)*6,eye:playerEyeHeight(actor)+Math.tan(world.viewPitch)*6};
    if(player&&lookOffset?.current){const dx=target.x-actor.x,dz=target.z-actor.z,yaw=lookOffset.current;target.x=actor.x+dx*Math.cos(yaw)+dz*Math.sin(yaw);target.z=actor.z+dz*Math.cos(yaw)-dx*Math.sin(yaw);}
    const speaker=world.npcs.find(n=>n.id===world.speakerId);
    if(!player&&!actor.moving&&speaker&&speaker!==actor){const a=presenceState.speakerAttention;target.x=MathUtils.lerp(target.x,speaker.x,a);target.z=MathUtils.lerp(target.z,speaker.z,a);target.eye=MathUtils.lerp(target.eye,eyeHeight(speaker),a);}
    if(!player&&actor.seated&&presenceState.tableAttention>0){const a=presenceState.tableAttention;target.x=MathUtils.lerp(target.x,actor.x+Math.sin(actor.heading),a);target.z=MathUtils.lerp(target.z,actor.z+Math.cos(actor.heading),a);target.eye=MathUtils.lerp(target.eye,1.75,a);}
    const gaze=gazePose(actor,target,root.current.rotation.y);
    const turn=(bone:Bone|undefined,x:number,y:number,z=0)=>presentationTurn(bone,rig.presentation,rotations,x,y,z);
    // Respiration belongs to the connected rig, never the actor's world root.
    // Explicit gestures and walking keep their authored silhouette.
    const breathing=actor.moving?0:presenceState.breath;
    turn(rig.bones.spine_02,breathing*1.7,0);
    turn(rig.bones.spine_03,-breathing*.7,gaze.torso*.6);turn(rig.bones.neck_01,0,gaze.head*.15);
    turn(rig.bones.head,gaze.pitch+(reaction?.gesture==='nod'?presenceState.emphasis*.04:0),gaze.head*.85);
    if(actor.moving&&!reduced){const stride=Math.sin(timing.time*8)*.26;turn(rig.bones.thigh_l,stride,0);turn(rig.bones.thigh_r,-stride,0);turn(rig.bones.upperarm_l,-stride*.5,0);turn(rig.bones.upperarm_r,stride*.5,0);}
    const expression=facialExpression(player?'neutral':reaction?.emotion);
    for(const face of rig.faces){const dict=face.morphTargetDictionary!,values=face.morphTargetInfluences!;for(const [name,value] of Object.entries({...expression,blink:1-presenceState.blink,jawOpen:presenceState.speech*.34,browInnerUp:expression.browInnerUp+presenceState.emphasis*.10,mouthPress:expression.mouthPress*(1-presenceState.speech)})){if(dict[name]!==undefined)values[dict[name]]=name==='blink'||name==='jawOpen'?value:MathUtils.lerp(values[dict[name]],value,smoothing);}}
    root.current.updateMatrixWorld(true);
    if(held.current&&rig.bones.hand_r){
      rig.bones.hand_r.getWorldQuaternion(rotations.parent);rotations.target.setFromEuler(rotations.euler.set(beat.sip*.14,root.current.rotation.y,0));
      held.current.quaternion.copy(rotations.parent).invert().multiply(rotations.target);
      cup.current.visible=player?(drama.inventory==='glass'||drama.inventory==='tea'):state.raise>.015;
      phone.current.visible=player?drama.inventory==='phone'&&(drama.choice!=='accept'||drama.elapsed>.45):state.phone>.01&&!(drama.choice==='accept'&&drama.elapsed>.45);
    }
  });
  const wine=scenario.id!=='family'&&(player?drama.inventory==='glass':index===0);
  return <group ref={root} name={`dinner-actor-${actor.id}`} position={[actor.x,0,actor.z]} rotation={[0,actor.heading,0]} onClick={event=>{event.stopPropagation();if(event.delta<5&&!player)onSelect();}}>
    <primitive object={rig.scene} dispose={null}/>
    {rig.bones.hand_r&&createPortal(<group ref={held} scale={1/metric.scale} position={[0,.065,0]}>
      <group ref={cup} visible={false} position={wine?[.05,-.06,-.02]:[-.09,.04,-.02]}><AssetCup palette={p} wine={wine}/></group>
      <group ref={phone} visible={false} position={[0,.16,.07]}><Phone p={p} kind={scenario.id==='school'?'photo':scenario.id==='family'?'intro':'calendar'} lang={lang}/></group>
    </group>,rig.bones.hand_r)}
  </group>;
}

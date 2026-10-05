/* eslint-disable react-hooks/immutability -- Three.js cameras, meshes and the room simulation are mutable resources; React renders their separate snapshots. */
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import { ACESFilmicToneMapping, MathUtils, Mesh, PerspectiveCamera, Raycaster, Vector3, type Object3D } from 'three';
import { emotions, gestures, pick, ui, type Character, type Lang, type Scenario } from '../lib/content';
import { getPalette } from '../lib/palette';
import { snapshot, roomUiKey, stepWorld, focusConversation, freeLook, type World, type ViewMode, type RoomSave, type RoomEvent, type Point } from '../lib/room';
import { l } from '../lib/content';
import { attentionSubject, eyeHeight, cameraPose, constrainCamera, trackAttention, wrapAngle } from '../lib/attention';
import {actorActionLabel,type Drama} from '../lib/drama';
import {TableCups,ScenarioObjects,PlayerHands} from './DinnerProps';
import {RiggedCharacter} from './RiggedCharacter';
import {AssetRoom,useSceneAsset} from './SceneAssets';
import {RenderBudget} from './RenderBudget';
import {RoomLighting} from './RoomLighting';
import {useDinnerSurfaces} from '../lib/surfaces';
import type { Reply } from '../lib/engine';
import type { TiltOutput } from '../lib/tilt';
import { aimedPerson, GazeRecipient } from '../lib/gazeRecipient';

type SceneProps = { hudHeight:number; drama:Drama; line:string; speaking:boolean; scenario: Scenario; lang: Lang; reactions: Reply['reactions']; speakerId: string; selectedId: string | null; onSelect: (id: string) => void; onEvidence:()=>void; reduced: boolean; started: boolean; viewReset: number; world:World; view:ViewMode; input:RefObject<Point>; tilt:RefObject<TiltOutput>; gazeEnabled:boolean; gazeActive:boolean; onGazeRecipient:(id:string)=>void; paused:boolean; onWorldChange:(save:RoomSave,event:RoomEvent)=>void; onAvailability:(available:boolean)=>void };
function ProjectLabels({ elements, world, speakerId, selectedId, view }: { elements:RefObject<(HTMLButtonElement|null)[]>; world:World; speakerId:string; selectedId:string|null; view:ViewMode }) {
  const {invalidate}=useThree();
  const vectors=useMemo(()=>({point:new Vector3(),right:new Vector3(),center:new Vector3(),projected:new Vector3(),side:new Vector3(),top:new Vector3(),bottom:new Vector3()}),[]);
  const layout=useRef({dirty:true,occupied:[] as {x:number;y:number;w:number;h:number}[],dimensions:new Map<Element,{w:number;h:number}>(),observed:new Set<Element>()});
  const resize=useRef<ResizeObserver|null>(null),elapsed=useRef(0);
  useEffect(()=>{
    const dirty=()=>{layout.current.dirty=true;invalidate();};
    resize.current=new ResizeObserver(dirty);
    const mutation=new MutationObserver(dirty);
    const shell=document.querySelector('.dinner-experience .app-shell');
    if(shell)mutation.observe(shell,{childList:true,subtree:true});
    window.addEventListener('resize',dirty);dirty();
    return()=>{resize.current?.disconnect();mutation.disconnect();window.removeEventListener('resize',dirty);};
  },[invalidate]);
  useFrame(({camera,size},dt)=>{
    elapsed.current+=dt;
    if(elapsed.current<1/30&&!layout.current.dirty)return;
    elapsed.current=0;
    const cache=layout.current;
    if(cache.dirty){
      const overlays=[...document.querySelectorAll('.dinner-experience .topbar,.dinner-experience .scene-controls,.dinner-experience .attention-control,.dinner-experience .world-controls,.dinner-experience .conversation')];
      const current=new Set([...overlays,...elements.current.filter((el):el is HTMLButtonElement=>!!el)]);
      for(const el of cache.observed)if(!current.has(el)){resize.current?.unobserve(el);cache.observed.delete(el);cache.dimensions.delete(el);}
      for(const el of current)if(!cache.observed.has(el)){resize.current?.observe(el);cache.observed.add(el);}
      cache.occupied=overlays.map(el=>{const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height};});
      for(const el of elements.current)if(el)cache.dimensions.set(el,{w:el.offsetWidth,h:el.offsetHeight});
      cache.dirty=false;
    }
    const occupied=[...cache.occupied];
    const {point,right,center,projected,side,top,bottom}=vectors;
    const cameraRight=right.set(1,0,0).applyQuaternion(camera.quaternion);
    const faces=[...world.npcs,...(view==='third'?[world.player]:[])].flatMap(actor=>{
      center.set(actor.x,eyeHeight(actor),actor.z);projected.copy(center).project(camera);
      if(projected.z< -1||projected.z>1)return [];
      side.copy(center).addScaledVector(cameraRight,.30).project(camera);
      top.copy(center);top.y+=.36;top.project(camera);bottom.copy(center);bottom.y-=.36;bottom.project(camera);
      return [{x:(projected.x*.5+.5)*size.width,y:(projected.y*-.5+.5)*size.height,w:Math.abs(side.x-projected.x)*size.width,h:Math.abs(top.y-bottom.y)*size.height*.5}];
    });
    const focusId=attentionSubject(world)?.id;
    const candidates=world.npcs.map((actor,i)=>{
      point.set(actor.x,eyeHeight(actor)+.56,actor.z).project(camera);
      const el=elements.current[i];
      const priority=actor.id===focusId?3:actor.id===speakerId?2:actor.id===selectedId?1:0;
      return {el,priority,depth:point.z,x:(point.x*.5+.5)*size.width,y:(-point.y*.5+.5)*size.height,visible:point.z>-1&&point.z<1&&Math.abs(point.x)<1.03&&Math.abs(point.y)<.95};
    }).sort((a,b)=>b.priority-a.priority||a.depth-b.depth);
    for(const candidate of candidates){
      const {el}=candidate;if(!el)continue;
      const dimensions=cache.dimensions.get(el);if(!dimensions){cache.dirty=true;invalidate();continue;}
      const {w,h}=dimensions,x=MathUtils.clamp(candidate.x,w/2+6,size.width-w/2-6);
      const y=[0,16,32,48,64].map(offset=>candidate.y-offset).find(y=>y>h/2+80&&![...occupied,...faces].some(r=>Math.abs(r.x-x)<(r.w+w)/2+5&&Math.abs(r.y-y)<(r.h+h)/2+5));
      const visible=candidate.visible&&y!==undefined;
      const transform=`translate(${x.toFixed(1)}px,${(y??candidate.y).toFixed(1)}px) translate(-50%,-50%)`,visibility=visible?'visible':'hidden';
      if(el.style.transform!==transform)el.style.transform=transform;if(el.style.visibility!==visibility)el.style.visibility=visibility;
      if(visible)occupied.push({x,y:y!,w,h});
    }
  });return null;
}

function WorldDirector({props,heading}:{props:SceneProps;heading:RefObject<number>}) {
  const keys=useRef(new Set<string>());const last=useRef('');const elapsed=useRef(0);const revision=useRef(-1);const marker=useRef<Mesh>(null!);
  useEffect(()=>{const down=(e:KeyboardEvent)=>{if(props.paused||e.target instanceof HTMLElement&&e.target.closest('textarea,input,select,[contenteditable=true],dialog'))return;if(['w','a','s','d'].includes(e.key.toLowerCase())){keys.current.add(e.key.toLowerCase());e.preventDefault();}};const up=(e:KeyboardEvent)=>keys.current.delete(e.key.toLowerCase());const clear=()=>{keys.current.clear();props.input.current={x:0,z:0};};window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);return ()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);clear();};},[props.paused,props.input]);
  useFrame((_,dt)=>{const k=keys.current;const input={x:props.input.current.x+(k.has('d')?1:0)-(k.has('a')?1:0),z:props.input.current.z+(k.has('w')?1:0)-(k.has('s')?1:0)};stepWorld(props.world,dt,input,heading.current,props.reactions,props.paused);if(!props.paused&&!props.world.player.seated&&!props.world.player.moving)props.world.player.heading=props.world.viewYaw;marker.current.visible=!!props.world.destination;if(props.world.destination)marker.current.position.set(props.world.destination.x,.016,props.world.destination.z);elapsed.current+=dt;if(elapsed.current>.2||revision.current!==props.world.revision){elapsed.current=0;const state=snapshot(props.world);const serialized=roomUiKey(state);if(serialized!==last.current||revision.current!==props.world.revision){last.current=serialized;revision.current=props.world.revision;props.onWorldChange(state,props.world.event);}}},-2);
  const p=useMemo(()=>getPalette(),[]);return <mesh ref={marker} rotation={[-Math.PI/2,0,0]} visible={false}><ringGeometry args={[.16,.23,32]}/><meshBasicMaterial color={p.brass} transparent opacity={.85} toneMapped={false}/></mesh>;
}
function CameraRig({props,heading,lookOffset}:{props:SceneProps;heading:RefObject<number>;lookOffset:RefObject<number>}) {
  const {camera,size,gl,invalidate,scene}=useThree();
  const drag=useRef<{x:number;y:number;originX:number;originY:number;id:number;active:boolean}|null>(null);
  const position=useMemo(()=>new Vector3(),[]),target=useMemo(()=>new Vector3(),[]);
  const resetSeen=useRef(props.viewReset);const framingOffset=useRef(0);const sideOffset=useRef(0);
  const aim=useRef(new GazeRecipient()),lastYaw=useRef(0),aimPoint=useMemo(()=>new Vector3(),[]);
  const ray=useMemo(()=>new Raycaster(),[]);
  const reticle=useRef<HTMLElement|null>(null);
  useEffect(()=>{aim.current=new GazeRecipient();},[props.gazeEnabled,props.world,props.view]);
  useEffect(()=>{reticle.current=document.querySelector('.dinner-gaze-reticle');},[props.gazeEnabled,props.gazeActive]);
  useEffect(()=>{if(resetSeen.current!==props.viewReset){focusConversation(props.world);resetSeen.current=props.viewReset;}},[props.viewReset,props.world]);
  useEffect(()=>{
    const canvas=gl.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label',pick(ui.cameraLabel,props.lang));
    const down=(e:PointerEvent)=>{if(e.button===0&&!props.paused)drag.current={x:e.clientX,y:e.clientY,originX:e.clientX,originY:e.clientY,id:e.pointerId,active:false};};
    const move=(e:PointerEvent)=>{
      const previous=drag.current;if(!previous||previous.id!==e.pointerId||props.paused)return;
      if(!previous.active){if(Math.hypot(e.clientX-previous.originX,e.clientY-previous.originY)<5)return;previous.active=true;freeLook(props.world);}
      props.world.viewYaw=wrapAngle(props.world.viewYaw-(e.clientX-previous.x)*.003);
      props.world.viewPitch=MathUtils.clamp(props.world.viewPitch+(e.clientY-previous.y)*.002,-.48,.38);
      previous.x=e.clientX;previous.y=e.clientY;
    };
    const up=()=>{drag.current=null;};
    const key=(e:KeyboardEvent)=>{
      if(props.paused)return;
      const steps:Record<string,[number,number]>={ArrowLeft:[.1,0],ArrowRight:[-.1,0],ArrowUp:[0,.04],ArrowDown:[0,-.04]};
      if(e.key==='Home'){focusConversation(props.world);e.preventDefault();}
      else if(steps[e.key]){freeLook(props.world);const[yaw,pitch]=steps[e.key];props.world.viewYaw=wrapAngle(props.world.viewYaw+yaw);props.world.viewPitch=MathUtils.clamp(props.world.viewPitch+pitch,-.48,.38);e.preventDefault();}
    };
    canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('keydown',key);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);window.addEventListener('blur',up);
    return ()=>{canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('keydown',key);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);window.removeEventListener('blur',up);drag.current=null;};
  },[gl,props.lang,props.world,props.paused]);
  useFrame((_,dt)=>{
    props.world.speakerId=props.speakerId;
    if(!props.paused||!props.started)trackAttention(props.world,dt,props.reduced);
    heading.current=props.world.viewYaw;
    const wanted=props.paused||props.reduced||document.hidden?0:props.tilt.current.yaw;
    lookOffset.current=MathUtils.lerp(lookOffset.current,wanted,1-Math.exp(-12*Math.min(dt,.05)));
    if(Math.abs(lookOffset.current)<.0001)lookOffset.current=0;
    const pose=cameraPose(props.world,props.view,size.width/size.height,lookOffset.current);
    const perspective=camera as PerspectiveCamera;
    perspective.fov=MathUtils.lerp(perspective.fov,pose.fov,props.reduced?1:1-Math.exp(-10*Math.min(dt,.05)));const offset=props.started?Math.min(size.height*(props.scenario.space?.22:.15),Math.max(0,props.hudHeight-190)*.45+(props.scenario.space&&props.view==='first'?(size.width>600?40:20):0)):0;framingOffset.current=MathUtils.lerp(framingOffset.current,offset,props.reduced?1:1-Math.exp(-8*Math.min(dt,.05)));sideOffset.current=MathUtils.lerp(sideOffset.current,size.width/size.height<=1.25&&!props.world.player.seated?-56:0,props.reduced?1:1-Math.exp(-8*Math.min(dt,.05)));perspective.setViewOffset(size.width,size.height,sideOffset.current,framingOffset.current,size.width,size.height);perspective.updateProjectionMatrix();
    position.set(pose.position[0],pose.position[1],pose.position[2]);target.set(pose.target[0],pose.target[1],pose.target[2]);
    camera.position.lerp(position,props.reduced?1:1-Math.exp(-14*Math.min(dt,.05)));if(props.view==='third')camera.position.fromArray(constrainCamera(props.world,camera.position.toArray()));camera.lookAt(target);
    const aimX=.5-sideOffset.current/size.width,aimY=.5-framingOffset.current/size.height;
    if(reticle.current){reticle.current.style.left=`${aimX*100}%`;reticle.current.style.top=`${aimY*100}%`;}
    const yaw=props.world.viewYaw+lookOffset.current,speed=Math.abs(wrapAngle(yaw-lastYaw.current))/Math.max(dt,.001);lastYaw.current=yaw;
    const editing=document.activeElement instanceof HTMLElement&&!!document.activeElement.closest('textarea,input,select,[contenteditable=true]');
    if(props.gazeEnabled&&props.gazeActive&&!props.paused&&!drag.current&&!props.world.player.moving&&!editing&&!document.hidden){
      camera.updateMatrixWorld();
      const faces=props.world.npcs.map(actor=>{aimPoint.set(actor.x,eyeHeight(actor),actor.z).project(camera);return {id:actor.id,x:aimPoint.x*.5+.5-aimX,y:aimPoint.y*-.5+.5-aimY,visible:!actor.moving&&aimPoint.z>-1&&aimPoint.z<1&&Math.abs(aimPoint.x)<1&&Math.abs(aimPoint.y)<1};});
      const id=aim.current.step(aimedPerson(faces),dt,speed<.28);
      if(id){
        const actor=props.world.npcs.find(n=>n.id===id)!;
        aimPoint.set(actor.x,eyeHeight(actor),actor.z).sub(camera.position);
        ray.set(camera.position,aimPoint.clone().normalize());ray.near=.05;ray.far=Math.max(.05,aimPoint.length()-.18);
        const occluders=[scene.getObjectByName('dinner-room'),...[...props.world.npcs,props.world.player].filter(other=>other.id!==id).map(other=>scene.getObjectByName(`dinner-actor-${other.id}`))].filter((object):object is Object3D=>!!object);
        const blocked=ray.intersectObjects(occluders,true).some(hit=>{let object=hit.object;while(object){if(!object.visible)return false;if(!object.parent)break;object=object.parent;}return true;});
        if(blocked)aim.current.blocked();else props.onGazeRecipient(id);
      }
    }else aim.current.reset();
    if(props.paused&&(Math.abs(lookOffset.current-wanted)>.0001||camera.position.distanceToSquared(position)>1e-7||Math.abs(perspective.fov-pose.fov)>.001||Math.abs(framingOffset.current-offset)>.01))invalidate();
  },-1);return null;
}
const playerCharacter:Character={id:'player',name:l('你','You'),role:l('玩家','Player'),description:l('你的角色','Your character'),outfit:'shirt',palette:'navy',hair:'short',glasses:false};

function AssetReady({scenario,view,onReady}:{scenario:Scenario;view:ViewMode;onReady:(ready:boolean)=>void}) {
  useSceneAsset(`room-${scenario.space??scenario.id}`);
  useSceneAsset(scenario.characters[0].id);
  useSceneAsset(scenario.characters[1].id);
  useSceneAsset(scenario.characters[2].id);
  useSceneAsset('props');
  useSceneAsset(view==='third'?'player':'hand-grip');
  useEffect(()=>{onReady(true);return()=>onReady(false);},[onReady]);
  return null;
}

class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode; onError:()=>void },{ error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error:true }; }
  componentDidCatch(){this.props.onError();}
  render() { return this.state.error ? this.props.fallback : this.props.children; }
}

export default function DinnerScene(props: SceneProps) {
  const p=useMemo(()=>getPalette(),[]);
  const surfaces=useDinnerSurfaces(p,props.scenario.space?'none':props.scenario.id==='family'?'family':'landscape');
  const labels=useRef<(HTMLButtonElement|null)[]>([]);
  const [ready,setReady]=useState(false);
  const availability=props.onAvailability;
  const assetReady=useCallback((value:boolean)=>{setReady(value);availability(value);},[availability]);
  const heading=useRef(Math.PI);
  const lookOffset=useRef(0);
  const [visible,setVisible]=useState(()=>!document.hidden);
  const [dpr,setDpr]=useState(()=>Math.min(window.devicePixelRatio||1,window.innerWidth<=600?1.25:1.5));
  useEffect(()=>{const change=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',change);return()=>document.removeEventListener('visibilitychange',change);},[]);
  const fallback=<div className="scene-fallback"><p>{pick(ui.sceneFallback,props.lang)}</p><div>{props.scenario.characters.map(c=><button key={c.id} onClick={()=>props.onSelect(c.id)}>{pick(c.name,props.lang)}<small>{pick(c.role,props.lang)}</small></button>)}</div></div>;
  return <SceneBoundary fallback={fallback} onError={()=>props.onAvailability(false)}><div className="dinner-render"><Suspense fallback={<div className="scene-loading" role="status">{pick(ui.sceneLoading,props.lang)}</div>}><Canvas role="img" aria-label={pick(ui.cameraLabel,props.lang)} frameloop={!props.paused&&visible?'always':'demand'} shadows dpr={dpr} camera={{position:[0,2.58,3.55],fov:55,near:.1,far:60}} gl={{ antialias:true, toneMapping:ACESFilmicToneMapping, toneMappingExposure:1.02 }} fallback={null} >
    <color attach="background" args={[props.scenario.space?p.officeWall:p.wall]} /><fog attach="fog" args={[props.scenario.space?p.officeWall:p.wall,18,36]} />
    <RoomLighting p={p} scenario={props.scenario}/>
    <AssetReady key={`${props.scenario.id}-${props.view}`} scenario={props.scenario} view={props.view} onReady={assetReady}/>
    <WorldDirector props={props} heading={heading}/>
    <RenderBudget active={!props.paused&&visible} onChange={setDpr}/>
    <AssetRoom p={p} world={props.world} scenario={props.scenario} lang={props.lang} paused={props.paused} onEvidence={props.onEvidence} surfaces={surfaces}/>
    {!props.scenario.space&&<><TableCups p={p} world={props.world} drama={props.drama} scenario={props.scenario} reactions={props.reactions} line={props.line} paused={props.paused}/><ScenarioObjects p={p} drama={props.drama} scenario={props.scenario} lang={props.lang} reduced={props.reduced}/></>}

    {props.scenario.characters.map((c,i)=><RiggedCharacter key={c.id} character={c} actor={props.world.npcs[i]} world={props.world} reaction={props.reactions.find(r=>r.characterId===c.id)} active={props.speaking&&props.speakerId===c.id} onSelect={()=>props.onSelect(c.id)} p={p} reduced={props.reduced} drama={props.drama} index={i} scenario={props.scenario} lang={props.lang} line={props.line} paused={props.paused} />)}
    {props.view==='third'&&<RiggedCharacter character={playerCharacter} actor={props.world.player} world={props.world} active={false} onSelect={()=>{}} p={p} reduced={props.reduced} drama={props.drama} index={3} scenario={props.scenario} lang={props.lang} line={props.line} paused={props.paused} lookOffset={lookOffset} player/>}
    {props.view==='first'&&<PlayerHands p={p} drama={props.drama} lang={props.lang} scenario={props.scenario} world={props.world} hudHeight={props.hudHeight}/>}
    <ContactShadows position={[0,.02,0]} opacity={.24} scale={14} blur={2.5} far={4.5} resolution={256} frames={1} color={p.dark} />
    <CameraRig props={props} heading={heading} lookOffset={lookOffset}/>
    <ProjectLabels elements={labels} world={props.world} speakerId={props.speakerId} selectedId={props.selectedId} view={props.view}/>
  </Canvas></Suspense>{ready&&<div className="scene-labels">{props.scenario.characters.map((c,i)=>{const reaction=props.reactions.find(r=>r.characterId===c.id);const active=props.speaking&&props.speakerId===c.id;const selected=props.selectedId===c.id;const actor=props.world.npcs[i];const eventGesture=actorActionLabel(props.drama,i,props.scenario.id,props.lang);return <button key={c.id} ref={el=>{labels.current[i]=el;}} className={`npc-label ${active?'is-speaking':''} ${selected?'is-selected':''} ${actor.seated?'':'is-standing'}`} onClick={()=>props.onSelect(c.id)} aria-pressed={selected}><span className="npc-name">{active&&<i/>}{pick(c.name,props.lang)}</span><span className="npc-state sr-only">{actor.moving?pick(ui.walking,props.lang):!actor.seated?pick(ui.standing,props.lang):active?pick(ui.speaking,props.lang):pick(emotions[reaction?.emotion??'neutral'],props.lang)}<span className="npc-gesture"><span className="label-divider">/</span>{eventGesture??pick(gestures[reaction?.gesture??'idle'],props.lang)}</span></span></button>;})}</div>}</div></SceneBoundary>;
}

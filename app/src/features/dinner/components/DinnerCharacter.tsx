import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, MathUtils, Mesh, DoubleSide, SkinnedMesh, MeshStandardMaterial, Quaternion, Euler, type Texture } from 'three';
import type { Character, Lang, Scenario } from '../lib/content';
import type { Palette } from '../lib/palette';
import type { Actor, World } from '../lib/room';
import type { Reply } from '../lib/engine';
import { attentionSubject, eyeHeight, gazePose, playerEyeHeight, wrapAngle } from '../lib/attention';
import { castAppearance } from '../lib/cast';
import { actorBeat, playerBeat, type Drama } from '../lib/drama';
import { silhouette, faceFeatures, curveGeometry, drapedPolygonGeometry, drapedCurveGeometry, clothSurface, type V3, type Ring } from '../lib/avatar';
import type { DinnerSurfaces } from '../lib/surfaces';
import { Cup, Phone } from './DinnerProps';
import { DinnerHand } from './DinnerHand';
import { DinnerFace } from './DinnerFace';
import { garmentGeometry, garmentRig, jacketProfile, trouserGeometry, trouserRig, bindRestPose } from '../lib/anatomy';
import { createPresence, advancePresence, presencePose, conversationalRaise } from '../lib/presence';

type Props = { character:Character; actor:Actor; world:World; reaction?:Reply['reactions'][number]; active:boolean; onSelect:()=>void; p:Palette; surfaces:DinnerSurfaces; reduced:boolean; drama:Drama; index:number; scenario:Scenario; lang:Lang; line:string; player?:boolean; paused?:boolean };
function Form({rings,color,roughness=.85,weave}:{rings:Ring[];color:string;roughness?:number;weave?:Texture}) {
  const key=JSON.stringify(rings),geometry=useMemo(()=>silhouette(JSON.parse(key)),[key]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial color={color} roughness={roughness} bumpMap={weave} bumpScale={weave?.0025:0}/></mesh>;
}
function Oval({position=[0,0,0],scale,color,rotation=[0,0,0],roughness=.8}:{position?:V3;scale:V3;color:string;rotation?:V3;roughness?:number}) {return <mesh position={position} scale={scale} rotation={rotation} castShadow><sphereGeometry args={[1,20,14]}/><meshStandardMaterial color={color} roughness={roughness}/></mesh>;}
function Stroke({points,color,radius=.004,opacity=1,profile}:{points:V3[];color:string;radius?:number;opacity?:number;profile?:Ring[]}) {
  const key=JSON.stringify(points),profileKey=JSON.stringify(profile??null),geometry=useMemo(()=>profileKey!=="null"?drapedCurveGeometry(JSON.parse(key),JSON.parse(profileKey),radius):curveGeometry(JSON.parse(key),radius),[key,profileKey,radius]);useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry}><meshStandardMaterial color={color} roughness={.86} transparent={opacity<1} opacity={opacity} depthWrite={opacity===1}/></mesh>;
}
function Panel({points,color,profile,lift=.005}:{points:V3[];color:string;profile:Ring[];lift?:number}) {
  const key=JSON.stringify(points),profileKey=JSON.stringify(profile),geometry=useMemo(()=>drapedPolygonGeometry(JSON.parse(key),JSON.parse(profileKey),lift+.010),[key,profileKey,lift]);useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry} castShadow><meshStandardMaterial color={color} roughness={.9} side={DoubleSide}/></mesh>;
}
function Clothing({character,p}:{character:Character;p:Palette}) {
  const feminine=castAppearance(character.id).feminine,suit=character.outfit==='suit',blazer=character.outfit==='blazer',color=p[character.palette];
  const profile=jacketProfile(feminine);
  return <>
    {(suit||blazer||character.outfit==='polo')&&<Form color={suit?p.white:color} rings={[[.756,.135,.121,-.017],[.808,.112,.113,-.017],[.864,.107,.114,-.019]]}/>}
    <group scale={[1,1.07,1]}>
    {suit||blazer?<>
      <Panel profile={profile} color={p.white} points={[[-.105,.80,.13],[.105,.80,.13],[.15,.58,.222],[0,.22,.238],[-.15,.58,.222]]}/>
      {suit&&<Panel profile={profile} lift={.011} color={p.wine} points={[[0,.757,.204],[.032,.718,.224],[.024,.666,.258],[.036,.30,.263],[0,.24,.265],[-.036,.30,.263],[-.024,.666,.258],[-.032,.718,.224]]}/>}
      {[-1,1].map(side=><group key={side}>
        <Panel profile={profile} lift={.010} color={color} points={[[side*.135,.75,.146],[side*.34,.6,.221],[side*.242,.49,.26],[side*.29,.435,.253],[side*.042,.08,.26],[side*.135,.6,.244]]}/>
        <Stroke profile={profile} color={p.clothHighlight} radius={.0018} opacity={.4} points={[[side*.133,.744,.15],[side*.338,.599,.226],[side*.24,.49,.265],[side*.287,.435,.258],[side*.04,.08,.265]]}/>
        {suit&&<Panel profile={profile} lift={.016} color={p.white} points={[[side*.035,.775,.15],[side*.122,.785,.15],[side*.152,.687,.231],[side*.057,.653,.25]]}/>}
      </group>)}
      <Stroke profile={profile} color={p.clothHighlight} radius={.003} points={[[-.28,.28,.228],[-.16,.278,.26]]}/>
      {suit&&<Panel profile={profile} lift={.012} color={p.porcelain} points={[[-.261,.283,.233],[-.248,.315,.232],[-.222,.286,.242],[-.199,.309,.245],[-.18,.281,.252]]}/>}
      {blazer&&<Oval position={[.12,.6,clothSurface(profile,.12,.6)+.024]} scale={[.024,.014,.007]} color={p.brass}/>}
      <Oval position={[.025,.02,.248]} scale={[.014,.014,.009]} color={p.woodEdge}/>
    </>:character.outfit==='shirt'||character.outfit==='polo'?<>
      {character.id==='senior'&&<Panel profile={profile} color={p.white} points={[[-.10,.71,0],[.1,.71,0],[.075,.22,0],[-.075,.22,0]]}/>}
      {character.id==='senior'?[-1,1].map(side=><Stroke key={side} profile={profile} color={p.clothHighlight} radius={.003} points={[[side*.108,-.26,0],[side*.11,.28,0],[side*.12,.68,0]]}/>):<Stroke profile={profile} color={p.clothHighlight} radius={.004} points={[[0,-.29,.212],[0,.19,.248],[0,.58,.232],[0,.71,.16]]}/>}
      {[-1,1].map(side=><Panel profile={profile} key={side} color={color} lift={.014} points={[[side*.012,.728,.144],[side*.127,.754,.133],[side*.207,.629,.206],[side*.098,.528,.256],[side*.028,.652,.203]]}/>)}
      {(character.outfit==='polo'?[.62,.53]:[.51,.35,.19,.03,-.13]).map(y=>{const x=character.id==='senior'?.135:.012;return <Oval key={y} position={[x,y,clothSurface(profile,x,y)+.013]} scale={[.009,.009,.005]} color={p.porcelain}/>;})}
      {character.outfit==='shirt'&&<Stroke profile={profile} color={p.clothHighlight} radius={.0024} points={[[-.29,.41,.201],[-.16,.42,.242],[-.16,.235,.25],[-.22,.21,.239],[-.29,.24,.21],[-.29,.41,.201]]}/>}
      {character.outfit==='polo'&&[.10,.14,.18,.22].map(y=><Stroke profile={profile} key={y} color={p.white} radius={.003} opacity={.35} points={[[-.30,y,0],[0,y,0],[.30,y,0]]}/>)}
    </>:character.outfit==='cardigan'?<>
      <Panel profile={profile} color={p.white} points={[[-.12,.72,0],[.12,.72,0],[.075,.38,0],[.07,-.26,0],[-.07,-.26,0],[-.075,.38,0]]}/>
      {[-1,1].map(side=><Stroke key={side} profile={profile} color={color} radius={.021} points={[[side*.125,.72,0],[side*.085,.42,0],[side*.078,.05,0],[side*.075,-.25,0]]}/>)}
      {[.34,.14,-.06,-.24].map(y=><Oval key={y} position={[.09,y,clothSurface(profile,.09,y)+.025]} scale={[.013,.013,.006]} color={p.woodEdge}/>)}
      {character.id==='aunt'&&<>
        <Form color={p.oat} rings={[[.71,.166,.144,0],[.75,.153,.135,0],[.81,.128,.126,-.008]]}/>
        <Panel profile={profile} color={p.oat} lift={.024} points={[[.08,.71,0],[.20,.61,0],[.18,.25,0],[.11,.18,0],[.08,.57,0]]}/>
        {[.29,.36,.43,.50].map(y=><Stroke key={y} profile={profile} color={p.wine} radius={.005} points={[[.105,y,0],[.175,y+.02,0]]}/>)}
      </>}
    </>:character.outfit==='hoodie'?<>
      <Form color={color} rings={[[.69,.173,.153,-.02],[.76,.190,.166,-.024],[.83,.165,.150,-.035],[.89,.12,.116,-.038]]}/>
      {[-1,1].map(side=><Stroke key={side} profile={profile} color={p.oat} radius={.005} points={[[side*.09,.70,0],[side*.10,.50,0],[side*.09,.35,0]]}/>)}
      <Stroke profile={profile} color={p.clothHighlight} opacity={.5} radius={.0035} points={[[-.23,.08,0],[-.18,.13,0],[.18,.13,0],[.23,.08,0],[.22,-.14,0],[-.22,-.14,0],[-.23,.08,0]]}/>
    </>:character.outfit==='crewneck'?<>
      <Form color={p.denim} rings={[[.71,.15,.136,-.02],[.745,.144,.132,-.02],[.78,.124,.12,-.022]]}/>
      <Panel profile={profile} color={p.terracotta} points={[[-.11,.34,0],[.01,.34,0],[.01,.28,0],[-.11,.28,0]]}/>
      <Panel profile={profile} color={p.denim} points={[[.03,.34,0],[.10,.34,0],[.10,.28,0],[.03,.28,0]]}/>
    </>:<>
      {[-1,1].map(side=><Stroke profile={profile} key={side} color={p.clothHighlight} radius={.002} points={[[side*.22,-.25,.166],[side*.18,.12,.219],[side*.25,.4,.2]]}/>)}
    </>}
    <Stroke profile={profile} color={p.clothHighlight} radius={.002} points={[[-.3,-.28,.111],[0,-.289,.213],[.3,-.28,.111]]}/>
    </group>
  </>;
}
export function DinnerCharacter({ character, actor, world, reaction, active, onSelect, p, surfaces, reduced, drama, index, scenario, lang, line, player=false, paused=false }:Props) {
  const root=useRef<Group>(null!),legL=useRef<Group>(null!),legR=useRef<Group>(null!),shinL=useRef<Group>(null!),shinR=useRef<Group>(null!);
  const torso=useRef<Group>(null!),head=useRef<Group>(null!),right=useRef<Group>(null!),left=useRef<Group>(null!),mouth=useRef<Mesh>(null!),glass=useRef<Group>(null!),phone=useRef<Group>(null!);
  const heldProps=useRef<Group>(null!);
  const wristRotation=useMemo(()=>({parent:new Quaternion(),target:new Quaternion(),euler:new Euler()}),[]);
  const eyes=useRef<(Group|null)[]>([]),relaxedHand=useRef<Group>(null!),cupHand=useRef<Group>(null!),phoneHand=useRef<Group>(null!),openHand=useRef<Group>(null!),leftRelaxed=useRef<Group>(null!);
  const appearance=castAppearance(character.id),feminine=appearance.feminine;
  const features=useMemo(()=>faceFeatures(character.id),[character.id]);
  const rig=useMemo(()=>garmentRig(feminine),[feminine]);
  const garment=useMemo(()=>{
    const material=new MeshStandardMaterial({color:p[character.palette],roughness:.86,bumpMap:surfaces.fabric,bumpScale:.0015});
    const mesh=new SkinnedMesh(garmentGeometry(feminine),material);
    bindRestPose(mesh,rig.skeleton);mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;
    return mesh;
  },[feminine,rig,p,character.palette,surfaces.fabric]);
  useEffect(()=>()=>{garment.geometry.dispose();garment.material.dispose();},[garment]);
  useEffect(()=>()=>rig.skeleton.dispose(),[rig]);
  const trousers=useMemo(()=>[-1,1].map(()=>{
    const rig=trouserRig(),mesh=new SkinnedMesh(trouserGeometry(),new MeshStandardMaterial({color:p.navy,roughness:.9,bumpMap:surfaces.fabric,bumpScale:.001}));
    bindRestPose(mesh,rig.skeleton);mesh.castShadow=true;mesh.frustumCulled=false;return {rig,mesh};
  }),[p.navy,surfaces.fabric]);
  useEffect(()=>()=>trousers.forEach(({rig,mesh})=>{rig.skeleton.dispose();mesh.geometry.dispose();mesh.material.dispose();}),[trousers]);
  const [hover, setHover] = useState(false);
  const rightForearm=useRef<Group>(null!);const leftForearm=useRef<Group>(null!);
  const pupils=useRef<Texture|null>(null);
  const presence=useRef(createPresence(character.id)),posed=useRef(false),lowerLip=useRef<Group>(null!),brows=useRef<(Group|null)[]>([]);
  useEffect(()=>{posed.current=false;presence.current=createPresence(character.id);},[character.id,actor]);
  const gesture = reaction?.gesture ?? 'idle';
  const emotion = reaction?.emotion ?? 'neutral';

  useFrame((_, dt) => {
    const frozen=paused||document.hidden;
    const timing=advancePresence(presence.current,{dt,line,speakerId:world.speakerId,paused:frozen});
    if(frozen&&posed.current)return;
    const eventActive=!!drama.active&&drama.phase!=='settled';
    const pose=presencePose(timing,{index,active,reduced,event:eventActive,playback:true});
    const t=timing.time,instant=reduced||!posed.current;posed.current=true;
    root.current.position.set(actor.x,0,actor.z);root.current.rotation.y+=Math.atan2(Math.sin(actor.heading-root.current.rotation.y),Math.cos(actor.heading-root.current.rotation.y))*(instant?1:1-Math.exp(-10*dt));
    const standAmount=actor.seated?0:1;
    torso.current.position.y=MathUtils.lerp(torso.current.position.y,1.32+standAmount*.4+(actor.moving?0:pose.breath),instant?1:1-Math.exp(-8*dt));
    [legL.current,legR.current].forEach((leg,i)=>{
      leg.position.y=MathUtils.lerp(leg.position.y,actor.seated?1.01:1.41,reduced?1:1-Math.exp(-8*dt));
      leg.rotation.x=MathUtils.lerp(leg.rotation.x,actor.seated?-Math.PI/2:actor.moving&&!reduced?Math.sin(t*8+i*Math.PI)*.3:0,reduced?1:1-Math.exp(-9*dt));
    });
    [shinL.current,shinR.current].forEach(shin=>{shin.rotation.x=MathUtils.lerp(shin.rotation.x,actor.seated?Math.PI/2:0,reduced?1:1-Math.exp(-9*dt));});
    const beat=actorBeat(drama,index,scenario.id),own=playerBeat(drama);
    const toast=player?own.raise:drama.active&&drama.phase!=='settled'?beat.raise:gesture==='toast'?conversationalRaise(timing.elapsed):0;
    const sip=player?0:beat.sip;
    const phoneAmount=player?Math.max(own.phone,drama.inventory==='phone'?.65:0):beat.phone;
    const eventTarget=beat.gaze>=0&&beat.gaze!==index?world.npcs[beat.gaze]:world.player;
    const subject=player?attentionSubject(world):eventTarget;
    const gazeTarget=subject?{x:subject.x,z:subject.z,eye:subject===world.player?playerEyeHeight(subject):eyeHeight(subject)}:{x:actor.x+Math.sin(world.viewYaw)*6,z:actor.z+Math.cos(world.viewYaw)*6,eye:playerEyeHeight(actor)+Math.tan(world.viewPitch)*6};
    const speaker=world.npcs.find(n=>n.id===world.speakerId);
    if(!player&&!actor.moving&&speaker&&speaker!==actor&&pose.speakerAttention>0){
      const amount=pose.speakerAttention;
      gazeTarget.x=MathUtils.lerp(gazeTarget.x,speaker.x,amount);gazeTarget.z=MathUtils.lerp(gazeTarget.z,speaker.z,amount);
      gazeTarget.eye=MathUtils.lerp(gazeTarget.eye,eyeHeight(speaker),amount);
    }
    if(!player&&!actor.moving&&actor.seated&&pose.tableAttention>0){
      const amount=pose.tableAttention;
      gazeTarget.x=MathUtils.lerp(gazeTarget.x,actor.x+Math.sin(actor.heading)*1.25,amount);
      gazeTarget.z=MathUtils.lerp(gazeTarget.z,actor.z+Math.cos(actor.heading)*1.25,amount);
      gazeTarget.eye=MathUtils.lerp(gazeTarget.eye,1.72,amount);
    }
    if(!player&&drama.choice==='calendar'&&index===1)gazeTarget.eye-=.65;
    if(!player&&drama.choice==='group'&&subject!==world.player)gazeTarget.eye-=.25;
    const gaze=gazePose(actor,gazeTarget,root.current.rotation.y);
    const speed = instant ? 1 : 1-Math.exp(-9*Math.min(dt,.05));
    torso.current.rotation.y=MathUtils.lerp(torso.current.rotation.y,gaze.torso,speed);
    torso.current.rotation.x = MathUtils.lerp(torso.current.rotation.x, gesture === 'lean' ? .12 : actor.seated?-.008:0, speed);
    torso.current.rotation.z=MathUtils.lerp(torso.current.rotation.z,actor.moving||toast>.01||phoneAmount>.01?0:appearance.restTilt,speed);
    head.current.rotation.y = MathUtils.lerp(head.current.rotation.y, gaze.head, speed);
    head.current.rotation.x = MathUtils.lerp(head.current.rotation.x,gaze.pitch+(gesture==='nod'&&!actor.moving?pose.nod:emotion==='annoyed'?-.025:0)+pose.emphasis*.012*appearance.energy,speed);
    const residual=wrapAngle(Math.atan2(gazeTarget.x-actor.x,gazeTarget.z-actor.z)-root.current.rotation.y-torso.current.rotation.y-head.current.rotation.y);
    if(pupils.current){
      pupils.current.offset.x=MathUtils.lerp(pupils.current.offset.x,MathUtils.clamp(-residual*.16,-.09,.09),speed);
      pupils.current.offset.y=MathUtils.lerp(pupils.current.offset.y,MathUtils.clamp((gaze.pitch-head.current.rotation.x)*.15,-.04,.04),speed);
    }
    right.current.rotation.x = MathUtils.lerp(right.current.rotation.x, toast>.01 ? -.43-toast*1.35-sip*.2 : phoneAmount>.01?-.43-phoneAmount*1.2: gesture === 'fold' ? -.70 : actor.moving&&!reduced?Math.sin(t*8)*.3:actor.seated?-.22-index*.025:-.055, speed);
    right.current.rotation.z = MathUtils.lerp(right.current.rotation.z, gesture === 'fold' ? -.50 : toast>.01?.23-sip*.30:phoneAmount>.01?-.13:actor.seated?-.055:-.035, speed);
    left.current.rotation.x = MathUtils.lerp(left.current.rotation.x, player&&own.palm>.01?-.4-own.palm*1.4:gesture === 'fold' ? -.78 : actor.moving&&!reduced?-Math.sin(t*8)*.3:actor.seated?-.34+index*.018:-.085, speed);
    left.current.rotation.z = MathUtils.lerp(left.current.rotation.z, gesture === 'fold' ? .52 : player&&own.palm>.01?.13:actor.seated?.045:.035, speed);
    rightForearm.current.rotation.x=MathUtils.lerp(rightForearm.current.rotation.x,toast>.01||phoneAmount>.01?-toast*.25-sip*.3:gesture==='fold'?0:actor.moving?-.12:actor.seated?-.58+index*.035:-.16,speed);
    eyes.current.forEach(eye=>{if(eye)eye.scale.y=pose.blink;});
    rightForearm.current.rotation.z=MathUtils.lerp(rightForearm.current.rotation.z,gesture==='fold'?-1.15:0,speed);
    leftForearm.current.rotation.x=MathUtils.lerp(leftForearm.current.rotation.x,player&&own.palm>.01?-own.palm*.35:gesture==='fold'?0:actor.moving?-.12:actor.seated?-.36-index*.025:-.21,speed);
    leftForearm.current.rotation.z=MathUtils.lerp(leftForearm.current.rotation.z,gesture==='fold'?1.10:0,speed);
    if(glass.current)glass.current.visible=player?(drama.inventory==='glass'||drama.inventory==='tea'):toast>.015;
    phone.current.visible=player?drama.inventory==='phone'&&(drama.choice!=='accept'||drama.elapsed>.45):phoneAmount>.01&&!(drama.choice==='accept'&&drama.elapsed>.45);
    // One wrist pivot owns both the grip and its object. Counter-rotate the whole
    // assembly in quaternion space so the hand never separates from the cuff.
    rightForearm.current.getWorldQuaternion(wristRotation.parent);
    wristRotation.target.setFromEuler(wristRotation.euler.set(sip*.14,root.current.rotation.y+torso.current.rotation.y,0));
    heldProps.current.quaternion.copy(wristRotation.parent).invert().multiply(wristRotation.target);
    mouth.current.scale.y=.0018+pose.speech*.0055*appearance.energy;
    lowerLip.current.position.y=-pose.speech*.004*appearance.energy;
    brows.current.forEach((brow,i)=>{if(brow)brow.position.y=features.brow+pose.emphasis*(i===0?.003:.002);});
    relaxedHand.current.visible=!glass.current?.visible&&!phone.current.visible;
    cupHand.current.visible=!!glass.current?.visible;phoneHand.current.visible=phone.current.visible;
    openHand.current.visible=player&&own.palm>.02;leftRelaxed.current.visible=!openHand.current.visible;
  });
  useEffect(() => { document.body.style.cursor = hover ? 'pointer' : ''; return () => { document.body.style.cursor = ''; }; }, [hover]);
  const skin=p[appearance.skin];
  const sleeve=p[character.palette];
  const wineGlass=scenario.id!=='family'&&(player?drama.inventory==='glass':index===0);
  return <group ref={root} position={[actor.x,0,actor.z]} rotation={[0,actor.heading,0]} onClick={e=>{e.stopPropagation();if(e.delta<5&&!player)onSelect();}} onPointerOver={e=>{e.stopPropagation();setHover(true);}} onPointerOut={()=>setHover(false)}>
    <group scale={[appearance.build[0],1,appearance.build[2]]}>
    {[-1,1].map((side,i)=><group key={side} ref={i===0?legL:legR} position={[side*.185,actor.seated?1.01:1.41,0]} rotation={[actor.seated?-Math.PI/2:0,0,0]}>
      <primitive object={trousers[i].mesh}/>
      <Stroke color={p.clothHighlight} radius={.002} points={[[0,-.06,.171],[0,-.29,.16],[0,-.62,.146]]}/>
      <primitive object={trousers[i].rig.root}>
      <primitive object={trousers[i].rig.shin} ref={i===0?shinL:shinR} rotation={[actor.seated?Math.PI/2:0,0,0]}>
        <Stroke color={p.clothHighlight} radius={.002} points={[[0,-.08,.14],[0,-.3,.122],[0,-.63,.108]]}/>
        <group position={[0,-.68,.06]}>
          <Oval position={[0,-.016,.07]} scale={[.105,.079,.226]} color={p.dark} roughness={.5}/>
          <Oval position={[0,-.063,.075]} scale={[.107,.028,.225]} color={p.woodEdge}/>
          <Stroke color={p.clothHighlight} radius={.002} points={[[-.082,-.011,.173],[0,.025,.193],[.082,-.011,.173]]}/>
          {[0,1,2].map(j=><Stroke key={j} color={p.dark} radius={.003} points={[[-.044,.05-j*.007,.035+j*.026],[.044,.05-j*.007,.035+j*.026]]}/>)}
        </group>
      </primitive>
      </primitive>
    </group>)}
    <group ref={torso} scale={[1,appearance.build[1],1]} position={[0,actor.seated?1.32:1.72,0]}>
      <primitive object={garment}/>
      <Clothing character={character} p={p}/>
      <DinnerFace character={character} p={p} emotion={emotion} head={head} eyes={eyes} pupils={pupils} mouth={mouth} lowerLip={lowerLip} brows={brows}/>
      <primitive object={rig.root}>
      {[-1,1].map((side,i)=><primitive object={i===0?rig.left:rig.right} key={side} ref={i===0?left:right}>
        <primitive object={i===0?rig.leftForearm:rig.rightForearm} ref={i===0?leftForearm:rightForearm}>
          <group position={[0,-.323,.067]}><Form color={character.outfit==='suit'?p.white:sleeve} rings={[[-.041,.077,.077,0],[-.005,.084,.085,0],[.050,.088,.089,0]]}/></group>
          {i===0?<>
            <group ref={leftRelaxed} position={[0,-.354,.077]}><DinnerHand p={p} skin={skin} side={-1}/></group>
            <group ref={openHand} position={[0,-.354,.077]}><DinnerHand p={p} skin={skin} side={-1} pose="open"/></group>
          </>:<>
            <group ref={relaxedHand} position={[0,-.354,.077]}><DinnerHand p={p} skin={skin}/></group>
            <group ref={heldProps} position={[0,-.354,.077]}>
              <group ref={cupHand} rotation={[0,0,Math.PI]}><DinnerHand p={p} skin={skin} pose={wineGlass?'stem':'cup'}/></group>
              <group ref={phoneHand} rotation={[0,0,Math.PI]}><DinnerHand p={p} skin={skin} pose="phone"/></group>
              <group ref={glass} position={wineGlass?[-.025,0,.075]:[-.025,.115,.18]}><Cup palette={p} wine={wineGlass}/></group>
              <group ref={phone} position={[-.095,.18,.087]}><Phone p={p} kind={scenario.id==='school'?'photo':scenario.id==='family'?'intro':'calendar'} lang={lang}/></group>
            </group>
          </>}
        </primitive>
      </primitive>)}
      </primitive>
    </group>
    </group>
  </group>;
}

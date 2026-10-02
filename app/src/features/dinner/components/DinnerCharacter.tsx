import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, MathUtils, Mesh, DoubleSide, type Texture } from 'three';
import type { Character, Lang, Scenario, Emotion } from '../lib/content';
import type { Palette } from '../lib/palette';
import type { Actor, World } from '../lib/room';
import type { Reply } from '../lib/engine';
import { attentionSubject, gazePose, playerEyeHeight, wrapAngle } from '../lib/attention';
import { actorBeat, playerBeat, type Drama } from '../lib/drama';
import { silhouette, skinPigment, faceFeatures, faceGeometry, scalpGeometry, curveGeometry, polygonGeometry, eyeGeometry, type V3, type Ring } from '../lib/avatar';
import type { DinnerSurfaces } from '../lib/surfaces';
import { Cup, Phone } from './DinnerProps';
import { DinnerHand } from './DinnerHand';
import { createPresence, advancePresence, presencePose } from '../lib/presence';

type Props = { character:Character; actor:Actor; world:World; reaction?:Reply['reactions'][number]; active:boolean; onSelect:()=>void; p:Palette; surfaces:DinnerSurfaces; reduced:boolean; drama:Drama; index:number; scenario:Scenario; lang:Lang; line:string; player?:boolean; paused?:boolean };
function Form({rings,color,roughness=.85,weave}:{rings:Ring[];color:string;roughness?:number;weave?:Texture}) {
  const key=JSON.stringify(rings),geometry=useMemo(()=>silhouette(JSON.parse(key)),[key]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial color={color} roughness={roughness} bumpMap={weave} bumpScale={weave?.0025:0}/></mesh>;
}
function Oval({position=[0,0,0],scale,color,rotation=[0,0,0],roughness=.8}:{position?:V3;scale:V3;color:string;rotation?:V3;roughness?:number}) {return <mesh position={position} scale={scale} rotation={rotation} castShadow><sphereGeometry args={[1,20,14]}/><meshStandardMaterial color={color} roughness={roughness}/></mesh>;}
function Stroke({points,color,radius=.004,opacity=1}:{points:V3[];color:string;radius?:number;opacity?:number}) {
  const key=JSON.stringify(points),geometry=useMemo(()=>curveGeometry(JSON.parse(key),radius),[key,radius]);useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry}><meshStandardMaterial color={color} roughness={.86} transparent={opacity<1} opacity={opacity} depthWrite={opacity===1}/></mesh>;
}
function Panel({points,color}:{points:V3[];color:string}) {
  const key=JSON.stringify(points),geometry=useMemo(()=>polygonGeometry(JSON.parse(key)),[key]);useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry} castShadow><meshStandardMaterial color={color} roughness={.9} side={DoubleSide}/></mesh>;
}
function Clothing({character,p,weave}:{character:Character;p:Palette;weave:Texture}) {
  const feminine=character.hair==='bob',suit=character.outfit==='suit',color=p[character.palette],skin=['aunt','mom','dad'].includes(character.id)?p.skinMature:feminine?p.skin:p.skinWarm;
  return <>
    <Form color={skin} rings={[[.73,.083,.077,-.008],[.86,.079,.08,-.008],[.97,.082,.077,-.012]]}/>
    <group scale={[1,1.07,1]}>
    <Form color={color} weave={weave} rings={[[-.35,.305,.205,0],[-.2,.33,.216,0],[0,.34,.222,0],[.23,.365,.24,0],[.44,feminine?.398:.445,.251,0],[.59,feminine?.422:.465,.228,-.005],[.685,.37,.19,-.014],[.755,.18,.135,0]]}/>
    {suit?<>
      <Panel color={p.white} points={[[-.14,.738,.13],[.14,.738,.13],[.176,.58,.222],[.105,.02,.238],[-.105,.02,.238],[-.176,.58,.222]]}/>
      <Panel color={p.wine} points={[[0,.66,.204],[.041,.6,.224],[.028,.52,.258],[.045,.19,.263],[0,.12,.265],[-.045,.19,.263],[-.028,.52,.258],[-.041,.6,.224]]}/>
      {[-1,1].map(side=><group key={side}>
        <Panel color={p.navy} points={[[side*.135,.75,.146],[side*.34,.6,.221],[side*.242,.49,.26],[side*.29,.435,.253],[side*.042,.08,.26],[side*.135,.6,.244]]}/>
        <Stroke color={p.navy} radius={.0024} points={[[side*.133,.744,.15],[side*.338,.599,.226],[side*.24,.49,.265],[side*.287,.435,.258],[side*.04,.08,.265]]}/>
        <Panel color={p.white} points={[[side*.035,.72,.15],[side*.14,.753,.15],[side*.168,.627,.231],[side*.063,.58,.25]]}/>
      </group>)}
      <Stroke color={p.clothHighlight} radius={.003} points={[[-.28,.28,.228],[-.16,.278,.26]]}/>
      <Panel color={p.porcelain} points={[[-.261,.283,.233],[-.248,.315,.232],[-.222,.286,.242],[-.199,.309,.245],[-.18,.281,.252]]}/>
      <Oval position={[.025,.02,.248]} scale={[.014,.014,.009]} color={p.woodEdge}/>
    </>:character.outfit==='shirt'?<>
      <Stroke color={p.clothHighlight} radius={.004} points={[[0,-.29,.212],[0,.19,.248],[0,.58,.232],[0,.71,.16]]}/>
      {[-1,1].map(side=><Panel key={side} color={color} points={[[side*.012,.728,.144],[side*.127,.754,.133],[side*.207,.629,.206],[side*.098,.528,.256],[side*.028,.652,.203]]}/>)}
      {[.51,.35,.19,.03,-.13].map(y=><Oval key={y} position={[.012,y,y>.4?.243:.253]} scale={[.009,.009,.005]} color={p.porcelain}/>)}
      <Stroke color={p.clothHighlight} radius={.0024} points={[[-.29,.41,.201],[-.16,.42,.242],[-.16,.235,.25],[-.22,.21,.239],[-.29,.24,.21],[-.29,.41,.201]]}/>
    </>:<>
      <Panel color={skin} points={[[-.145,.749,.128],[.145,.749,.128],[.12,.64,.211],[0,.587,.244],[-.12,.64,.211]]}/>
      <Stroke color={p.wine} radius={.006} points={[[-.153,.751,.14],[-.13,.644,.216],[0,.58,.25],[.13,.644,.216],[.153,.751,.14]]}/>
      <Stroke color={p.brass} radius={.0025} points={[[-.108,.706,.179],[-.083,.638,.227],[0,.615,.243],[.083,.638,.227],[.108,.706,.179]]}/>
      <Oval position={[0,.608,.25]} scale={[.013,.02,.007]} color={p.brass}/>
      {[-1,1].map(side=><Stroke key={side} color={p.clothHighlight} radius={.002} points={[[side*.22,-.25,.166],[side*.18,.12,.219],[side*.25,.4,.2]]}/>)}
    </>}
    <Stroke color={p.clothHighlight} radius={.002} points={[[-.3,-.28,.111],[0,-.289,.213],[.3,-.28,.111]]}/>
    </group>
  </>;
}
function Face({character,p,emotion,eyes,pupils,mouth,lowerLip,brows}:{character:Character;p:Palette;emotion:Emotion;eyes:React.RefObject<(Group|null)[]>;pupils:React.RefObject<(Group|null)[]>;mouth:React.RefObject<Mesh>;lowerLip:React.RefObject<Group>;brows:React.RefObject<(Group|null)[]>}) {
  const mature=['chen','aunt','mom','dad'].includes(character.id),feminine=character.hair==='bob',older=['aunt','mom','dad'].includes(character.id);
  const skin=older?p.skinMature:feminine?p.skin:p.skinWarm;
  const geometry=useMemo(()=>skinPigment(faceGeometry(mature,feminine,character.id),skin,p.skinShadow,p.lip),[mature,feminine,character.id,skin,p.skinShadow,p.lip]);
  const scalp=useMemo(()=>scalpGeometry(feminine,character.hair==='swept',mature,character.id),[feminine,character.hair,mature,character.id]);
  const eye=useMemo(()=>eyeGeometry(.049,older?.011:.014),[older]);
  useEffect(()=>()=>{geometry.dispose();scalp.dispose();eye.dispose();},[geometry,scalp,eye]);
  const hair=character.id==='dad'?p.hairGray:p.hair,feature=faceFeatures(character.id);
  return <>
    <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.92}/></mesh>
    {[-1,1].map(side=><group key={side} position={[side*(feminine?(character.id==='aunt'?.276:.254):.273),-.045,-.004]} rotation={[0,side*.2,side*-.09]}>
      <Oval scale={[.046,.089,.048]} color={skin}/>
      <Oval position={[side*.011,.002,.037]} scale={[.023,.055,.016]} color={p.skinShadow}/>
      <Stroke color={skin} radius={.010} points={[[side*.015,-.049,.043],[side*.031,-.016,.043],[side*.027,.043,.038],[side*.009,.062,.032]]}/>
      {feminine&&<Oval position={[side*.011,-.07,.04]} scale={[.014,.018,.008]} color={p.brass}/>}
    </group>)}
    {/* Flattened bridge, nasal wings and columella replace the toy button nose. */}
    <group scale={[feature.nose,1,1]}><Form color={skin} rings={[[-.145,.022,.017,.249],[-.125,.048,.03,.264],[-.097,.038,.047,.267],[-.067,.027,.042,.255],[-.017,.022,.027,.235],[.047,.017,.014,.221],[.081,.011,.006,.22]]}/>
    {[-1,1].map(side=><group key={side}>
      <Oval position={[side*.036,-.118,.268]} scale={[.022,.019,.022]} color={skin}/>
      <Oval position={[side*.028,-.132,.281]} scale={[.011,.004,.007]} color={p.skinShadow}/>
    </group>)}
    </group>
    {[-1,1].map((side,i)=>{
      const x=side*feature.eye,browAngle=emotion==='annoyed'?side*.12:emotion==='pressing'?side*.06:emotion==='thinking'?side*-.05:0;
      return <group key={side} position={[x,.012,.216]} rotation={[0,side*.08,0]}>
        <group ref={el=>{eyes.current[i]=el;}}>
          <mesh geometry={eye}><meshStandardMaterial color={p.sclera} roughness={.65}/></mesh>
          <group ref={el=>{pupils.current[i]=el;}}>
            <mesh position={[0,0,.012]}><circleGeometry args={[older?.014:.016,24]}/><meshStandardMaterial color={p.iris} roughness={.4}/></mesh>
            <mesh position={[0,0,.0125]}><circleGeometry args={[.008,20]}/><meshStandardMaterial color={p.dark} roughness={.3}/></mesh>
            <mesh position={[-.0035,.005,.013]}><circleGeometry args={[.0015,8]}/><meshBasicMaterial color={p.porcelain}/></mesh>
          </group>
        </group>
        <Stroke color={p.skinShadow} radius={.0024} opacity={.72} points={[[-.053,-.001,-.006],[-.032,.013,.004],[0,.019,.008],[.034,.012,.003],[.052,-.003,-.006]]}/>
        <Stroke color={skin} radius={.0048} points={[[-.054,-.002,-.006],[-.024,-.014,.007],[.016,-.015,.009],[.052,-.003,-.006]]}/>
        <Stroke color={p.skinShadow} radius={older?.0017:.0011} opacity={.4} points={[[-.049,.025,-.006],[-.008,.033,.003],[.039,.026,-.003]]}/>
        <group ref={el=>{brows.current[i]=el;}} position={[0,feature.brow,0]} rotation={[0,0,browAngle]}><Stroke color={hair} radius={feminine?.004:.0055} points={[[-.052,.06,-.003],[-.02,.068,.006],[.019,.066,.007],[.049,.054,-.004]]}/></group>
        {older&&<Stroke color={p.skinShadow} radius={.0011} opacity={.3} points={[[side*.052,-.009,-.005],[side*.066,-.017,-.013],[side*.074,-.022,-.017]]}/>}
        {character.glasses&&<>
          <Stroke color={p.brass} radius={.004} points={[[-.063,.027,.028],[-.021,.036,.038],[.051,.025,.029],[.06,-.017,.024],[.029,-.032,.032],[-.035,-.03,.032],[-.063,.001,.024],[-.063,.027,.028]]}/>
          <Stroke color={p.brass} radius={.004} points={[[side*.061,.015,.025],[side*.157,.004,-.139]]}/>
        </>}
      </group>;
    })}
    {character.glasses&&<Stroke color={p.brass} radius={.004} points={[[-.043,.035,.249],[0,.042,.263],[.043,.035,.249]]}/>}
    {older&&[-1,1].map(side=><Stroke key={side} color={p.skinShadow} radius={.0011} opacity={.22} points={[[side*.055,-.14,.242],[side*.076,-.173,.222],[side*.077,-.203,.213]]}/>)}
    <Stroke color={p.skinShadow} radius={.0012} opacity={.35} points={[[-.009,-.15,.253],[0,-.169,.245],[.009,-.15,.253]]}/>
    <group scale={[feature.mouth,1,1]}><mesh ref={mouth} position={[0,-.206,.218]} scale={[.056,.003,.006]}><sphereGeometry args={[1,20,8]}/><meshStandardMaterial color={p.dark} roughness={1}/></mesh>
    <Stroke color={p.lip} radius={feminine?.0034:.0028} opacity={.6} points={[[-.057,-.203,.214],[-.021,-.198,.231],[0,-.201,.234],[.021,-.198,.231],[.057,-.203,.214]]}/>
    <group ref={lowerLip}><Stroke color={p.lip} radius={feminine?.004:.0032} opacity={.55} points={[[-.05,-.21,.218],[0,-.218,.237],[.05,-.21,.218]]}/></group></group>
    <mesh geometry={scalp} castShadow><meshStandardMaterial color={hair} roughness={.89} side={DoubleSide}/></mesh>
    {/* Low relief comb marks stay on the scalp and share its pigment. */}
    {Array.from({length:6},(_,i)=>{
      const az=(i-2.5)*.24;
      const points=[.88,.74,.6,.44,.23,.055].map(theta=>{
        const a=az+theta*.15,wave=character.hair==='swept'?Math.sin(a+.7)*Math.sin(theta)*.018:0;
        return [Math.sin(a)*Math.sin(theta)*(character.id==='aunt'?.319:.306),Math.cos(theta)*.426+.012+wave,Math.cos(a)*Math.sin(theta)*.283-.018] as V3;
      });
      return <Stroke key={i} radius={.0017} color={hair} points={points}/>;
    })}
    {feminine&&[-1,1].map(side=><group key={side} position={[side*(character.id==='aunt'?.27:.254),character.id==='aunt'?.08:-.015,-.054]} rotation={[0,side*-.16,side*-.035]}>
      <Form color={hair} rings={[[-.342,.037,.067,0],[-.28,.049,.102,0],[-.15,.048,.13,0],[.015,.043,.16,0],[.14,.039,.162,0]].map(([y,w,d,z])=>[y,w,d,z] as Ring)}/>
    </group>)}
  </>;
}

export function DinnerCharacter({ character, actor, world, reaction, active, onSelect, p, surfaces, reduced, drama, index, scenario, lang, line, player=false, paused=false }:Props) {
  const root=useRef<Group>(null!),legL=useRef<Group>(null!),legR=useRef<Group>(null!),shinL=useRef<Group>(null!),shinR=useRef<Group>(null!);
  const torso=useRef<Group>(null!),head=useRef<Group>(null!),right=useRef<Group>(null!),left=useRef<Group>(null!),mouth=useRef<Mesh>(null!),glass=useRef<Group>(null!),phone=useRef<Group>(null!);
  const eyes=useRef<(Group|null)[]>([]),relaxedHand=useRef<Group>(null!),cupHand=useRef<Group>(null!),phoneHand=useRef<Group>(null!),openHand=useRef<Group>(null!),leftRelaxed=useRef<Group>(null!);
  const [hover, setHover] = useState(false);
  const rightForearm=useRef<Group>(null!);const leftForearm=useRef<Group>(null!);
  const pupils=useRef<(Group|null)[]>([]);
  const presence=useRef(createPresence()),posed=useRef(false),lowerLip=useRef<Group>(null!),brows=useRef<(Group|null)[]>([]);
  useEffect(()=>{posed.current=false;},[character.id]);
  const gesture = reaction?.gesture ?? 'idle';
  const emotion = reaction?.emotion ?? 'neutral';

  useFrame((_, dt) => {
    const frozen=paused||document.hidden;
    const timing=advancePresence(presence.current,{dt,line,speakerId:world.speakerId,paused:frozen});
    if(frozen&&posed.current)return;
    const eventActive=!!drama.active&&drama.phase!=='settled';
    const pose=presencePose(timing,{index,active,reduced,event:eventActive});
    const t=timing.time,instant=reduced||!posed.current;posed.current=true;
    root.current.position.set(actor.x,0,actor.z);root.current.rotation.y+=Math.atan2(Math.sin(actor.heading-root.current.rotation.y),Math.cos(actor.heading-root.current.rotation.y))*(reduced?1:1-Math.exp(-10*dt));
    const standAmount=actor.seated?0:1;
    torso.current.position.y=MathUtils.lerp(torso.current.position.y,1.32+standAmount*.4+(actor.moving?0:pose.breath),instant?1:1-Math.exp(-8*dt));
    [legL.current,legR.current].forEach((leg,i)=>{
      leg.position.y=MathUtils.lerp(leg.position.y,actor.seated?1.01:1.41,reduced?1:1-Math.exp(-8*dt));
      leg.rotation.x=MathUtils.lerp(leg.rotation.x,actor.seated?-Math.PI/2:actor.moving&&!reduced?Math.sin(t*8+i*Math.PI)*.3:0,reduced?1:1-Math.exp(-9*dt));
    });
    [shinL.current,shinR.current].forEach(shin=>{shin.rotation.x=MathUtils.lerp(shin.rotation.x,actor.seated?Math.PI/2:0,reduced?1:1-Math.exp(-9*dt));});
    const beat=actorBeat(drama,index,scenario.id),own=playerBeat(drama);
    const toast=player?own.raise:drama.active&&drama.phase!=='settled'?beat.raise:gesture==='toast'?1:0;
    const sip=player?0:beat.sip;
    const phoneAmount=player?Math.max(own.phone,drama.inventory==='phone'?.65:0):beat.phone;
    const eventTarget=beat.gaze>=0&&beat.gaze!==index?world.npcs[beat.gaze]:world.player;
    const subject=player?attentionSubject(world):eventTarget;
    const gazeTarget=subject?{x:subject.x,z:subject.z,eye:subject===world.player?playerEyeHeight(subject):subject.seated?2.48:2.88}:{x:actor.x+Math.sin(world.viewYaw)*6,z:actor.z+Math.cos(world.viewYaw)*6,eye:playerEyeHeight(actor)+Math.tan(world.viewPitch)*6};
    const speaker=world.npcs.find(n=>n.id===world.speakerId);
    if(!player&&!actor.moving&&speaker&&speaker!==actor&&pose.speakerAttention>0){
      const amount=pose.speakerAttention;
      gazeTarget.x=MathUtils.lerp(gazeTarget.x,speaker.x,amount);gazeTarget.z=MathUtils.lerp(gazeTarget.z,speaker.z,amount);
      gazeTarget.eye=MathUtils.lerp(gazeTarget.eye,speaker.seated?2.48:2.88,amount);
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
    torso.current.rotation.z=MathUtils.lerp(torso.current.rotation.z,actor.moving||toast>.01||phoneAmount>.01?0:index===1?-.012:index===2?.009:0,speed);
    head.current.rotation.y = MathUtils.lerp(head.current.rotation.y, gaze.head, speed);
    head.current.rotation.x = MathUtils.lerp(head.current.rotation.x,gaze.pitch+(gesture==='nod'&&!reduced?Math.sin(Math.min(1,timing.elapsed/1.4)*Math.PI)*.035:emotion==='annoyed'?-.025:0)+pose.emphasis*.012,speed);
    const residual=wrapAngle(Math.atan2(gazeTarget.x-actor.x,gazeTarget.z-actor.z)-root.current.rotation.y-torso.current.rotation.y-head.current.rotation.y);
    pupils.current.forEach(pupil=>{if(pupil){pupil.position.x=MathUtils.lerp(pupil.position.x,MathUtils.clamp(residual*.02,-.015,.015),speed);pupil.position.y=MathUtils.lerp(pupil.position.y,MathUtils.clamp((gaze.pitch-head.current.rotation.x)*-.025,-.009,.009),speed);}});
    right.current.rotation.x = MathUtils.lerp(right.current.rotation.x, toast>.01 ? -.43-toast*1.35-sip*.2 : phoneAmount>.01?-.43-phoneAmount*1.2: gesture === 'fold' ? -.62 : actor.moving&&!reduced?Math.sin(t*8)*.3:actor.seated?-.22-index*.025:-.055, speed);
    right.current.rotation.z = MathUtils.lerp(right.current.rotation.z, gesture === 'fold' ? -.95 : toast>.01?.23-sip*.30:phoneAmount>.01?-.13:actor.seated?-.055:-.035, speed);
    left.current.rotation.x = MathUtils.lerp(left.current.rotation.x, player&&own.palm>.01?-.4-own.palm*1.4:gesture === 'fold' ? -.7 : actor.moving&&!reduced?-Math.sin(t*8)*.3:actor.seated?-.34+index*.018:-.085, speed);
    left.current.rotation.z = MathUtils.lerp(left.current.rotation.z, gesture === 'fold' ? .94 : player&&own.palm>.01?.13:actor.seated?.045:.035, speed);
    rightForearm.current.rotation.x=MathUtils.lerp(rightForearm.current.rotation.x,toast>.01||phoneAmount>.01?-toast*.25-sip*.3:gesture==='fold'?0:actor.moving?-.12:actor.seated?-.58+index*.035:-.16,speed);
    eyes.current.forEach(eye=>{if(eye)eye.scale.y=pose.blink;});
    rightForearm.current.rotation.z=MathUtils.lerp(rightForearm.current.rotation.z,gesture==='fold'?-1.8:0,speed);
    leftForearm.current.rotation.x=MathUtils.lerp(leftForearm.current.rotation.x,player&&own.palm>.01?-own.palm*.35:gesture==='fold'?0:actor.moving?-.12:actor.seated?-.36-index*.025:-.21,speed);
    leftForearm.current.rotation.z=MathUtils.lerp(leftForearm.current.rotation.z,gesture==='fold'?1.8:0,speed);
    if(glass.current){glass.current.visible=player?(drama.inventory==='glass'||drama.inventory==='tea'):toast>.015;glass.current.rotation.x=-right.current.rotation.x-rightForearm.current.rotation.x-torso.current.rotation.x+sip*.3;glass.current.rotation.z=-right.current.rotation.z-rightForearm.current.rotation.z;}
    phone.current.visible=player?drama.inventory==='phone'&&(drama.choice!=='accept'||drama.elapsed>.45):phoneAmount>.01&&!(drama.choice==='accept'&&drama.elapsed>.45);phone.current.rotation.x=-right.current.rotation.x-rightForearm.current.rotation.x-torso.current.rotation.x;
    mouth.current.scale.y=.0025+pose.speech*.009;
    lowerLip.current.position.y=-pose.speech*.006;
    brows.current.forEach((brow,i)=>{if(brow)brow.position.y=faceFeatures(character.id).brow+pose.emphasis*(i===0?.003:.002);});
    relaxedHand.current.visible=!glass.current?.visible&&!phone.current.visible;
    cupHand.current.visible=!!glass.current?.visible;phoneHand.current.visible=phone.current.visible;
    openHand.current.visible=player&&own.palm>.02;leftRelaxed.current.visible=!openHand.current.visible;
  });
  useEffect(() => { document.body.style.cursor = hover ? 'pointer' : ''; return () => { document.body.style.cursor = ''; }; }, [hover]);
  const skin=['aunt','mom','dad'].includes(character.id)?p.skinMature:character.hair==='bob'?p.skin:p.skinWarm;
  const sleeve=p[character.palette];
  const wineGlass=scenario.id!=='family'&&(player?drama.inventory==='glass':index===0);
  return <group ref={root} position={[actor.x,0,actor.z]} rotation={[0,actor.heading,0]} onClick={e=>{e.stopPropagation();if(e.delta<5&&!player)onSelect();}} onPointerOver={e=>{e.stopPropagation();setHover(true);}} onPointerOut={()=>setHover(false)}>
    {[-1,1].map((side,i)=><group key={side} ref={i===0?legL:legR} position={[side*.185,actor.seated?1.01:1.41,0]} rotation={[actor.seated?-Math.PI/2:0,0,0]}>
      <Form color={p.navy} rings={[[-.66,.109,.13,.015],[-.5,.116,.137,.011],[-.26,.143,.158,0],[-.06,.157,.169,0],[.045,.151,.156,0]]}/>
      <Stroke color={p.clothHighlight} radius={.002} points={[[0,-.06,.171],[0,-.29,.16],[0,-.62,.146]]}/>
      <group ref={i===0?shinL:shinR} position={[0,-.62,.01]} rotation={[actor.seated?Math.PI/2:0,0,0]}>
        <Form color={p.navy} rings={[[-.68,.088,.101,.009],[-.53,.094,.109,0],[-.32,.107,.118,0],[-.09,.112,.135,.005],[.045,.109,.13,0]]}/>
        <Stroke color={p.clothHighlight} radius={.002} points={[[0,-.08,.14],[0,-.3,.122],[0,-.63,.108]]}/>
        <group position={[0,-.68,.06]}>
          <Oval position={[0,-.016,.07]} scale={[.105,.079,.226]} color={p.dark} roughness={.5}/>
          <Oval position={[0,-.063,.075]} scale={[.107,.028,.225]} color={p.woodEdge}/>
          <Stroke color={p.clothHighlight} radius={.002} points={[[-.082,-.011,.173],[0,.025,.193],[.082,-.011,.173]]}/>
          {[0,1,2].map(j=><Stroke key={j} color={p.dark} radius={.003} points={[[-.044,.05-j*.007,.035+j*.026],[.044,.05-j*.007,.035+j*.026]]}/>)}
        </group>
      </group>
    </group>)}
    <group ref={torso} position={[0,actor.seated?1.32:1.72,0]}>
      <Clothing character={character} p={p} weave={surfaces.fabric}/>
      <group ref={head} position={[0,1.15,.01]} scale={.65}>
        <Face character={character} p={p} emotion={emotion} eyes={eyes} pupils={pupils} mouth={mouth} lowerLip={lowerLip} brows={brows}/>
      </group>
      {[-1,1].map((side,i)=><group key={side} ref={i===0?left:right} position={[side*(character.hair==='bob'?.415:.458),.58,.008]}>
        <Form color={sleeve} weave={surfaces.fabric} rings={[[-.51,.096,.105,.02],[-.4,.108,.115,0],[-.22,.135,.138,-.006],[-.065,.145,.143,0],[.058,.091,.115,0]]}/>
        <Stroke color={p.clothHighlight} radius={.002} points={[[side*.137,-.075,0],[side*.134,-.21,0],[side*.105,-.4,.02]]}/>
        <group ref={i===0?leftForearm:rightForearm} position={[0,-.49,.023]}>
          <Form color={sleeve} weave={surfaces.fabric} rings={[[-.325,.071,.075,.07],[-.26,.081,.084,.057],[-.13,.098,.103,.028],[.027,.096,.105,0]]}/>
          <group position={[0,-.323,.067]}><Form color={character.outfit==='suit'?p.white:sleeve} rings={[[-.035,.068,.068,0],[.018,.072,.073,0]]}/></group>
          {i===0?<>
            <group ref={leftRelaxed} position={[0,-.354,.077]}><DinnerHand p={p} skin={skin} side={-1}/></group>
            <group ref={openHand} position={[0,-.354,.077]}><DinnerHand p={p} skin={skin} side={-1} pose="open"/></group>
          </>:<>
            <group ref={relaxedHand} position={[0,-.354,.077]}><DinnerHand p={p} skin={skin}/></group>
            {!wineGlass&&<group ref={cupHand} position={[.044,-.323,.077]} rotation={[0,-.27,-.15]}><DinnerHand p={p} skin={skin} pose="cup"/></group>}
            <group ref={phoneHand} position={[.045,-.323,.074]}><DinnerHand p={p} skin={skin} pose="phone"/></group>
            <group ref={glass} position={[0,-.41,wineGlass?.08:.17]}><Cup palette={p} wine={wineGlass}/>{wineGlass&&<group ref={cupHand} position={[.045,-.025,-.08]} rotation={[0,0,Math.PI]}><DinnerHand p={p} skin={skin} pose="stem"/></group>}</group>
            <group ref={phone} position={[0,-.34,.16]}><Phone p={p} kind={scenario.id==='school'?'photo':scenario.id==='family'?'intro':'calendar'} lang={lang}/></group>
          </>}
        </group>
      </group>)}
    </group>
  </group>;
}

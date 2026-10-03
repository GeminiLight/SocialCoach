import {useEffect,useMemo,useRef} from 'react';
import {useFrame,type ThreeEvent} from '@react-three/fiber';
import {RoundedBox} from '@react-three/drei';
import {CanvasTexture,SRGBColorSpace,type Group} from 'three';
import {l,pick,type L,type Lang,type Scenario} from '../lib/content';
import type {Palette} from '../lib/palette';
import {walkPlayer,operateLift,type World} from '../lib/room';
import {LIFT_GATE_Z} from '../lib/spaces';

function Box({at,size,color,metal=0,round=0,children}:{at:[number,number,number];size:[number,number,number];color:string;metal?:number;round?:number;children?:React.ReactNode}){
 const material=<meshStandardMaterial color={color} metalness={metal} roughness={metal?.36:.78}/>;
 return <group position={at}>{round?<RoundedBox args={size} radius={round} smoothness={2} castShadow receiveShadow>{material}</RoundedBox>:<mesh castShadow receiveShadow><boxGeometry args={size}/>{material}</mesh>}{children}</group>;
}
export function Sign({at,size,lines,p,lang,dark=false,name}:{at:[number,number,number];size:[number,number];lines:L[];p:Palette;lang:Lang;dark?:boolean;name?:string}){
 const words=lines.map(line=>pick(line,lang)).join('\n'),aspect=size[0]/size[1];
 const texture=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=Math.round(768/aspect);
  const c=canvas.getContext('2d')!;c.fillStyle=dark?p.screen:p.white;c.fillRect(0,0,canvas.width,canvas.height);
  c.fillStyle=dark?p.white:p.charcoal;const text=words.split('\n');c.textAlign=text.length===1?'center':'left';
  const font=Math.min(58,canvas.height/(text.length*2.7));
  text.forEach((line,i)=>{c.font=`${i===0?'600':'400'} ${i===0?font:font*.66}px sans-serif`;c.fillText(line,text.length===1?384:48,text.length===1?canvas.height/2+font*.32:Math.min(82,canvas.height*.2)+i*Math.max(75,canvas.height*.13),680);});
  const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;return map;
 },[words,aspect,dark,p]);
 useEffect(()=>()=>texture.dispose(),[texture]);
 return <mesh name={name} position={at}><planeGeometry args={size}/><meshBasicMaterial map={texture} toneMapped={false}/></mesh>;
}
function Floor({p,world,paused}:{p:Palette;world:World;paused:boolean}){
 return <group><mesh rotation={[-Math.PI/2,0,0]} position={[0,-.025,.6]} receiveShadow onClick={e=>{if(!paused){e.stopPropagation();walkPlayer(world,{x:e.point.x,z:e.point.z});}}}><planeGeometry args={[12.5,13]}/><meshStandardMaterial color={p.officeFloor} roughness={.82}/></mesh>{Array.from({length:11},(_,i)=><Box key={i} at={[i-5,.001,.6]} size={[.009,.003,12.5]} color={p.floorJoint}/>)}{Array.from({length:11},(_,i)=><Box key={i} at={[0,.001,i-4.5]} size={[12.3,.003,.009]} color={p.floorJoint}/>)}</group>;
}
function Ceiling({p}:{p:Palette}){return <group>{[-3.8,0,3.8].map(x=><group key={x}><Box at={[x,5.3,0]} size={[1.8,.08,5.3]} color={p.white}/><mesh position={[x,5.245,0]} rotation={[Math.PI/2,0,0]}><planeGeometry args={[1.65,5.1]}/><meshStandardMaterial color={p.white} emissive={p.white} emissiveIntensity={.7}/></mesh></group>)}</group>;}
function LiftDoors({p,world}:{p:Palette;world:World}){
 const left=useRef<Group>(null!),right=useRef<Group>(null!);
 useFrame(()=>{const open=world.lift?.openness??1;left.current.position.x=-.875-open*1.72;right.current.position.x=.875+open*1.72;});
 return <group position={[0,0,LIFT_GATE_Z]}>{[-1,1].map(side=><group ref={side===-1?left:right} key={side} position={[side*2.595,0,0]}><Box at={[0,2.15,.08]} size={[1.74,4.3,.12]} color={p.steel} metal={.28}/>{Array.from({length:12},(_,i)=><Box key={i} at={[0,.4+i*.3,.148]} size={[1.7,.012,.008]} color={p.steelSeam} metal={.5}/>)}</group>)}</group>;
}
export function ElevatorEnvironment({p,world,lang,paused}:{p:Palette;world:World;lang:Lang;paused:boolean}){
 const press=(e:ThreeEvent<MouseEvent>,target:'open'|'closed')=>{e.stopPropagation();if(!paused)operateLift(world,target);};
 return <group><Floor p={p} world={world} paused={paused}/><Ceiling p={p}/>
  <Box at={[0,2.45,-4.8]} size={[4.2,4.9,.18]} color={p.steel} metal={.25}/><Box at={[0,.005,-3.5]} size={[3.5,.02,2.4]} color={p.floorJoint}/>
  {[-1,1].map(side=><group key={side}><Box at={[side*2.1,2.4,-3.55]} size={[.2,4.8,2.5]} color={p.steel} metal={.24}/><Box at={[side*4,2.6,LIFT_GATE_Z-.04]} size={[4.5,5.2,.2]} color={p.officeWall}/><Box at={[side*1.82,2.2,LIFT_GATE_Z+.13]} size={[.14,4.4,.24]} color={p.steelSeam} metal={.7}/><Box at={[side*5.98,2.65,.5]} size={[.14,5.3,10.3]} color={p.officeWall}/><Box at={[side*1.96,1.65,-3.5]} size={[.08,.08,1.95]} color={p.steelSeam} metal={.8}/></group>)}
  <Box at={[0,4.45,LIFT_GATE_Z+.05]} size={[3.75,.27,.2]} color={p.steelSeam} metal={.25}/><Box at={[0,1.65,-4.57]} size={[3.45,.08,.09]} color={p.steelSeam} metal={.8}/><LiftDoors p={p} world={world}/>
  <Sign at={[0,4.7,LIFT_GATE_Z+.18]} size={[1.4,.5]} lines={[l('12 F · 停层','12 F · STOPPED')]} p={p} lang={lang} dark/>
  <Sign at={[-3.75,3.5,LIFT_GATE_Z+.13]} size={[2.1,1.05]} lines={[l('12   项目组','12   PROJECT TEAM'),l('会议室  ←','MEETING ROOMS  ←'),l('等候区 · HR  →','LOBBY · HR  →')]} p={p} lang={lang}/>
  <Box at={[2.5,2.1,LIFT_GATE_Z+.2]} size={[.46,.95,.1]} color={p.steel} metal={.7}/>
  {(['open','closed'] as const).map((target,i)=><group key={target} position={[2.5,2.32-i*.42,LIFT_GATE_Z+.29]} onClick={e=>press(e,target)}><mesh rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.115,.115,.035,24]}/><meshStandardMaterial color={p.marker} emissive={p.marker} emissiveIntensity={.18}/></mesh><Sign at={[0,.0,.027]} size={[.2,.19]} lines={[target==='open'?l('◀ ▶','◀ ▶'):l('▶ ◀','▶ ◀')]} p={p} lang={lang}/></group>)}
  <Box at={[-4.8,.82,3.6]} size={[1.4,.16,.65]} color={p.wood} round={.05}/>{[-5.3,-4.3].map(x=><Box key={x} at={[x,.4,3.6]} size={[.08,.8,.5]} color={p.steelSeam} metal={.7}/>)}
  <group position={[1.94,0,-3.5]} rotation={[0,-Math.PI/2,0]}><Box at={[0,2.1,0]} size={[.46,.95,.08]} color={p.steelSeam} metal={.4}/>{(['open','closed'] as const).map((target,i)=><group key={target} position={[0,2.32-i*.42,.07]} onClick={e=>press(e,target)}><mesh rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.11,.11,.035,24]}/><meshStandardMaterial color={p.marker}/></mesh><Sign at={[0,0,.026]} size={[.18,.18]} lines={[target==='open'?l('◀ ▶','◀ ▶'):l('▶ ◀','▶ ◀')]} p={p} lang={lang}/></group>)}</group>
  <Box at={[0,.015,LIFT_GATE_Z+.15]} size={[3.7,.02,.18]} color={p.steelSeam} metal={.65}/><pointLight position={[0,4.1,-3.3]} color={p.white} intensity={6} distance={6}/>
 </group>;
}
function OfficeChair({p,x,z,heading}:{p:Palette;x:number;z:number;heading:number}){return <group position={[x,0,z]} rotation={[0,heading,0]}>
 <Box at={[0,.93,0]} size={[.92,.16,.83]} color={p.charcoal} round={.06}/><Box at={[0,1.46,-.36]} size={[.91,.94,.13]} color={p.charcoal} round={.07}/><Box at={[0,.47,0]} size={[.09,.85,.09]} color={p.steel} metal={.7}/>
 {[-1,1].map(side=><group key={side}><Box at={[side*.53,1.08,0]} size={[.07,.48,.08]} color={p.steelSeam}/><Box at={[side*.53,1.31,.03]} size={[.12,.07,.63]} color={p.charcoal} round={.025}/></group>)}
 {Array.from({length:5},(_,i)=><group key={i} rotation={[0,i*Math.PI*2/5,0]}><Box at={[0,.14,.28]} size={[.09,.07,.59]} color={p.steel} metal={.25}/><mesh position={[0,.1,.54]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.10,.10,.09,12]}/><meshStandardMaterial color={p.charcoal}/></mesh></group>)}
 </group>;}
function Desk({p,x,z,lang,onEvidence,meeting}:{p:Palette;x:number;z:number;lang:Lang;onEvidence:()=>void;meeting:boolean}){return <group position={[x,0,z]} onClick={e=>e.stopPropagation()}>
 <Box at={[0,1.69,0]} size={[2.8,.13,1.2]} color={p.oat} round={.035}/>{[-1.25,1.25].map(x=><group key={x}><Box at={[x,.84,0]} size={[.07,1.68,.9]} color={p.steelSeam}/><Box at={[x,.05,0]} size={[.35,.08,1.0]} color={p.steelSeam}/></group>)}
 <Box at={[.2,1.79,-.08]} size={[1.05,.07,.7]} color={p.steel} metal={.48}/><Box at={[.2,2.16,-.39]} size={[1.1,.75,.075]} color={p.charcoal} round={.025}/><Sign at={[.2,2.16,-.348]} size={[.98,.62]} lines={meeting?[l('方案短会 · 待决定','PROPOSAL · UNDECIDED'),l('关键点 / 数据 / 风险','POINT / DATA / RISK'),l('议程：听完后再讨论','AGENDA: HEAR & DISCUSS')]:[l('项目材料 · 待确认','PROJECT · UNCONFIRMED'),l('数据 / 排版 / 检查','DATA / LAYOUT / CHECK'),l('来源与分工另行核对','Check sources and owners')]} p={p} lang={lang} dark/>
 <Box at={[-.87,1.78,.18]} size={[.6,.035,.5]} color={p.white}><mesh rotation={[-Math.PI/2,0,0]} position={[0,.023,0]} onClick={e=>{e.stopPropagation();onEvidence();}}><planeGeometry args={[.58,.48]}/><meshStandardMaterial color={p.white}/></mesh></Box>
 {Array.from({length:5},(_,i)=><Box key={i} at={[-.88,1.81,.07+i*.04]} size={[.43,.007,.006]} color={i===0?p.marker:p.floorJoint}/>)}<Box at={[-.42,1.77,.34]} size={[.22,.025,.025]} color={p.marker}/><Box at={[.89,1.77,.33]} size={[.2,.025,.31]} color={p.charcoal} round={.025}/>
 </group>;}
export function OfficeEnvironment({p,world,lang,paused,scenario,onEvidence}:{p:Palette;world:World;lang:Lang;paused:boolean;scenario:Scenario;onEvidence:()=>void}){
 return <group><Floor p={p} world={world} paused={paused}/><Ceiling p={p}/><Box at={[0,2.65,-4.8]} size={[12.3,5.3,.15]} color={p.officeWall}/><Box at={[-6.1,2.65,.5]} size={[.15,5.3,10.4]} color={p.officeWall}/>
  <Box at={[-2.5,3.0,-4.68]} size={[4.8,3.25,.08]} color={p.window}/>{[-4.85,-2.5,-.15].map(x=><Box key={x} at={[x,3,-4.59]} size={[.075,3.35,.10]} color={p.steelSeam}/>)}
  {Array.from({length:10},(_,i)=><Box key={i} at={[-4.55+i*.46,1.6+(i%3)*.15,-4.62]} size={[.3,.4+(i%4)*.26,.03]} color={i%2?p.steel:p.floorJoint}/>)}{Array.from({length:13},(_,i)=><Box key={i} at={[-2.5,4.45-i*.21,-4.53]} size={[4.7,.018,.04]} color={p.white}/>)}
  <Sign at={[3.3,4.35,-4.69]} size={[2.45,.78]} lines={[l('项目组 · 工作区','PROJECT TEAM'),l('讨论区 02 · 工位 07','MEETING 02 · DESK 07')]} p={p} lang={lang}/>
  <Box at={[4.85,2.65,-3.83]} size={[1.6,2.5,.11]} color={p.steel} metal={.45}/><Sign at={[4.85,2.65,-3.765]} size={[1.47,2.32]} lines={[l('待确认','TO CONFIRM'),l('范围 · 负责人','SCOPE · OWNER'),l('核对 · 下一步','CHECK · NEXT STEP')]} p={p} lang={lang}/><Box at={[4.85,1.35,-3.63]} size={[1.65,.07,.22]} color={p.steelSeam}/>
  <Desk p={p} x={0} z={2.05} lang={lang} meeting={scenario.time==='14:20'} onEvidence={()=>{if(!paused)onEvidence();}}/><group rotation={[0,Math.PI,0]} position={[-3.7,0,.2]}><Desk p={p} x={0} z={0} lang={lang} meeting={scenario.time==='14:20'} onEvidence={()=>{if(!paused)onEvidence();}}/></group>
  {world.layout.chairs.filter(c=>c.seated).map((c,i)=><OfficeChair key={i} p={p} x={c.x} z={c.z} heading={c.heading}/>)}
  <Box at={[-4.9,.8,-3.65]} size={[1.0,1.6,1.1]} color={p.oat}/>{[.4,.8,1.2].map(y=><Box key={y} at={[-4.9,y,-3.08]} size={[.74,.025,.03]} color={p.steelSeam}/>)}
  <pointLight position={[-3.5,4.2,-3]} color={p.window} intensity={8} distance={9}/><Sign at={[1.9,3.5,-4.68]} size={[1.8,.8]} lines={[scenario.time==='14:20'?l('14:20 · 方案短会','14:20 · PROPOSAL'):l('17:50 · 材料待分工','17:50 · UNASSIGNED')]} p={p} lang={lang}/>
 </group>;
}

/* eslint-disable react-hooks/immutability -- Three.js cameras, meshes and the room simulation are mutable resources; React renders their separate snapshots. */
import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {CanvasTexture,Group,MathUtils,SRGBColorSpace,Vector2,Vector3} from 'three';
import {RoundedBox} from '@react-three/drei';
import {pick,ui,type Lang,type Scenario,type Gesture} from '../lib/content';
import type {Palette} from '../lib/palette';
import {actorBeat,playerBeat,trophyPosition,type Drama} from '../lib/drama';
import {PLAYER_HOME,type World} from '../lib/room';
import {DinnerHand} from './DinnerHand';
import {advancePresence,createPresence,conversationalRaise} from '../lib/presence';
export function Cup({position=[0,0,0],palette:p,wine=false}:{position?:[number,number,number];palette:Palette;wine?:boolean}){
 const profile=useMemo(()=> (wine?[[0,.20],[.032,.20],[.054,.22],[.079,.25],[.092,.30],[.096,.36],[.091,.367],[.088,.36],[.085,.30],[.072,.25],[.046,.225],[0,.216]]:[[.068,-.095],[.079,-.085],[.094,-.04],[.116,.089],[.115,.10],[.106,.102],[.104,.09],[.084,-.035],[.070,-.065],[0,-.066]]).map(([x,y])=>new Vector2(x,y)),[wine]);
 return <group position={position}>
   {wine&&<><mesh position={[0,.012,0]}><cylinderGeometry args={[.091,.095,.021,28]}/><meshPhysicalMaterial color={p.porcelain} transparent opacity={.35} roughness={.10} metalness={.08}/></mesh><mesh position={[0,.114,0]}><cylinderGeometry args={[.012,.013,.2,16]}/><meshPhysicalMaterial color={p.porcelain} transparent opacity={.50} roughness={.08}/></mesh></>}
   <mesh castShadow><latheGeometry args={[profile,32]}/><meshPhysicalMaterial color={p.porcelain} transparent={wine} opacity={wine?.32:1} roughness={wine?.08:.22} clearcoat={.45} side={2} depthWrite={!wine}/></mesh>
   <mesh position={[0,wine?.27:.056,0]}><cylinderGeometry args={[wine?.080:.099,wine?.055:.078,wine?.066:.019,28]}/><meshStandardMaterial color={p.tea} roughness={.20}/></mesh>
   {!wine&&<><mesh position={[0,.102,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.11,.0045,6,32]}/><meshStandardMaterial color={p.brass} metalness={.45} roughness={.3}/></mesh><mesh position={[.119,.005,0]} rotation={[0,Math.PI/2,0]}><torusGeometry args={[.046,.012,8,24]}/><meshStandardMaterial color={p.porcelain} roughness={.22}/></mesh></>}
 </group>;
}
function useScreen(p:Palette,kind:'calendar'|'intro'|'photo'|'family'|'trophy',lang:Lang){
 const texture=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=384;canvas.height=640;const c=canvas.getContext('2d')!;c.fillStyle=kind==='family'?p.wine:p.porcelain;c.fillRect(0,0,384,640);c.fillStyle=kind==='family'?p.brass:p.dark;c.textAlign='center';c.font='600 30px sans-serif';c.fillText(pick(ui[kind==='calendar'?'calendarDay':kind==='intro'?'phoneCard':kind==='photo'?'photoScreen':kind==='family'?'familyWish':'trophyLabel'],lang),192,70,345);
 if(kind==='calendar'){c.font='700 110px sans-serif';c.fillText(pick(ui.calendarShort,lang),192,245,320);for(let i=0;i<3;i++){c.fillStyle=i? p.napkin:p.brass;c.fillRect(40,330+i*65,304,38);}}
 else if(kind==='intro'){c.fillStyle=p.napkin;c.beginPath();c.arc(192,250,72,0,Math.PI*2);c.fill();c.beginPath();c.ellipse(192,390,110,100,0,Math.PI,Math.PI*2);c.fill();c.fillStyle=p.wood;c.fillRect(58,520,268,8);c.fillRect(98,550,188,6);}
 else if(kind==='photo'){c.strokeStyle=p.brass;c.lineWidth=8;c.strokeRect(32,130,320,355);for(let i=0;i<4;i++){c.fillStyle=[p.navy,p.wine,p.sage,p.navy][i];c.beginPath();c.arc(80+i*75,280,25,0,Math.PI*2);c.fill();c.fillRect(53+i*75,318,54,75);}}
 else {c.font='600 145px serif';c.fillText(pick(ui[kind==='family'?'familyGlyph':'trophyGlyph'],lang),192,375,330);}
 const t=new CanvasTexture(canvas);t.colorSpace=SRGBColorSpace;return t;},[p,kind,lang]);useEffect(()=>()=>texture.dispose(),[texture]);return texture;
}
export function Phone({p,kind,lang}:{p:Palette;kind:'calendar'|'intro'|'photo';lang:Lang}){const screen=useScreen(p,kind,lang);return <group scale={.74} rotation={[0,kind==='photo'?Math.PI:0,0]}><RoundedBox args={[.34,.62,.05]} radius={.018} smoothness={3} castShadow><meshStandardMaterial color={p.dark} roughness={.3} metalness={.12}/></RoundedBox><mesh position={[0,0,.027]}><planeGeometry args={[.302,.55]}/><meshBasicMaterial map={screen} toneMapped={false}/></mesh><mesh position={[0,.296,.03]}><boxGeometry args={[.08,.009,.009]}/><meshStandardMaterial color={p.dark}/></mesh><mesh position={[-.095,.22,-.028]} rotation={[0,Math.PI,0]}><circleGeometry args={[.026,18]}/><meshStandardMaterial color={p.brass} metalness={.6}/></mesh><mesh position={[-.095,.22,-.031]} rotation={[0,Math.PI,0]}><circleGeometry args={[.017,18]}/><meshStandardMaterial color={p.sage}/></mesh></group>;}
export function TableCups({p,world,drama,scenario,reactions,line,paused}:{p:Palette;world:World;drama:Drama;scenario:Scenario;reactions:{gesture:Gesture}[];line:string;paused:boolean}){
 const cups=useRef<(Group|null)[]>([]),presence=useRef(createPresence());
 useFrame((_,dt)=>{const timing=advancePresence(presence.current,{dt,line,speakerId:world.speakerId,paused:paused||document.hidden});cups.current.forEach((cup,i)=>{const raise=drama.active&&drama.phase!=='settled'?actorBeat(drama,i,scenario.id).raise:reactions[i]?.gesture==='toast'?conversationalRaise(timing.elapsed):0;if(cup)cup.visible=i===4?drama.inventory!=='glass':i===3?scenario.id==='family'?drama.inventory!=='glass'&&drama.inventory!=='tea':drama.inventory!=='tea':raise<.015;});});
 return <>{[...world.npcs,{...PLAYER_HOME,id:'player'},...(scenario.id!=='family'?[{...PLAYER_HOME,id:'player-wine'}]:[])].map((actor,i)=>{const home=i>=3?PLAYER_HOME:world.npcs[i].home,r=Math.hypot(home.x,home.z);return <group key={actor.id} ref={el=>{cups.current[i]=el;}} position={[home.x/r*2.13+(i===4?-.28:.28),scenario.id!=='family'&&(i===0||i===4)?1.70:1.79,home.z/r*2.13]}><Cup palette={p} wine={scenario.id!=='family'&&(i===0||i===4)}/></group>;})}</>;
}
export function ScenarioObjects({p,drama,scenario,lang,reduced}:{p:Palette;drama:Drama;scenario:Scenario;lang:Lang;reduced:boolean}){
 const trophy=useRef<Group>(null!),steam=useRef<Group>(null!);const family=useScreen(p,'family',lang),plaque=useScreen(p,'trophy',lang);
 useFrame(({clock},dt)=>{if(trophy.current){const target=trophyPosition(drama);trophy.current.position.y=MathUtils.lerp(trophy.current.position.y,Math.hypot(target.x,target.z)<1.55?1.794:1.74,reduced?1:1-Math.exp(-6*dt));trophy.current.position.x=MathUtils.lerp(trophy.current.position.x,target.x,reduced?1:1-Math.exp(-6*dt));trophy.current.position.z=MathUtils.lerp(trophy.current.position.z,target.z,reduced?1:1-Math.exp(-6*dt));}if(steam.current)steam.current.children.forEach((particle,i)=>{const progress=(clock.elapsedTime*.15+i*.33)%1;particle.position.y=reduced?.22:.08+progress*.55;particle.position.x=reduced?0:Math.sin(progress*4+i)*.05;particle.scale.setScalar(.5+progress);});});
 return <>
 {scenario.id==='family'&&<><mesh position={[3.73,3.6,-4.79]} rotation={[0,0,Math.PI/4]}><planeGeometry args={[1.05,1.05]}/><meshStandardMaterial color={p.wine}/></mesh><mesh position={[3.73,3.6,-4.77]}><planeGeometry args={[.75,.75]}/><meshBasicMaterial map={family}/></mesh>{[-.38,.38].map(x=><group key={x} position={[x,1.8,-.8]} rotation={[-Math.PI/2,0,.18]}><mesh><boxGeometry args={[.24,.42,.015]}/><meshStandardMaterial color={p.wine}/></mesh><mesh position={[0,0,.011]}><planeGeometry args={[.12,.13]}/><meshStandardMaterial color={p.brass}/></mesh></group>)}</>}
 {scenario.id==='school'&&<group ref={trophy} position={[0,1.794,-.75]} scale={.72}><mesh castShadow><boxGeometry args={[.55,.14,.38]}/><meshStandardMaterial color={p.dark}/></mesh><mesh position={[0,.14,0]}><cylinderGeometry args={[.08,.13,.2,20]}/><meshStandardMaterial color={p.brass} metalness={.65} roughness={.2}/></mesh><mesh position={[0,.4,0]}><cylinderGeometry args={[.21,.07,.35,28]}/><meshStandardMaterial color={p.brass} metalness={.65} roughness={.2}/></mesh>{[-1,1].map(side=><mesh key={side} position={[side*.22,.43,0]} rotation={[0,0,side*Math.PI/2]}><torusGeometry args={[.12,.018,8,24,Math.PI*1.35]}/><meshStandardMaterial color={p.brass} metalness={.6} roughness={.2}/></mesh>)}<mesh position={[0,.012,.197]}><planeGeometry args={[.31,.11]}/><meshBasicMaterial map={plaque}/></mesh></group>}
 <group ref={steam} position={[-.78,1.83,-.72]}>{[0,1,2].map(i=><mesh key={i}><sphereGeometry args={[.07,10,8]}/><meshStandardMaterial color={p.porcelain} transparent opacity={.08} depthWrite={false}/></mesh>)}</group>
 </>;
}
export function PlayerHands({p,drama,lang,scenario,world,hudHeight}:{p:Palette;drama:Drama;lang:Lang;scenario:Scenario;world:World;hudHeight:number}){
 const root=useRef<Group>(null!),hand=useRef<Group>(null!),cup=useRef<Group>(null!),phone=useRef<Group>(null!),palm=useRef<Group>(null!);
 const target=useMemo(()=>new Vector3(),[]),bottom=useMemo(()=>new Vector3(),[]);
 useFrame(({camera,size},dt)=>{
   const pose=playerBeat(drama),portrait=size.width/size.height<=1.25;
   root.current.position.copy(camera.position);root.current.quaternion.copy(camera.quaternion);root.current.visible=drama.inventory!=='none'||pose.palm>.02;
   target.set(portrait?(world.player.seated?.22:drama.inventory==='phone'?.24:.15):.88,-.62+Math.max(pose.raise*.55,(drama.inventory==='phone'?Math.max(pose.phone,.5):pose.phone)*.5),portrait?(!world.player.seated&&drama.inventory==='phone'?-1.20:-.85):-1.35);
   if(portrait&&drama.inventory!=='none'){
     // Keep the held cup/screen above the actual subtitle block, including camera view offsets.
     bottom.set(target.x,target.y-.115,target.z).applyMatrix4(camera.projectionMatrix);
     const bottomPx=(1-bottom.y)*size.height/2,safeBottom=Math.max(size.height*.32,size.height-17-hudHeight-12);
     if(bottomPx>safeBottom)target.y+=(bottomPx-safeBottom)*2*(-target.z)/(size.height*camera.projectionMatrix.elements[5]);
     bottom.set(target.x+(drama.inventory==='phone'?.13:drama.inventory==='tea'?.18:.10),target.y,target.z).applyMatrix4(camera.projectionMatrix);
     const rightPx=(1+bottom.x)*size.width/2;
     if(rightPx>size.width-14)target.x-=(rightPx-size.width+14)*2*(-target.z)/(size.width*camera.projectionMatrix.elements[0]);
   }
   hand.current.position.lerp(target,1-Math.exp(-12*dt));
   cup.current.visible=drama.inventory==='glass'||drama.inventory==='tea';phone.current.visible=drama.inventory==='phone'&&(drama.choice!=='accept'||drama.elapsed>.45);
   palm.current.visible=pose.palm>.02;palm.current.position.y=-.71+pose.palm*.3;
 });
 const holdingPhone=drama.inventory==='phone',wine=scenario.id!=='family'&&drama.inventory==='glass';
 const wrist:[number,number,number]=holdingPhone?[.145,-.035,.045]:wine?[.045,-.025,-.08]:[.07,-.12,-.10];
 return <group ref={root}>
   <group ref={hand} position={[.47,-.62,-.78]}>
     <group position={wrist}>
       <mesh position={[0,-.28,.15]} rotation={[-.55,0,0]} castShadow><cylinderGeometry args={[.05,.07,.46,20]}/><meshStandardMaterial color={p.navy} roughness={.92}/></mesh>
       <mesh position={[0,-.045,.010]}><cylinderGeometry args={[.037,.045,.07,16]}/><meshStandardMaterial color={p.white} roughness={.85}/></mesh>
       <group rotation={[0,holdingPhone?Math.PI:0,Math.PI]}><DinnerHand p={p} side={holdingPhone?-1:1} pose={holdingPhone?'phone':wine?'stem':'cup'}/></group>
     </group>
     <group ref={cup}><Cup palette={p} wine={wine}/></group>
     <group ref={phone} position={[0,.12,0]}><Phone p={p} kind={drama.active==='family-phone'?'intro':'calendar'} lang={lang}/></group>
   </group>
   <group ref={palm} position={[-.28,-.71,-.75]} rotation={[.18,0,.1]}>
     <group rotation={[0,0,Math.PI]}><DinnerHand p={p} side={-1} pose="open"/></group>
     <mesh position={[0,-.20,.01]}><cylinderGeometry args={[.045,.06,.35,18]}/><meshStandardMaterial color={p.navy} roughness={.9}/></mesh>
   </group>
 </group>;
}

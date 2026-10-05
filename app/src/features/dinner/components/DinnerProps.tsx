/* eslint-disable react-hooks/immutability -- Three.js cameras, meshes and the room simulation are mutable resources; React renders their separate snapshots. */
import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {CanvasTexture,Group,MathUtils,SRGBColorSpace,Vector3} from 'three';
import {RoundedBox} from '@react-three/drei';
import {pick,ui,type Lang,type Scenario,type Gesture} from '../lib/content';
import type {Palette} from '../lib/palette';
import {actorBeat,playerBeat,trophyPosition,type Drama} from '../lib/drama';
import type {World} from '../lib/room';
import dinnerGeometry from '../lib/dinnerGeometry.json';
import {AssetHand} from './SceneAssets';
import {advancePresence,createPresence,conversationalRaise} from '../lib/presence';
export { AssetCup as Cup } from './SceneAssets';
import { AssetCup as Cup } from './SceneAssets';

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
 const compact=world.layout.profile==='compact-work',radius=(compact?dinnerGeometry.work:dinnerGeometry.classic).cupRadius;
 return <>{[...world.npcs,{...world.player.home,id:'player'},...(scenario.id!=='family'?[{...world.player.home,id:'player-wine'}]:[])].map((actor,i)=>{const home=i>=3?world.player.home:world.npcs[i].home,r=Math.hypot(home.x,home.z),heading=i>=3?world.layout.player.heading:world.npcs[i].homeHeading,side=i===4?-1:1;return <group key={actor.id} ref={el=>{cups.current[i]=el;}} position={[home.x/r*radius+(compact?-Math.cos(heading)*.41*side:i===4?-.28:.28),scenario.id!=='family'&&(i===0||i===4)?1.724:1.819,home.z/r*radius+(compact?Math.sin(heading)*.41*side:0)]}><Cup palette={p} wine={scenario.id!=='family'&&(i===0||i===4)}/></group>;})}</>;
}
export function ScenarioObjects({p,drama,scenario,lang,reduced}:{p:Palette;drama:Drama;scenario:Scenario;lang:Lang;reduced:boolean}){
 const trophy=useRef<Group>(null!),steam=useRef<Group>(null!);const family=useScreen(p,'family',lang),plaque=useScreen(p,'trophy',lang);
 useFrame(({clock},dt)=>{if(trophy.current){const target=trophyPosition(drama);trophy.current.position.y=MathUtils.lerp(trophy.current.position.y,Math.hypot(target.x,target.z)<1.55?1.794:1.74,reduced?1:1-Math.exp(-6*dt));trophy.current.position.x=MathUtils.lerp(trophy.current.position.x,target.x,reduced?1:1-Math.exp(-6*dt));trophy.current.position.z=MathUtils.lerp(trophy.current.position.z,target.z,reduced?1:1-Math.exp(-6*dt));}if(steam.current)steam.current.children.forEach((particle,i)=>{const progress=(clock.elapsedTime*.15+i*.33)%1;particle.position.y=reduced?.22:.08+progress*.55;particle.position.x=reduced?0:Math.sin(progress*4+i)*.05;particle.scale.setScalar(.5+progress);});});
 return <>
 {scenario.id==='family'&&<><mesh position={[3.73,3.6,-4.79]} rotation={[0,0,Math.PI/4]}><planeGeometry args={[1.05,1.05]}/><meshStandardMaterial color={p.wine}/></mesh><mesh position={[3.73,3.6,-4.77]}><planeGeometry args={[.75,.75]}/><meshBasicMaterial map={family}/></mesh>{[-.38,.38].map(x=><group key={x} position={[x,1.8,-.8]} rotation={[-Math.PI/2,0,.18]}><mesh><boxGeometry args={[.24,.42,.015]}/><meshStandardMaterial color={p.wine}/></mesh><mesh position={[0,0,.011]}><planeGeometry args={[.12,.13]}/><meshStandardMaterial color={p.brass}/></mesh></group>)}</>}
 {scenario.id==='school'&&<group ref={trophy} position={[0,1.794,-.75]} scale={.72}><mesh castShadow><boxGeometry args={[.55,.14,.38]}/><meshStandardMaterial color={p.dark}/></mesh><mesh position={[0,.14,0]}><cylinderGeometry args={[.08,.13,.2,20]}/><meshStandardMaterial color={p.brass} metalness={.65} roughness={.2}/></mesh><mesh position={[0,.4,0]}><cylinderGeometry args={[.21,.07,.35,28]}/><meshStandardMaterial color={p.brass} metalness={.65} roughness={.2}/></mesh>{[-1,1].map(side=><mesh key={side} position={[side*.22,.43,0]} rotation={[0,0,side*Math.PI/2]}><torusGeometry args={[.12,.018,8,24,Math.PI*1.35]}/><meshStandardMaterial color={p.brass} metalness={.6} roughness={.2}/></mesh>)}<mesh position={[0,.012,.197]}><planeGeometry args={[.31,.11]}/><meshBasicMaterial map={plaque}/></mesh></group>}
 <group ref={steam} position={[scenario.id==='work'?-.50:-.78,1.83,scenario.id==='work'?-.46:-.72]}>{[0,1,2].map(i=><mesh key={i}><sphereGeometry args={[.07,10,8]}/><meshStandardMaterial color={p.porcelain} transparent opacity={.08} depthWrite={false}/></mesh>)}</group>
 </>;
}
export function PlayerHands({p,drama,lang,scenario,hudHeight}:{p:Palette;drama:Drama;lang:Lang;scenario:Scenario;hudHeight:number}){
 const root=useRef<Group>(null!),hand=useRef<Group>(null!),cup=useRef<Group>(null!),phone=useRef<Group>(null!),palm=useRef<Group>(null!);
 const target=useMemo(()=>new Vector3(),[]),bottom=useMemo(()=>new Vector3(),[]);
 useFrame(({camera,size},dt)=>{
   const pose=playerBeat(drama),portrait=size.width/size.height<=1.25;
   root.current.position.copy(camera.position);root.current.quaternion.copy(camera.quaternion);root.current.visible=drama.inventory!=='none'||pose.palm>.02;
   target.set(portrait?(drama.inventory==='phone'?.30:.38):.88,-.62+Math.max(pose.raise*.55,(drama.inventory==='phone'?Math.max(pose.phone,.5):pose.phone)*.5),portrait?(drama.inventory==='phone'?-1.25:-1.35):-1.35);
   if(drama.inventory!=='none'){
     if(portrait){
       // Keep the held cup/screen above the subtitle block, including view offsets.
       bottom.set(target.x,target.y-.115,target.z).applyMatrix4(camera.projectionMatrix);
       const bottomPx=(1-bottom.y)*size.height/2,safeBottom=Math.max(size.height*.32,size.height-17-hudHeight-12);
       if(bottomPx>safeBottom)target.y+=(bottomPx-safeBottom)*2*(-target.z)/(size.height*camera.projectionMatrix.elements[5]);
     }
     // Include the curled hand and handle, not just the vessel, at every aspect.
     bottom.set(target.x+(drama.inventory==='phone'?.20:drama.inventory==='tea'?.25:.13),target.y,target.z).applyMatrix4(camera.projectionMatrix);
     const rightPx=(1+bottom.x)*size.width/2;
     if(rightPx>size.width-14)target.x-=(rightPx-size.width+14)*2*(-target.z)/(size.width*camera.projectionMatrix.elements[0]);
   }
   hand.current.position.lerp(target,1-Math.exp(-12*dt));
   cup.current.visible=drama.inventory==='glass'||drama.inventory==='tea';phone.current.visible=drama.inventory==='phone'&&(drama.choice!=='accept'||drama.elapsed>.45);
   palm.current.visible=pose.palm>.02;palm.current.position.set(portrait?-.38:-.28,-.71+pose.palm*.3,portrait?-1.3:-.75);
 });
 const holdingPhone=drama.inventory==='phone',wine=scenario.id!=='family'&&drama.inventory==='glass';
 // The curled finger gap meets the stem / mug handle; the foot stays above
 // the wrist instead of clipping through the forearm like a bracelet.
 const wrist:[number,number,number]=holdingPhone?[.145,-.035,.045]:wine?[.09,-.13,.015]:[.195,-.153,.015];
 return <group ref={root}>
   <group ref={hand} position={[.47,-.62,-.78]}>
     <group position={wrist}><AssetHand p={p}/></group>
     <group ref={cup}><Cup palette={p} wine={wine}/></group>
     <group ref={phone} position={[0,.12,0]}><Phone p={p} kind={drama.active==='family-phone'?'intro':'calendar'} lang={lang}/></group>
   </group>
   <group ref={palm} position={[-.28,-.71,-.75]} rotation={[.18,0,.1]}>
     <AssetHand p={p} open/>
   </group>
 </group>;
}

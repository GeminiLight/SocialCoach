import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { Group, Vector2 } from 'three';
import type { Scenario } from '../lib/content';
import type { Palette } from '../lib/palette';
import type { DinnerSurfaces } from '../lib/surfaces';
import { PLAYER_HOME, SEATS, walkPlayer, type World } from '../lib/room';
import { Cup } from './DinnerProps';
import {StaticFurniture} from './StaticFurniture';

type V=[number,number,number];
type Materials={p:Palette;surfaces:DinnerSurfaces};
function Block({at=[0,0,0],size,rotation=[0,0,0],color,map,roughness=.65,radius=.02}:{at?:V;size:V;rotation?:V;color:string;map?:DinnerSurfaces['wood'];roughness?:number;radius?:number}){
  return <RoundedBox position={at} rotation={rotation} args={size} radius={radius} smoothness={2} castShadow receiveShadow><meshStandardMaterial color={map?undefined:color} map={map} bumpMap={map} bumpScale={.012} roughness={roughness}/></RoundedBox>;
}
function Disc({at=[0,0,0],r,height,color,metal=0,map}:{at?:V;r:number;height:number;color:string;metal?:number;map?:DinnerSurfaces['wood']}){
  return <mesh position={at} castShadow receiveShadow><cylinderGeometry args={[r,r,height,64]}/><meshStandardMaterial color={map?undefined:color} map={map} bumpMap={map} bumpScale={.009} roughness={metal?.3:.55} metalness={metal}/></mesh>;
}
function Ellipsoid({at,size,color,rotation=[0,0,0]}:{at:V;size:V;color:string;rotation?:V}){
  return <mesh position={at} scale={size} rotation={rotation} castShadow receiveShadow><sphereGeometry args={[1,16,12]}/><meshStandardMaterial color={color} roughness={.62}/></mesh>;
}

export function DinnerChair({p,surfaces,position=[0,0,0],rotation=0}:Materials&{position?:V;rotation?:number}){
  return <group position={position} rotation={[0,rotation,0]}>
    <Block at={[0,.88,0]} size={[1.02,.15,.89]} color={p.woodEdge} map={surfaces.wood}/>
    <Block at={[0,.965,.015]} size={[.94,.15,.84]} color={p.chair} radius={.06}/>
    <Block at={[0,1.44,-.43]} size={[1.02,1.04,.12]} color={p.woodEdge} map={surfaces.wood} radius={.05}/>
    <Block at={[0,1.48,-.345]} size={[.82,.78,.095]} color={p.chair} radius={.045}/>
    {[-.3,0,.3].map(x=><Block key={x} at={[x,1.47,-.29]} size={[.012,.6,.013]} color={p.clothHighlight} radius={.004}/>)}
    {[-.39,.39].flatMap(x=>[-.32,.32].map(z=><group key={`${x}-${z}`}><mesh position={[x,.43,z]} castShadow><cylinderGeometry args={[.038,.028,.87,10]}/><meshStandardMaterial color={p.woodEdge} roughness={.5}/></mesh><mesh position={[x,.055,z]}><cylinderGeometry args={[.03,.03,.1,10]}/><meshStandardMaterial color={p.brass} metalness={.5} roughness={.35}/></mesh></group>))}
    {[-.49,.49].map(x=><group key={x}><Block at={[x,1.18,.035]} size={[.07,.08,.66]} color={p.wood} map={surfaces.wood}/><Block at={[x,1.05,.22]} size={[.045,.26,.045]} color={p.woodEdge}/></group>)}
  </group>;
}
function PlaceSetting({p,surfaces,position,rotation,seat}:Materials&{position:V;rotation:number;seat:number}){
  return <group position={position} rotation={[0,rotation,0]}>
    <Disc r={.345} height={.025} color={p.porcelain}/>
    <mesh position={[0,.027,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.278,.322,48]}/><meshStandardMaterial color={p.brass} roughness={.35} metalness={.4}/></mesh>
    <Disc at={[0,.022,0]} r={.266} height={.014} color={p.white}/>
    <group position={[.035+(seat%2)*.026,.055,-.04+(seat%3)*.017]}><mesh castShadow><latheGeometry args={[[[.08,0],[.10,.025],[.145,.045],[.195,.10],[.22,.15],[.218,.162],[.205,.158],[.18,.108],[.13,.065],[.08,.05]].map(([x,y])=>new Vector2(x,y)),32]}/><meshStandardMaterial color={p.ceramic} roughness={.22} metalness={.08} side={2}/></mesh><Disc at={[0,.057,0]} r={.13} height={.012} color={p.rice}/></group>
    <Block at={[-.45,.026,.01]} rotation={[0,(seat-1.5)*.04,0]} size={[.23,.025,.48]} color={p.napkin} map={surfaces.fabric} radius={.008}/>
    <Block at={[-.45,.043,-.11]} size={[.13,.006,.23]} color={p.napkin} map={surfaces.fabric} rotation={[0,.08,0]} radius={.002}/>
    {[-.49,-.42].map(x=><mesh key={x} position={[x,.063,.035]} rotation={[Math.PI/2,0,.025+(seat-1.5)*.016]} castShadow><cylinderGeometry args={[.009,.014,.56,8]}/><meshStandardMaterial color={p.woodEdge} roughness={.4}/></mesh>)}
    <Block at={[-.455,.064,-.19]} size={[.125,.025,.035]} color={p.ceramic} radius={.009}/>
    <group position={[.40,.025,.05]} rotation={[0,.15,0]}><Ellipsoid at={[0,.009,-.11]} size={[.047,.018,.072]} color={p.porcelain}/><Block at={[0,.019,.015]} size={[.023,.018,.17]} color={p.porcelain} radius={.007}/></group>
  </group>;
}
function ServingPlate({p,x,z,r=.39,food}: {p:Palette;x:number;z:number;r?:number;food:'fish'|'greens'|'dumplings'|'meat'|'tomato'}){
  return <group position={[x,1.785,z]}>
    <Disc r={r} height={.036} color={p.porcelain}/>
    <mesh position={[0,.025,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[r-.046,r-.026,48]}/><meshStandardMaterial color={p.ceramic} roughness={.3}/></mesh>
    {food==='fish'?<group rotation={[0,.5,0]}><Ellipsoid at={[0,.033,0]} size={[.39,.009,.19]} color={p.tea}/><Ellipsoid at={[0,.075,0]} size={[.32,.066,.115]} color={p.food}/><Ellipsoid at={[-.29,.077,0]} size={[.11,.061,.102]} color={p.food}/><Ellipsoid at={[-.35,.095,.052]} size={[.012,.009,.01]} color={p.dark}/>{[-1,1].map(side=><mesh key={side} position={[.34,.07,side*.045]} rotation={[0,0,-Math.PI/2]} scale={[1,1,.3]}><coneGeometry args={[.082,.18,3]}/><meshStandardMaterial color={p.food}/></mesh>)}{[-.2,-.1,0,.1,.2].map(a=><group key={a}><Block at={[a,.125,.015]} size={[.02,.010,.11]} color={p.green} rotation={[0,.3,0]} radius={.003}/><Block at={[a+.025,.126,-.02]} size={[.015,.007,.075]} color={p.rice} rotation={[0,-.2,0]} radius={.003}/></group>)}</group>:
      Array.from({length:food==='greens'?11:food==='dumplings'?7:9},(_,i)=>{const a=i*2.399,radius=Math.sqrt(i/10)*(r-.12),pos:V=[Math.cos(a)*radius,.062+(i%3)*.018,Math.sin(a)*radius];return <group key={i} position={pos} rotation={[0,a,0]}>
        {food==='tomato'?<><mesh rotation={[Math.PI/2,0,.3]} scale={[1,1,.7]} castShadow><sphereGeometry args={[.093,16,10,0,Math.PI]}/><meshStandardMaterial color={p.red} roughness={.35}/></mesh><Ellipsoid at={[0,.018,.025]} size={[.055,.012,.044]} color={p.red}/>{[-.028,.025].map(x=><Ellipsoid key={x} at={[x,.032,.029]} size={[.009,.004,.006]} color={p.rice}/>)}<Block at={[.06,.019,-.045]} size={[.10,.034,.06]} color={p.rice} rotation={[0,.35,.13]} radius={.01}/></>:
        food==='dumplings'?<><Ellipsoid at={[0,0,0]} size={[.112,.055,.07]} color={p.rice}/>{[-2,-1,0,1,2].map(j=><mesh key={j} position={[j*.029,.042,0]} rotation={[0,j*.16,0]} scale={[1,.6,.36]}><torusGeometry args={[.04,.005,6,12,Math.PI]}/><meshStandardMaterial color={p.porcelain} roughness={.6}/></mesh>)}</>:
        food==='greens'?<><Ellipsoid at={[0,0,0]} size={[.135,.024,.045]} color={p.green} rotation={[0,0,.08]}/><Block at={[.018,.018,0]} size={[.15,.012,.012]} color={p.stem} rotation={[0,.1,0]} radius={.004}/></>:
        <><Block size={[.13,.072,.10]} color={p.food} rotation={[.10,0,.09]} radius={.02}/><Block at={[0,.037,0]} size={[.10,.008,.085]} color={p.tea} radius={.012}/></>}
      </group>;})}

  </group>;
}
export const DinnerTable=memo(function DinnerTable({p,surfaces}:Materials){
  return <StaticFurniture><group>
    <Disc at={[0,.76,0]} r={.65} height={1.45} color={p.woodEdge} map={surfaces.wood}/>
    <Disc at={[0,1.59,0]} r={2.65} height={.20} color={p.wood} map={surfaces.wood}/>
    <Disc at={[0,1.492,0]} r={2.657} height={.026} color={p.brass} metal={.5}/>
    <Disc at={[0,1.705,0]} r={1.58} height={.022} color={p.woodEdge}/>
    <mesh position={[0,1.731,0]} castShadow receiveShadow><cylinderGeometry args={[1.59,1.59,.025,80]}/><meshPhysicalMaterial color={p.porcelain} transparent opacity={.18} roughness={.16} metalness={.12} depthWrite={false}/></mesh>
    <mesh position={[0,1.742,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[1.55,1.586,80]}/><meshStandardMaterial color={p.brass} metalness={.65} roughness={.22}/></mesh>
    {[...SEATS,PLAYER_HOME].map((seat,i)=>{const angle=Math.atan2(seat.x,seat.z);return <PlaceSetting key={i} p={p} surfaces={surfaces} seat={i} position={[Math.sin(angle)*2.14,1.713,Math.cos(angle)*2.14]} rotation={angle}/>;})}
    <ServingPlate p={p} x={-.78} z={-.72} r={.43} food="fish"/>
    <ServingPlate p={p} x={.74} z={-.78} food="greens"/>
    <ServingPlate p={p} x={1.07} z={.28} food="meat"/>
    <ServingPlate p={p} x={.05} z={1.10} food="tomato"/>
    <ServingPlate p={p} x={-.93} z={.39} food="dumplings"/>
    <group position={[-1.55,1.72,-.94]}>
      <Ellipsoid at={[0,.13,0]} size={[.20,.15,.19]} color={p.ceramic}/><Disc at={[0,.277,0]} r={.135} height={.02} color={p.ceramic}/><Ellipsoid at={[0,.303,0]} size={[.038,.025,.038]} color={p.brass}/>
      <mesh position={[-.19,.17,0]} rotation={[0,Math.PI/2,0]}><torusGeometry args={[.11,.024,8,20,Math.PI*1.5]}/><meshStandardMaterial color={p.ceramic} roughness={.2}/></mesh>
      <mesh position={[.22,.17,0]} rotation={[0,0,-.70]}><cylinderGeometry args={[.026,.064,.24,12]}/><meshStandardMaterial color={p.ceramic} roughness={.2}/></mesh>
    </group>
    <group position={[1.69,1.70,-.89]}><mesh position={[0,.20,0]} castShadow><cylinderGeometry args={[.10,.115,.4,24]}/><meshPhysicalMaterial color={p.bottle} roughness={.15} clearcoat={.7}/></mesh><mesh position={[0,.47,0]}><cylinderGeometry args={[.039,.057,.20,16]}/><meshStandardMaterial color={p.bottle} roughness={.18}/></mesh><Disc at={[0,.58,0]} r={.044} height={.04} color={p.brass} metal={.6}/><Block at={[0,.22,.105]} size={[.12,.20,.009]} color={p.napkin} radius={.002}/></group>
  </group></StaticFurniture>;
});
export const DinnerRoom=memo(function DinnerRoom({p,surfaces,world,paused,scenario}:Materials&{world:World;paused:boolean;scenario:Scenario}){
  const back=useRef<Group>(null!),front=useRef<Group>(null!);
  useFrame(({camera})=>{back.current.visible=camera.position.z>-5.2;front.current.visible=camera.position.z<6.3;});
  return <group>
    <mesh position={[0,-.012,0]} rotation={[-Math.PI/2,0,0]} receiveShadow onClick={e=>{e.stopPropagation();if(e.delta<5&&!paused)walkPlayer(world,{x:e.point.x,z:e.point.z});}}><planeGeometry args={[24,24]}/><meshStandardMaterial color={p.floor} roughness={.8}/></mesh>
    <mesh position={[0,.006,0]} rotation={[-Math.PI/2,0,0]} receiveShadow><circleGeometry args={[4.1,80]}/><meshStandardMaterial map={surfaces.rug} roughness={1}/></mesh>
    <mesh position={[0,.008,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[3.96,4.04,80]}/><meshStandardMaterial color={p.wood} roughness={1}/></mesh>
    {Array.from({length:11},(_,i)=><mesh key={i} position={[-6+i*1.2,.001,.55]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.006,11.5]}/><meshStandardMaterial color={p.woodEdge} roughness={1}/></mesh>)}
    {[[0,3,-5.2,0],[0,3,6.3,Math.PI],[-6.6,3,.55,Math.PI/2],[6.6,3,.55,-Math.PI/2]].map(([x,y,z,a],i)=><mesh key={i} position={[x,y,z]} rotation={[0,a,0]} onClick={e=>e.stopPropagation()} receiveShadow><planeGeometry args={[i<2?13.2:11.5,6]}/><meshStandardMaterial map={surfaces.wall} roughness={.97}/></mesh>)}
    <mesh position={[0,6,.55]} rotation={[Math.PI/2,0,0]}><planeGeometry args={[13.2,11.5]}/><meshStandardMaterial color={p.wallInset} roughness={1}/></mesh>
    <group ref={back}><StaticFurniture>
      <Block at={[0,1,-5.04]} size={[13.2,2,.12]} color={p.woodEdge} map={surfaces.wood}/>
      {Array.from({length:32},(_,i)=><Block key={i} at={[-6.18+i*.40,1.03,-4.94]} size={[.026,1.85,.024]} color={p.wood} radius={.005}/>)}
      <Block at={[0,2.035,-4.94]} size={[13.2,.07,.1]} color={p.wood} map={surfaces.wood}/>
      <Block at={[0,2.076,-4.88]} size={[13.2,.013,.019]} color={p.brass} radius={.003}/>
      <group position={[0,3.72,-5.02]}><Block size={[4.02,2.16,.10]} color={p.woodEdge} radius={.012}/><Block at={[0,0,.062]} size={[3.90,2.04,.04]} color={p.brass} radius={.007}/><mesh position={[0,0,.09]}><planeGeometry args={[3.78,1.92]}/><meshStandardMaterial map={scenario.id==='family'?surfaces.familyArt:surfaces.landscape} roughness={1}/></mesh></group>
      {[-3.73,3.73].map(x=><group key={x} position={[x,3.6,-5.03]}><Block size={[1.20,2.45,.09]} color={p.woodEdge}/><Block at={[0,0,.06]} size={[1.06,2.30,.035]} color={p.wallInset}/>{Array.from({length:9},(_,i)=><Block key={i} at={[-.48+i*.12,0,.10]} size={[.025,2.24,.035]} color={p.wood}/>)}</group>)}
      {[-2.76,2.76].map(x=><group key={x} position={[x,3.57,-4.83]}><Block size={[.08,.72,.065]} color={p.brass}/><mesh><cylinderGeometry args={[.16,.16,.56,24,1,true]}/><meshStandardMaterial color={p.porcelain} emissive={p.light} emissiveIntensity={.5} side={2}/></mesh>{[-.29,.29].map(y=><Disc key={y} at={[0,y,0]} r={.165} height={.018} color={p.brass} metal={.4}/>)}<pointLight position={[0,0,.35]} color={p.light} intensity={6} distance={4} decay={2}/></group>)}
      <Block at={[0,5.8,-4.94]} size={[13.2,.15,.22]} color={p.wood}/>
    </StaticFurniture></group>
    <group ref={front} position={[2.8,0,6.17]}><Block at={[0,1.57,0]} size={[1.65,3.2,.13]} color={p.woodEdge} map={surfaces.wood}/><Block at={[0,1.55,-.09]} size={[1.38,2.97,.04]} color={p.wood} map={surfaces.wood}/><Block at={[-.49,1.43,-.135]} size={[.035,.26,.035]} color={p.brass}/><Block at={[-.43,1.43,-.17]} size={[.16,.03,.03]} color={p.brass}/></group>
    <StaticFurniture><group position={[0,5.24,0]}>
      <mesh position={[0,.35,0]}><cylinderGeometry args={[.018,.018,.8,10]}/><meshStandardMaterial color={p.brass}/></mesh>
      <mesh castShadow><cylinderGeometry args={[.72,1.05,.46,48,1,true]}/><meshStandardMaterial map={surfaces.fabric} roughness={.85} side={2}/></mesh>
      {[-.232,.232].map((y,i)=><mesh key={y} position={[0,y,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[i?.72:1.05,.018,8,48]}/><meshStandardMaterial color={p.brass} metalness={.4} roughness={.35}/></mesh>)}
      <Disc at={[0,-.226,0]} r={1.01} height={.014} color={p.light}/><pointLight position={[0,-.50,0]} color={p.light} intensity={24} distance={10} decay={2}/>
    </group>
    <group position={[-4.75,0,-3.45]}><mesh position={[0,.35,0]} castShadow><cylinderGeometry args={[.36,.27,.70,32]}/><meshStandardMaterial color={p.ceramic} roughness={.3}/></mesh><Disc at={[0,.71,0]} r={.34} height={.022} color={p.woodEdge}/>{Array.from({length:8},(_,i)=><group key={i} rotation={[0,i*2.399,0]}><mesh position={[.16,1.28,0]} rotation={[0,0,-.18]}><cylinderGeometry args={[.013,.023,1.55,8]}/><meshStandardMaterial color={p.stem}/></mesh>{[0,1,2].map(j=><Ellipsoid key={j} at={[.23+j*.08,1.45+j*.2,0]} size={[.14,.31,.024]} color={p.leaf} rotation={[0,0,-.35-j*.18]}/>)}</group>)}</group>
    <group position={[4.85,0,-3.8]}><Block at={[0,.83,0]} size={[1.2,1.55,.64]} color={p.woodEdge} map={surfaces.wood}/><Block at={[0,1.63,0]} size={[1.30,.09,.74]} color={p.wood} map={surfaces.wood}/>{[-.28,.28].map(x=><group key={x}><Block at={[x,.85,.33]} size={[.51,1.30,.02]} color={p.wood} map={surfaces.wood}/><Block at={[x,.99,.355]} size={[.16,.019,.022]} color={p.brass} radius={.004}/></group>)}{scenario.id==='school'?<group position={[.04,1.69,0]}><Block at={[0,.27,0]} size={[.43,.52,.30]} color={p.navy} radius={.06}/><Block at={[0,.17,.164]} size={[.32,.24,.04]} color={p.sage} radius={.025}/><mesh position={[0,.55,0]}><torusGeometry args={[.085,.014,8,20,Math.PI]}/><meshStandardMaterial color={p.navy}/></mesh></group>:scenario.id==='work'?<group position={[0,1.69,0]} rotation={[0,.14,0]}><Block at={[0,.08,0]} size={[.68,.13,.46]} color={p.dark} radius={.025}/><Block at={[0,.15,0]} size={[.31,.012,.12]} color={p.brass} radius={.002}/><Block at={[.01,.14,.20]} size={[.12,.024,.025]} color={p.brass} radius={.004}/></group>:<><Cup position={[-.20,1.77,.05]} palette={p}/><Cup position={[.15,1.77,.05]} palette={p}/></>}<Block at={[0,1.70,-.15]} size={[.74,.035,.35]} color={p.woodEdge}/></group>
    </StaticFurniture>
  </group>;
});

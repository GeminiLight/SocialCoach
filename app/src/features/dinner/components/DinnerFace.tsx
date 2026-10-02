import { useEffect, useMemo, type RefObject } from 'react';
import { DoubleSide, type Group, type Mesh, type Texture } from 'three';
import type { Character, Emotion } from '../lib/content';
import type { Palette } from '../lib/palette';
import { curveGeometry, eyeGeometry, eyeTexture, faceFeatures, faceGeometry, faceSurface, hairPigment, scalpGeometry, skinPigment, type V3 } from '../lib/avatar';

function Contour({points,color,radius=.003,opacity=1}:{points:V3[];color:string;radius?:number;opacity?:number}) {
  const key=JSON.stringify(points);
  const geometry=useMemo(()=>curveGeometry(JSON.parse(key),radius,24),[key,radius]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry}><meshStandardMaterial color={color} roughness={.9} transparent={opacity<1} opacity={opacity} depthWrite={opacity===1}/></mesh>;
}
function SoftForm({position,scale,color}:{position:V3;scale:V3;color:string}) {
  return <mesh position={position} scale={scale}><sphereGeometry args={[1,28,20]}/><meshStandardMaterial color={color} roughness={.82}/></mesh>;
}

type Props={character:Character;p:Palette;emotion:Emotion;eyes:RefObject<(Group|null)[]>;pupils:RefObject<Texture|null>;mouth:RefObject<Mesh>;lowerLip:RefObject<Group>;brows:RefObject<(Group|null)[]>};

/** Soft, continuous portrait sculpture. Small features follow the same skin surface. */
export function DinnerFace({character,p,emotion,eyes,pupils:pupilsRef,mouth,lowerLip,brows}:Props) {
  const {id}=character;
  const mature=['chen','aunt','mom','dad'].includes(id),older=['aunt','mom','dad'].includes(id),feminine=character.hair==='bob';
  const skin=older?p.skinMature:feminine?p.skin:p.skinWarm,feature=faceFeatures(id);
  const hair=id==='dad'?p.hairGray:p.hair;
  const geometry=useMemo(()=>skinPigment(faceGeometry(mature,feminine,id),skin,p.skinShadow,p.lip),[mature,feminine,id,skin,p.skinShadow,p.lip]);
  const scalp=useMemo(()=>hairPigment(scalpGeometry(feminine,character.hair==='swept',mature,id),hair,p.hairHighlight),[feminine,character.hair,mature,id,hair,p.hairHighlight]);
  const iris=useMemo(()=>eyeTexture(p),[p]);
  const eyeHeight=older?.018:.022,eyeWidth=feminine?.054:.052,eyeY=.023;
  const apertures=useMemo(()=>[-1,1].map(side=>eyeGeometry(eyeWidth,eyeHeight,id,side*feature.eye,eyeY)),[eyeWidth,eyeHeight,id,feature.eye]);
  useEffect(()=>{pupilsRef.current=iris;return()=>{pupilsRef.current=null;iris.dispose();};},[iris,pupilsRef]);
  useEffect(()=>()=>{geometry.dispose();scalp.dispose();apertures.forEach(g=>g.dispose());},[geometry,scalp,apertures]);
  const surface=(x:number,y:number,lift=.0025):V3=>[x,y,faceSurface(id,x,y)+lift];
  return <>
    <mesh geometry={geometry} castShadow><meshStandardMaterial vertexColors roughness={.82}/></mesh>
    {[-1,1].map(side=><group key={side} position={[side*(.267*feature.width),-.041,-.017]} rotation={[0,side*.12,side*-.08]}>
      <SoftForm position={[0,0,0]} scale={[.032,.067,.036]} color={skin}/>
      <SoftForm position={[side*.009,.004,.031]} scale={[.012,.037,.004]} color={p.skinShadow}/>
      <Contour color={skin} radius={.006} points={[[side*.007,-.032,.034],[side*.020,-.01,.032],[side*.020,.034,.029],[side*.003,.045,.028]]}/>
      {feminine&&<SoftForm position={[side*.005,-.055,.025]} scale={[.009,.011,.005]} color={p.brass}/>}
    </group>)}
    {[-1,1].map((side,i)=>{
      const x=side*feature.eye,origin=faceSurface(id,x,eyeY);
      const point=(u:number,y:number,lift=.004):V3=>[u,y,faceSurface(id,x+u,eyeY+y)-origin+lift];
      const rim=Array.from({length:13},(_,j)=>{const u=j/6-1;return {x:u*eyeWidth,arc:Math.pow(Math.max(0,1-u*u),.7)};});
      const browAngle=emotion==='annoyed'?side*.08:emotion==='pressing'?side*.035:emotion==='thinking'?side*-.03:0;
      return <group key={side} position={[x,eyeY,origin]}>
        <group ref={el=>{eyes.current[i]=el;}}>
          <mesh geometry={apertures[i]}><meshStandardMaterial map={iris} roughness={.55}/></mesh>
          <Contour color={p.skinShadow} radius={feminine?.0028:.0024} points={rim.map(r=>point(r.x,r.arc*eyeHeight))}/>
          <Contour color={skin} radius={.0038} points={rim.map(r=>point(r.x,-r.arc*eyeHeight*.72,.004))}/>
        </group>
        <Contour color={p.skinShadow} opacity={.20} radius={.0015} points={[-.040,-.020,0,.020,.040].map(u=>point(u,.032+(1-(u/.045)**2)*.006,.0018))}/>
        <group ref={el=>{brows.current[i]=el;}} position={[0,feature.brow,0]} rotation={[0,0,browAngle]}>
          <Contour color={hair} radius={feminine?.0039:.0052} points={[-.048,-.026,0,.024,.045].map((u,j)=>point(u,[.063,.07,.072,.068,.061][j],.0025))}/>
        </group>
        {older&&<Contour color={p.skinShadow} opacity={.16} radius={.0014} points={[-.033,-.015,.008,.03].map(u=>point(u,-.025-(1-(u/.045)**2)*.008,.002))}/>}
        {character.glasses&&<>
          <Contour color={p.brass} radius={.0032} points={[[-.063,.028,.029],[-.026,.039,.039],[.048,.03,.032],[.063,-.008,.024],[.042,-.035,.032],[-.027,-.036,.037],[-.064,-.012,.026],[-.063,.028,.029]]}/>
          <Contour color={p.brass} radius={.003} points={[[side*.061,.014,.026],[side*.156,.003,-.127]]}/>
        </>}
      </group>;
    })}
    {character.glasses&&<Contour color={p.brass} radius={.003} points={[[-.043,.052,.26],[0,.057,.274],[.043,.052,.26]]}/>}
    {/* Tiny recessed nostril marks; all volume is in the continuous face. */}
    {[-1,1].map(side=><Contour key={side} color={p.skinShadow} radius={.0017} opacity={.5} points={[surface(side*.018,-.130),surface(side*.026,-.132),surface(side*.033,-.128)]}/>)}
    <group scale={[feature.mouth,1,1]}>
      <mesh ref={mouth} position={surface(0,-.203,.003)} scale={[.051,.0018,.002]}><sphereGeometry args={[1,32,12]}/><meshStandardMaterial color={p.mouth} roughness={1}/></mesh>
      <Contour color={p.lip} radius={.0028} opacity={.66} points={[[-.052,-.201],[-.025,-.197],[-.011,-.197],[0,-.199],[.012,-.197],[.027,-.198],[.052,-.201]].map(([x,y])=>surface(x,y))}/>
      <group ref={lowerLip}><Contour color={p.lip} radius={.0036} opacity={.5} points={[[-.048,-.206],[-.025,-.212],[0,-.214],[.025,-.212],[.048,-.206]].map(([x,y])=>surface(x,y))}/></group>
    </group>
    <mesh geometry={scalp} castShadow><meshStandardMaterial vertexColors roughness={.8} side={DoubleSide}/></mesh>
  </>;
}

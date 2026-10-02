import { useMemo, useEffect } from 'react';
import type { Palette } from '../lib/palette';
import { handGeometry } from '../lib/avatar';

/** Origin is the wrist, fingers run toward -Y, grasp closes toward +Z. */
export function DinnerHand({p,pose='relaxed',side=1,skin}:{p:Palette;pose?:'relaxed'|'cup'|'stem'|'phone'|'open';side?:number;skin?:string}) {
  const geometry=useMemo(()=>handGeometry(pose,side),[pose,side]);useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry} castShadow><meshStandardMaterial color={skin??p.skinWarm} roughness={.79}/></mesh>;
}

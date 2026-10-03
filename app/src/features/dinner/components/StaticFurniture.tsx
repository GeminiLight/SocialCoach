import {useLayoutEffect,useRef,type ReactNode} from 'react';
import {Group} from 'three';
import {batchStaticMeshes} from '../lib/staticBatch';

export function StaticFurniture({children}:{children:ReactNode}) {
  const root=useRef<Group>(null!);
  useLayoutEffect(()=>batchStaticMeshes(root.current),[children]);
  return <group ref={root}>{children}</group>;
}

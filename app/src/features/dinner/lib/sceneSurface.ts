import type { Object3D } from 'three';

/** GLTFLoader splits a multi-material node into child meshes. Interaction and
 * shadow rules belong to the named surface, not an incidental primitive name. */
export function sceneSurface(object:Object3D):string {
  for(let current:Object3D|null=object;current;current=current.parent) {
    if(['Floor','Ceiling','OfficeBoard'].includes(current.name)||/^(LiftOpen|LiftClosed|EvidenceDocument)/.test(current.name))return current.name;
  }
  return object.name;
}

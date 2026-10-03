import {Group,Matrix4,Mesh,MeshStandardMaterial,type BufferGeometry} from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Only opt-in, immutable furniture belongs here. Transparent surfaces, physical
// materials, skinned characters and interactive objects keep their own meshes.
export function batchStaticMeshes(root:Group) {
  root.updateWorldMatrix(true,true);
  const inverse=new Matrix4().copy(root.matrixWorld).invert();
  const batches=new Map<string,Mesh[]>();
  root.traverse(object=>{
    if(!(object instanceof Mesh)||object.type!=='Mesh'||!object.visible||!(object.material instanceof MeshStandardMaterial)||object.material.type!=='MeshStandardMaterial'||object.material.transparent)return;
    const m=object.material;
    const key=JSON.stringify([m.color.getHex(),m.emissive.getHex(),m.emissiveIntensity,m.roughness,m.metalness,m.map?.uuid,m.bumpMap?.uuid,m.bumpScale,m.normalMap?.uuid,m.normalScale.toArray(),m.normalMapType,m.aoMap?.uuid,m.aoMapIntensity,m.lightMap?.uuid,m.lightMapIntensity,m.alphaMap?.uuid,m.roughnessMap?.uuid,m.metalnessMap?.uuid,m.emissiveMap?.uuid,m.envMap?.uuid,m.envMapIntensity,m.displacementMap?.uuid,m.displacementScale,m.displacementBias,m.side,m.depthWrite,m.depthTest,m.depthFunc,m.toneMapped,m.alphaTest,m.opacity,m.vertexColors,m.flatShading,m.wireframe,m.fog,m.blending,m.colorWrite,m.polygonOffset,m.polygonOffsetFactor,m.polygonOffsetUnits,object.castShadow,object.receiveShadow,Object.keys(object.geometry.attributes).sort()]);
    const meshes=batches.get(key)??[];meshes.push(object);batches.set(key,meshes);
  });
  const originals:Mesh[]=[],merged:Mesh[]=[];
  for(const meshes of batches.values()){
    if(meshes.length<2)continue;
    const geometries:BufferGeometry[]=meshes.map(mesh=>mesh.geometry.clone().applyMatrix4(new Matrix4().multiplyMatrices(inverse,mesh.matrixWorld)));
    const geometry=mergeGeometries(geometries,false);
    geometries.forEach(g=>g.dispose());
    if(!geometry)continue;
    geometry.computeBoundingSphere();
    const mesh=new Mesh(geometry,meshes[0].material);mesh.castShadow=meshes[0].castShadow;mesh.receiveShadow=meshes[0].receiveShadow;
    root.add(mesh);merged.push(mesh);
    for(const original of meshes){original.visible=false;originals.push(original);}
  }
  return ()=>{for(const mesh of merged){root.remove(mesh);mesh.geometry.dispose();}for(const mesh of originals)mesh.visible=true;};
}

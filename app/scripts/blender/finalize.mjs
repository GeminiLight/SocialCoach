/** After every export: refresh anatomical anchors and the public integrity manifest. */
import { readFile, readdir, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const app=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const directory=path.join(app,'public/3d/v2');
const files=(await readdir(directory)).filter(file=>file.endsWith('.glb')).sort();
const anchors={},models=[];
for(const file of files) {
  const bytes=await readFile(path.join(directory,file));
  const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  const id=file.slice(0,-4),isCharacter=gltf.skins?.length>0;
  if(isCharacter) {
    const metrics=JSON.parse(await readFile(path.join(directory,`${id}.json`),'utf8'));
    anchors[id]={standingEye:metrics.standingEye,seatedEye:metrics.seatedEye,scale:metrics.scale};
  }
  models.push({file,bytes:(await stat(path.join(directory,file))).size,sha256:createHash('sha256').update(bytes).digest('hex'),
    triangles:gltf.meshes.reduce((count,mesh)=>count+mesh.primitives.reduce((sum,p)=>sum+(gltf.accessors[p.indices]?.count??0)/3,0),0),
    drawCalls:gltf.meshes.reduce((count,mesh)=>count+mesh.primitives.length,0),generator:gltf.asset.generator,
    ...(isCharacter?{animations:gltf.animations.map(a=>a.name),morphs:[...new Set(gltf.meshes.flatMap(m=>m.extras?.targetNames??[]))]}:{})});
}
await writeFile(path.join(app,'src/features/dinner/lib/avatarAssets.ts'),`/** Generated anatomical anchors; run scripts/blender/finalize.mjs after exporting. */\nexport const avatarMetrics:Record<string,{standingEye:number;seatedEye:number;scale:number}>= ${JSON.stringify(anchors,null,2)};\n`);
await writeFile(path.join(directory,'manifest.json'),JSON.stringify({version:2,exported:new Date().toISOString().slice(0,10),blender:'5.2.2 LTS',mpfb:'afb9f530a7c2741dedb8df0ebae2e0b183caec21',models},null,2)+'\n');
console.log(`Updated ${Object.keys(anchors).length} actors and ${models.length} assets (${(models.reduce((n,m)=>n+m.bytes,0)/1024/1024).toFixed(1)} MiB).`);

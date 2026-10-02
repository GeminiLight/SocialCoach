import { Bone, BufferGeometry, Float32BufferAttribute, MathUtils, Matrix4, MeshBasicMaterial, Skeleton, Uint16BufferAttribute, type SkinnedMesh } from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { profileAt, silhouette, type Ring } from './avatar';

export const shoulderHeight = .62;
export const elbowLength = .49;
export const headPivot = .855;
export const headCenter = 1.11;
export const portraitScale = .72;
export const shoulderWidth = (feminine:boolean) => feminine ? .424 : .458;

export function jacketProfile(feminine:boolean):Ring[] {
  return [[-.35,.305,.205,0],[-.2,.319,.216,0],[0,.325,.222,0],[.23,.338,.232,0],
    [.44,feminine?.345:.365,.234,0],[.59,feminine?.398:.433,.216,-.008],
    [.685,.32,.167,-.016],[.755,.15,.117,-.012]];
}

const smooth = (a:number,b:number,v:number) => MathUtils.smoothstep(v,a,b);
const blend = (a:number,b:number,k:number) => {
  const h=Math.max(k-Math.abs(a-b),0)/k;
  return Math.min(a,b)-h*h*k*.25;
};

/** Material/geometry refreshes must not turn the current animated pose into a bind pose. */
export function bindRestPose(mesh:SkinnedMesh,skeleton:Skeleton) {
  mesh.bind(skeleton,new Matrix4());
}

/** A continuous tailored shell, including the armholes, upper sleeves and elbows.
 * Surface extraction happens once at mount; only skeleton matrices animate per frame.
 */
export function garmentGeometry(feminine:boolean) {
  const profile=jacketProfile(feminine), shoulder=shoulderWidth(feminine);
  const material=new MeshBasicMaterial();
  const surface=new MarchingCubes(64,material,false,false,35000);
  surface.isolation=0;
  const sx=.84,sy=.76,sz=.36,cy=.235;
  // Cache one cross section per field row, rather than resampling the profile per voxel.
  const rows=Array.from({length:64},(_,i)=>{
    const y=(i/32-1)*sy+cy;
    return { y, body:profileAt(profile,y/1.07) };
  });
  const bodyDistance=(x:number,y:number,z:number,row:Ring)=>{
    const [,w,d,offset=0]=row;
    const side=(Math.hypot(x/w,(z-offset)/d)-1)*Math.min(w,d);
    const neckline=.755*1.07-(feminine?.09*Math.min(1,Math.max(0,z/.18))**2:0);
    return Math.max(side,-.35*1.07-y,y-neckline);
  };
  const armDistance=(x:number,y:number,z:number)=>{
    const down=shoulderHeight-y, t=MathUtils.clamp(down/.84,0,1);
    const radius=.134-.066*t+.009*Math.sin(t*Math.PI);
    const depth=.143-.070*t;
    const centerZ=.008+smooth(.25,.83,down)*.09;
    const radial=(Math.hypot((Math.abs(x)-shoulder)/radius,(z-centerZ)/depth,Math.max(0,(y-shoulderHeight+.045)/.155))-1)*radius;
    // Rounded sleeve crown is fused into the shoulder, not capped by a separate ball.
    return Math.max(radial,y-(shoulderHeight+.105),shoulderHeight-.835-y);
  };
  for(let z=0;z<64;z++)for(let y=0;y<64;y++)for(let x=0;x<64;x++){
    const px=(x/32-1)*sx,pz=(z/32-1)*sz,py=rows[y].y;
    surface.field[x+y*64+z*4096]=-blend(bodyDistance(px,py,pz,rows[y].body),armDistance(px,py,pz),.025);
  }
  surface.update();
  const raw=new BufferGeometry();
  raw.setAttribute('position',new Float32BufferAttribute(surface.positionArray.slice(0,surface.count*3),3));
  // Normals from the shared scalar field keep the sleeve/torso join smooth.
  raw.setAttribute('normal',new Float32BufferAttribute(surface.normalArray.slice(0,surface.count*3),3));
  raw.scale(sx,sy,sz);raw.translate(0,cy,0);
  const g=mergeVertices(raw,1e-5);raw.dispose();surface.geometry.dispose();material.dispose();
  const position=g.getAttribute('position'),indices:number[]=[],weights:number[]=[],uv:number[]=[];
  for(let i=0;i<position.count;i++){
    const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
    const body=bodyDistance(x,y,z,profileAt(profile,y/1.07)),arm=armDistance(x,y,z);
    // Blend across the actual armhole. Below it, the sleeve is fully on the arm rig.
    const attachment=1-(1-smooth(.29,shoulder-.025,Math.abs(x)))*smooth(.15,.5,y);
    const armWeight=smooth(-.016,.016,body-arm)*attachment;
    const forearm=1-smooth(shoulderHeight-elbowLength-.105,shoulderHeight-elbowLength+.105,y);
    const upper=x<0?1:3,lower=x<0?2:4;
    indices.push(0,upper,lower,0);weights.push(1-armWeight,armWeight*(1-forearm),armWeight*forearm,0);
    uv.push(x*2,y*2+z*.2);
  }
  g.setAttribute('skinIndex',new Uint16BufferAttribute(indices,4));
  g.setAttribute('skinWeight',new Float32BufferAttribute(weights,4));
  g.setAttribute('uv',new Float32BufferAttribute(uv,2));
  g.computeBoundingSphere();return g;
}

export function garmentRig(feminine:boolean) {
  const root=new Bone(),left=new Bone(),leftForearm=new Bone(),right=new Bone(),rightForearm=new Bone();
  left.position.set(-shoulderWidth(feminine),shoulderHeight,.008);
  right.position.set(shoulderWidth(feminine),shoulderHeight,.008);
  leftForearm.position.set(0,-elbowLength,.023);rightForearm.position.copy(leftForearm.position);
  root.add(left,right);left.add(leftForearm);right.add(rightForearm);root.updateMatrixWorld(true);
  return {root,left,leftForearm,right,rightForearm,skeleton:new Skeleton([root,left,leftForearm,right,rightForearm])};
}

/** The face and neck share vertices; the lower neck stays anchored inside the collar. */
export function bindPortrait(geometry:BufferGeometry) {
  geometry.scale(portraitScale,portraitScale,portraitScale);geometry.translate(0,headCenter,.01);
  const positions=geometry.getAttribute('position'),indices:number[]=[],weights:number[]=[];
  for(let i=0;i<positions.count;i++){
    const head=smooth(.745,.86,positions.getY(i));
    indices.push(0,1,0,0);weights.push(1-head,head,0,0);
  }
  geometry.setAttribute('skinIndex',new Uint16BufferAttribute(indices,4));
  geometry.setAttribute('skinWeight',new Float32BufferAttribute(weights,4));
  return geometry;
}

export function portraitRig() {
  const root=new Bone(),head=new Bone();head.position.set(0,headPivot,0);root.add(head);root.updateMatrixWorld(true);
  return {root,head,skeleton:new Skeleton([root,head])};
}

export function trouserGeometry() {
  const geometry=silhouette([
    [-1.31,.088,.101,.019],[-1.15,.094,.109,.010],[-.94,.106,.118,.010],
    [-.74,.112,.128,.014],[-.62,.116,.137,.012],[-.49,.124,.143,.010],
    [-.26,.143,.158,0],[-.06,.157,.169,0],[.045,.151,.156,0],
  ],40,undefined,8);
  const position=geometry.getAttribute('position'),indices:number[]=[],weights:number[]=[];
  for(let i=0;i<position.count;i++){
    const shin=1-smooth(-.765,-.475,position.getY(i));
    indices.push(0,1,0,0);weights.push(1-shin,shin,0,0);
  }
  geometry.setAttribute('skinIndex',new Uint16BufferAttribute(indices,4));
  geometry.setAttribute('skinWeight',new Float32BufferAttribute(weights,4));return geometry;
}

export function trouserRig() {
  const root=new Bone(),shin=new Bone();shin.position.set(0,-.62,.01);root.add(shin);root.updateMatrixWorld(true);
  return {root,shin,skeleton:new Skeleton([root,shin])};
}

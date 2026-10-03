import { BufferGeometry, Float32BufferAttribute, Vector3, CatmullRomCurve3, TubeGeometry, SphereGeometry, Matrix4, Quaternion, Color, CanvasTexture, SRGBColorSpace, DataTexture, RepeatWrapping, ShapeUtils, Vector2 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { castAppearance } from './cast';

export type V3 = [number, number, number];
export type Ring = [y: number, width: number, depth: number, z?: number];
/** A shaped, closed cross-section surface. The front is +Z. */
export function silhouette(rings: Ring[], segments = 36, front?: (x:number,y:number,z:number)=>number, subdivisions=4) {
  const positions:number[]=[], indices:number[]=[],uv:number[]=[];
  // Cubic profile sampling avoids visible bands across cheeks and cloth shoulders.
  const original=rings;
  rings=[];
  for(let i=0;i<original.length-1;i++)for(let step=0;step<subdivisions;step++){
    const t=step/subdivisions,a=original[Math.max(0,i-1)],b=original[i],c=original[i+1],d=original[Math.min(original.length-1,i+2)];
    const row:Ring=[b[0]+(c[0]-b[0])*t,0,0,0];
    for(let k=1;k<4;k++){const p0=a[k]??0,p1=b[k]??0,p2=c[k]??0,p3=d[k]??0;row[k]=.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t);}
    rings.push(row);
  }
  rings.push(original.at(-1)!);
  rings.forEach(([y,w,d,offset=0],row)=>{
    for(let j=0;j<=segments;j++) {
      const a=j/segments*Math.PI*2,x=Math.sin(a)*w,z=Math.cos(a)*d+offset;
      positions.push(x,y,front&&Math.cos(a)>0?front(x,y,z):z);
      uv.push(j/segments,row/(rings.length-1));
    }
  });
  for(let i=0;i<rings.length-1;i++)for(let j=0;j<segments;j++){
    const a=i*(segments+1)+j,b=a+segments+1;indices.push(a,a+1,b,a+1,b+1,b);
  }
  // Separate centers keep caps flat, and are hidden inside adjacent anatomical parts.
  const bottom=positions.length/3;positions.push(0,rings[0][0],rings[0][3]??0);
  const top=positions.length/3;positions.push(0,rings.at(-1)![0],rings.at(-1)![3]??0);
  uv.push(.5,0,.5,1);
  for(let j=0;j<segments;j++){indices.push(bottom,j+1,j);const a=(rings.length-1)*(segments+1)+j;indices.push(top,a,a+1);}
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();smoothWrapNormals(geometry,segments,rings.length);return geometry;
}
/** The duplicated UV seam lies on the nose: average its normals to avoid a split face. */
function smoothWrapNormals(g:BufferGeometry,segments:number,rows:number,pole=false) {
  const normals=g.getAttribute('normal'),v=new Vector3();
  for(let row=0;row<rows;row++){
    const first=row*(segments+1),last=first+segments;
    v.set(normals.getX(first)+normals.getX(last),normals.getY(first)+normals.getY(last),normals.getZ(first)+normals.getZ(last)).normalize();
    normals.setXYZ(first,v.x,v.y,v.z);normals.setXYZ(last,v.x,v.y,v.z);
  }
  if(pole)for(let j=0;j<=segments;j++)normals.setXYZ(j,0,1,0);
  normals.needsUpdate=true;
}
/** Subtle skin variation in linear pigment space, with all pigments supplied by CSS. */
export function skinPigment(geometry:BufferGeometry,base:string,shadow:string,warm:string) {
  const position=geometry.getAttribute('position'),colors:number[]=[],skin=new Color(base),shade=new Color(shadow),cheek=new Color(warm),color=new Color();
  for(let i=0;i<position.count;i++){
    const x=position.getX(i),y=position.getY(i),z=position.getZ(i),front=Math.max(0,Math.min(1,z/.2));
    const warmth=Math.exp(-((Math.abs(x)-.16)**2/.003+(y+.075)**2/.003))*.11*front;
    const lower=Math.max(0,-y-.16)*.2,variation=(Math.sin(x*57+y*31)*Math.sin(y*43+z*29)+1)*.003;
    const lipWidth=Math.max(0,1-(x/.072)**2),seam=-.190+.004*(x/.072)**2;
    const vermilion=Math.exp(-(((y-seam)/(.008*Math.sqrt(lipWidth)+.0001))**2))*lipWidth*.36*front;
    color.copy(skin).lerp(shade,Math.min(.06,lower+variation)).lerp(cheek,warmth+vermilion);colors.push(color.r,color.g,color.b);
  }
  geometry.setAttribute('color',new Float32BufferAttribute(colors,3));return geometry;
}
export function faceFeatures(id:string){return castAppearance(id).face;}
const faceProfile:Ring[] = [
  // The nape continues into the collar; there is no detached cylinder under the jaw.
  [-.64,.139,.111,-.048],[-.52,.122,.106,-.051],[-.42,.116,.107,-.048],
  [-.353,.13,.137,-.027],[-.305,.166,.168,-.006],[-.24,.214,.184,-.008],
  [-.15,.248,.204,-.010],[-.07,.267,.219,-.009],
  [.025,.261,.231,-.009],[.125,.246,.237,-.013],[.225,.236,.222,-.018],
  [.31,.201,.187,-.023],[.373,.128,.129,-.025],[.402,.022,.026,-.026],
];
function portraitProfile(id:string):Ring[] {
  const f=faceFeatures(id);
  const feminine=castAppearance(id).feminine;
  const profile=feminine?[
    [-.74,.23,.22,.015],[-.60,.18,.205,.02],[-.50,.128,.13,-.012],...faceProfile.slice(2),
  ] as Ring[]:faceProfile;
  return profile.map(([y,w,d,z])=>[y,w*f.width*(y<-.2?f.jaw:y<.03?f.cheek:y<.31?f.temple:1),d,z]);
}
export function profileAt(rings:Ring[],y:number):Ring {
  let i=rings.findIndex((r,n)=>n<rings.length-1&&y>=r[0]&&y<=rings[n+1][0]);
  if(i<0)i=y<rings[0][0]?0:rings.length-2;
  const a=rings[Math.max(0,i-1)],b=rings[i],c=rings[i+1],d=rings[Math.min(rings.length-1,i+2)];
  const t=Math.max(0,Math.min(1,(y-b[0])/(c[0]-b[0]))),result:Ring=[y,0,0,0];
  for(let k=1;k<4;k++){
    const p0=a[k]??0,p1=b[k]??0,p2=c[k]??0,p3=d[k]??0;
    result[k]=.5*(2*p1+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t);
  }
  return result;
}
function sculptFace(id:string,x:number,y:number,z:number) {
  const f=faceFeatures(id);
  const orbit=Math.exp(-((Math.abs(x)-f.eye)**2/.0022+(y-.025)**2/.0015))*.009;
  const brow=Math.exp(-((Math.abs(x)-f.eye)**2/.003+(y-.083)**2/.0008))*.004;
  const cheek=Math.exp(-((Math.abs(x)-.16)**2/.003+(y+.061)**2/.0025))*.004;
  const muzzle=Math.exp(-(x*x/.005+(y+.18)**2/.003))*.012;
  const chin=Math.exp(-(x*x/.006+(y+.29)**2/.0015))*.005;
  const bridge=Math.exp(-(x*x/.00085+(y+.004)**2/.013))*.029*f.nose;
  const tip=Math.exp(-(x*x/.0009+(y+.092)**2/.0011))*.047*f.nose;
  const wings=Math.exp(-((Math.abs(x)-.033*f.nose)**2/.00022+(y+.113)**2/.00032))*.017;
  const philtrum=Math.exp(-(x*x/.00013+(y+.151)**2/.00055))*.005;
  const chinFold=Math.exp(-(x*x/.004+(y+.226)**2/.0004))*.002;
  const lipArc=Math.max(0,1-(x/(.072*f.mouth))**2),seam=-.190+.004*(x/(.072*f.mouth))**2;
  const lips=lipArc*(Math.exp(-((y-seam-.006)**2)/.000055)*.004+Math.exp(-((y-seam+.008)**2)/.00006)*.005);
  return z-orbit+brow+cheek+muzzle+chin+bridge+tip+wings-philtrum-chinFold+lips;
}
/** Shared by the skin, eyelids, eyebrows and lips so detail follows the cheek surface. */
export function faceSurface(id:string,x:number,y:number) {
  const [,w,d,z=0]=profileAt(portraitProfile(id),y);
  return sculptFace(id,x,y,Math.sqrt(Math.max(0,1-(x/w)**2))*d+z);
}
export function faceGeometry(_mature:boolean,_feminine:boolean,id='') {
  return silhouette(portraitProfile(id),160,(x,y,z)=>sculptFace(id,x,y,z),12);
}
export function curveGeometry(points:V3[],radius=.006,segments=16) {
  return new TubeGeometry(new CatmullRomCurve3(points.map(p=>new Vector3(...p))),segments,radius,5,false);
}
export function polygonGeometry(points:V3[]) {
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(points.flat(),3));
  const indices:number[]=[];for(let i=1;i<points.length-1;i++)indices.push(0,i,i+1);geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
export function clothSurface(rings:Ring[],x:number,y:number) {
  const [,width,depth,z=0]=profileAt(rings,y);
  return z+Math.sqrt(Math.max(0,1-(x/width)**2))*depth;
}
/** Triangulate concave lapels, then subdivide and drape every vertex onto the torso. */
export function drapedPolygonGeometry(points:V3[],rings:Ring[],lift=.005) {
  const positions:number[]=[],indices:number[]=[],outline=points.map(([x,y])=>new Vector2(x,y));
  const push=(a:Vector2,b:Vector2,c:Vector2,level:number)=>{
    const az=clothSurface(rings,a.x,a.y),bz=clothSurface(rings,b.x,b.y),cz=clothSurface(rings,c.x,c.y);
    const samples=[
      [(a.x+b.x+c.x)/3,(a.y+b.y+c.y)/3,(az+bz+cz)/3],
      [(a.x+b.x)/2,(a.y+b.y)/2,(az+bz)/2],
      [(b.x+c.x)/2,(b.y+c.y)/2,(bz+cz)/2],
      [(c.x+a.x)/2,(c.y+a.y)/2,(cz+az)/2],
    ];
    const clips=samples.some(([x,y,z])=>z+lift*.5<clothSurface(rings,x,y));
    if(level<2||(level<6&&clips)){
      const ab=a.clone().add(b).multiplyScalar(.5),bc=b.clone().add(c).multiplyScalar(.5),ca=c.clone().add(a).multiplyScalar(.5);
      push(a,ab,ca,level+1);push(ab,b,bc,level+1);push(ca,bc,c,level+1);push(ab,bc,ca,level+1);return;
    }
    const start=positions.length/3;
    for(const point of [a,b,c])positions.push(point.x,point.y,clothSurface(rings,point.x,point.y)+lift);
    const cross=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
    indices.push(start,...(cross>0?[start+1,start+2]:[start+2,start+1]));
  };
  for(const [a,b,c] of ShapeUtils.triangulateShape(outline,[]))push(outline[a],outline[b],outline[c],0);
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(positions,3));g.setIndex(indices);
  const normals:number[]=[],normal=new Vector3(),h=.0001;
  for(let i=0;i<positions.length;i+=3){
    const x=positions[i],y=positions[i+1];
    normal.set(-(clothSurface(rings,x+h,y)-clothSurface(rings,x-h,y))/(2*h),-(clothSurface(rings,x,y+h)-clothSurface(rings,x,y-h))/(2*h),1).normalize();
    normals.push(normal.x,normal.y,normal.z);
  }
  g.setAttribute('normal',new Float32BufferAttribute(normals,3));return g;
}
export function drapedCurveGeometry(points:V3[],rings:Ring[],radius:number,lift=.013) {
  const outline=new CatmullRomCurve3(points.map(([x,y])=>new Vector3(x,y,0)));
  const fitted=outline.getPoints(48).map(v=>new Vector3(v.x,v.y,clothSurface(rings,v.x,v.y)+lift));
  return new TubeGeometry(new CatmullRomCurve3(fitted),48,radius,5,false);
}
/** An almond aperture, curved to the face. UVs clip the iris at both eyelids. */
export function eyeGeometry(width:number,height:number,id='',centerX=0,centerY=.023) {
  const vertices:number[]=[],uv:number[]=[],indices:number[]=[],columns=40,rows=12;
  const origin=faceSurface(id,centerX,centerY);
  for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){
    const u=col/columns*2-1,v=row/rows,x=u*width,arc=Math.pow(Math.max(0,1-u*u),.7);
    const y=arc*height*(-.72+1.72*v);
    const bulge=(1-u*u)*Math.sin(v*Math.PI)*.004;
    vertices.push(x,y,faceSurface(id,centerX+x,centerY+y)-origin+.0025+bulge);
    uv.push((x/width+1)/2,(y/height+1)/2);
  }
  for(let r=0;r<rows;r++)for(let c=0;c<columns;c++){
    const a=r*(columns+1)+c,b=a+columns+1;indices.push(a,a+1,b,a+1,b+1,b);
  }
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(vertices,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

export function browGeometry(id:string,side:number) {
  const positions:number[]=[],indices:number[]=[],f=faceFeatures(id),origin=faceSurface(id,side*f.eye,.023);
  for(let i=0;i<=28;i++)for(let edge=0;edge<2;edge++){
    const u=i/14-1,x=u*.048,y=.061+(1-u*u)*.009+(edge-.5)*.0065*Math.sqrt(Math.max(0,1-u*u));
    positions.push(x,y,faceSurface(id,side*f.eye+x,.023+y)-origin+.0014);
  }
  for(let i=0;i<28;i++){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}

/** Fine strands follow the scalp UVs, with a broad part and irregular strand widths. */
export function hairTexture(base:string,highlight:string) {
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
  const c=canvas.getContext('2d')!;c.fillStyle=base;c.fillRect(0,0,1024,512);
  c.strokeStyle=highlight;
  for(let i=-32;i<300;i++){
    const x=i*4.1,curl=Math.sin(i*2.17)*9;
    c.globalAlpha=.14+.14*(.5+.5*Math.sin(i*6.71));c.lineWidth=.45+(i%3+3)%3*.35;
    c.beginPath();c.moveTo(x,0);c.bezierCurveTo(x-28,150,x+curl+25,350,x+curl,512);c.stroke();
  }
  const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;texture.anisotropy=4;return texture;
}

/** Scalar height data only; the skin pigment continues to come from CSS. */
export function skinDetailTexture() {
  const size=512,data=new Uint8Array(size*size*4);
  let state=4179;
  for(let i=0;i<size*size;i++){
    state=(Math.imul(state,1664525)+1013904223)>>>0;
    const height=120+(state>>>28);
    data.set([height,height,height,255],i*4);
  }
  const texture=new DataTexture(data,size,size);texture.wrapS=texture.wrapT=RepeatWrapping;
  texture.needsUpdate=true;return texture;
}

/** Painted locally; pupils move under the fixed almond aperture, never over the lids. */
export function eyeTexture(p:{sclera:string;skinShadow:string;iris:string;dark:string;porcelain:string}) {
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=224;
  const c=canvas.getContext('2d')!;
  c.fillStyle=p.sclera;c.fillRect(0,0,512,224);
  const iris=c.createRadialGradient(256,114,24,256,114,94);
  iris.addColorStop(0,p.dark);iris.addColorStop(.4,p.iris);iris.addColorStop(.83,p.iris);iris.addColorStop(1,p.dark);
  c.fillStyle=iris;c.beginPath();c.arc(256,114,94,0,Math.PI*2);c.fill();
  c.strokeStyle=p.porcelain;c.globalAlpha=.08;c.lineWidth=1.4;
  for(let i=0;i<64;i++){const a=i*Math.PI/32;c.beginPath();c.moveTo(256+Math.cos(a)*47,114+Math.sin(a)*47);c.lineTo(256+Math.cos(a)*88,114+Math.sin(a)*88);c.stroke();}
  c.globalAlpha=1;c.fillStyle=p.dark;c.beginPath();c.arc(256,114,34,0,Math.PI*2);c.fill();
  // A broad lid shadow avoids the bright white, staring doll-eye effect.
  const shade=c.createLinearGradient(0,0,0,224);shade.addColorStop(0,p.skinShadow);shade.addColorStop(.55,'transparent');shade.addColorStop(1,'transparent');
  c.globalAlpha=.42;c.fillStyle=shade;c.fillRect(0,0,512,224);c.globalAlpha=.72;
  c.fillStyle=p.porcelain;c.beginPath();c.ellipse(233,78,10,7,-.35,0,Math.PI*2);c.fill();
  c.globalAlpha=.25;c.beginPath();c.arc(277,142,4,0,Math.PI*2);c.fill();
  const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;texture.anisotropy=4;return texture;
}
export function scalpGeometry(_bob:boolean,_swept:boolean,_mature:boolean,id='') {
  const positions:number[]=[],indices:number[]=[],uv:number[]=[],segments=96,rows=40,f=faceFeatures(id),hair=castAppearance(id).hair;
  for(let i=0;i<=rows;i++)for(let j=0;j<=segments;j++){
    const a=j/segments*Math.PI*2,front=Math.cos(a),side=Math.abs(Math.sin(a));
    const blend=Math.max(0,Math.min(1,(front-.18)/.58)),transition=blend*blend*(3-2*blend);
    const fringe=hair.fringe+side*.038+Math.sin(a)*f.part;
    const nape=hair.nape;
    const hem=nape+(fringe-nape)*transition;
    const theta=i/rows*Math.acos(Math.max(-.96,Math.min(.96,hem/.428)));
    // A swept crown with broad carved locks, not a hemispherical helmet or wire strands.
    const sweep=Math.sin(a+.65)*Math.sin(theta)*hair.sweep;
    const locks=Math.sin(a*15+theta*4)*hair.wave*Math.sin(theta);
    const y=Math.cos(theta)*.428+.010+sweep;
    const [,sw,sd,so=0]=profileAt(portraitProfile(id),Math.min(y,.373));
    const crown=y>.373?Math.sqrt(Math.max(0,(.438-y)/(.438-.373))):1;
    const volume=hair.volume;
    const x=Math.sin(a)*(sw+volume+locks)*crown;
    let z=Math.cos(a)*(sd+volume+locks)*crown+so;
    if(front>.15&&y<.395&&y>-.30)z=Math.max(z,faceSurface(id,x,y)+.008);
    positions.push(x,y,z);
    uv.push(j/segments,i/rows);
  }
  for(let i=0;i<rows;i++)for(let j=0;j<segments;j++){const a=i*(segments+1)+j,b=a+segments+1;indices.push(a,b,a+1,a+1,b,b+1);}
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(positions,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();smoothWrapNormals(g,segments,rows+1,true);return g;
}
function ellipsoid(position:V3,scale:V3) {const g=new SphereGeometry(1,24,16);g.applyMatrix4(new Matrix4().compose(new Vector3(...position),new Quaternion(),new Vector3(...scale)));return g;}
/** Fingers are continuous tapered tubes with phalange bends; merge once per pose. */
export function handGeometry(pose:'relaxed'|'cup'|'stem'|'phone'|'open',side=1) {
  const parts:BufferGeometry[]=[ellipsoid([0,-.07,.015],[.061,.087,.032]),ellipsoid([0,-.005,.007],[.047,.068,.033])];
  for(let i=0;i<4;i++){
    const x=(.046-i*.029)*side,length=[.113,.14,.132,.102][i];
    let points:V3[];
    if(pose==='stem')points=i===0?[[x,-.10,.02],[x,-.13,.042],[x-.002*side,-.16,.065],[x-.010*side,-.145,.082]]:[[x,-.10,.02],[x,-.145,.036],[x,-.16,.066],[x-.012*side,-.118,.074]];
    else if(pose==='cup')points=[[x,-.105,.028],[x,-.145,.075],[x-.012*side,-.13,.135],[x-.027*side,-.093,.148]];
    else if(pose==='phone')points=[[x,-.10,.02],[x,-.14,.053],[x,-.131,.09],[x,-.099,.092]];
    else if(pose==='open')points=[[x,-.11,.012],[x*1.18,-.11-length*.48,.01],[x*1.27,-.11-length,.018]];
    else points=[[x,-.11,.014],[x,-.11-length*.5,.031],[x-.006*side,-.11-length,.063]];
    parts.push(curveGeometry(points,i===3?.012:.014,10));parts.push(ellipsoid(points.at(-1)!,[.012,.015,.012]));
  }
  const thumb:V3[]=pose==='stem'?[[.055*side,-.025,.012],[.082*side,-.055,.04],[.064*side,-.10,.07],[.047*side,-.135,.082]]:pose==='cup'?[[.055*side,-.025,.012],[.09*side,-.06,.065],[.07*side,-.075,.118],[.033*side,-.085,.14]]:pose==='phone'?[[.056*side,-.031,.02],[.083*side,-.068,.078],[.038*side,-.078,.106]]:[[.054*side,-.025,.015],[.087*side,-.061,.028],[.093*side,-.109,.045]];
  parts.push(curveGeometry(thumb,.019,12),ellipsoid(thumb.at(-1)!,[.018,.022,.017]));
  const merged=mergeGeometries(parts);parts.forEach(g=>g.dispose());return merged;
}

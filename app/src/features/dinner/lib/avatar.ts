import { BufferGeometry, Float32BufferAttribute, Vector3, CatmullRomCurve3, TubeGeometry, SphereGeometry, Matrix4, Quaternion, Color } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type V3 = [number, number, number];
export type Ring = [y: number, width: number, depth: number, z?: number];
/** A shaped, closed cross-section surface. The front is +Z. */
export function silhouette(rings: Ring[], segments = 36, front?: (x:number,y:number,z:number)=>number) {
  const positions:number[]=[], indices:number[]=[],uv:number[]=[];
  // Cubic profile sampling avoids visible bands across cheeks and cloth shoulders.
  const original=rings;
  rings=[];
  for(let i=0;i<original.length-1;i++)for(let step=0;step<4;step++){
    const t=step/4,a=original[Math.max(0,i-1)],b=original[i],c=original[i+1],d=original[Math.min(original.length-1,i+2)];
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
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
/** Subtle skin variation in linear pigment space, with all pigments supplied by CSS. */
export function skinPigment(geometry:BufferGeometry,base:string,shadow:string,warm:string) {
  const position=geometry.getAttribute('position'),colors:number[]=[],skin=new Color(base),shade=new Color(shadow),cheek=new Color(warm),color=new Color();
  for(let i=0;i<position.count;i++){
    const x=position.getX(i),y=position.getY(i),z=position.getZ(i),front=Math.max(0,Math.min(1,z/.2));
    const warmth=Math.exp(-((Math.abs(x)-.16)**2/.003+(y+.075)**2/.003))*.035*front;
    const lower=Math.max(0,-y-.16)*.2,variation=(Math.sin(x*57+y*31)*Math.sin(y*43+z*29)+1)*.008;
    color.copy(skin).lerp(shade,Math.min(.08,lower+variation)).lerp(cheek,warmth);colors.push(color.r,color.g,color.b);
  }
  geometry.setAttribute('color',new Float32BufferAttribute(colors,3));return geometry;
}
const features:Record<string,{width:number;jaw:number;eye:number;nose:number;mouth:number;brow:number;part:number}>={
  chen:{width:1.035,jaw:1.10,eye:.108,nose:1.10,mouth:1.07,brow:-.004,part:-.028},
  lin:{width:.94,jaw:.96,eye:.103,nose:.91,mouth:1.04,brow:.002,part:.036},
  zhou:{width:.965,jaw:.95,eye:.101,nose:.94,mouth:.96,brow:.004,part:.008},
  aunt:{width:1.015,jaw:1.09,eye:.104,nose:1.02,mouth:1.03,brow:-.002,part:-.014},
  mom:{width:.925,jaw:1.01,eye:.097,nose:.93,mouth:.96,brow:.006,part:.038},
  dad:{width:1.02,jaw:1.05,eye:.106,nose:1.07,mouth:1.02,brow:-.003,part:-.018},
  senior:{width:.985,jaw:1.025,eye:.106,nose:1.0,mouth:1.02,brow:-.001,part:-.03},
  yue:{width:.915,jaw:.91,eye:.101,nose:.87,mouth:.97,brow:.006,part:-.04},
  kai:{width:.98,jaw:.94,eye:.103,nose:.95,mouth:.98,brow:.001,part:.014},
};
export function faceFeatures(id:string){return features[id]??{width:1,jaw:1,eye:.105,nose:1,mouth:1,brow:0,part:0};}
export function faceGeometry(mature:boolean,feminine:boolean,id='') {
  const feature=faceFeatures(id),w=id?feature.width:feminine?.93:1,jaw=id?feature.jaw:mature?1.06:1;
  return silhouette([
    [-.355,.075,.112,.024],[-.333,.13,.154,.023],[-.29,.184*jaw,.181,.011],[-.235,.222*jaw,.195,.003],
    [-.17,.251,.211,0],[-.095,.269,.225,0],[-.035,.269,.23,0],[.035,.257,.232,0],
    [.105,.252,.234,-.003],[.19,.252,.23,-.008],[.27,.232,.212,-.016],[.335,.188,.177,-.02],[.379,.113,.114,-.02],[.398,.018,.024,-.02],
  ].map(([y,x,d,z])=>[y,x*w,d,z] as Ring),48,(x,y,z)=>{
    // Paired orbital depressions are modelled into the face, not added as eye balls.
    const orbit=Math.exp(-((Math.abs(x)-feature.eye)**2/.0015+(y-.024)**2/.0012))*.022;
    const cheek=Math.exp(-((Math.abs(x)-.164)**2/.003+(y+.075)**2/.0025))*.019;
    const muzzle=Math.exp(-(x*x/.004+(y+.195)**2/.003))*.012;
    return z-orbit+cheek+muzzle;
  });
}
export function curveGeometry(points:V3[],radius=.006,segments=16) {
  return new TubeGeometry(new CatmullRomCurve3(points.map(p=>new Vector3(...p))),segments,radius,5,false);
}
export function polygonGeometry(points:V3[]) {
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(points.flat(),3));
  const indices:number[]=[];for(let i=1;i<points.length-1;i++)indices.push(0,i,i+1);geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
export function eyeGeometry(width:number,height:number) {
  const vertices:number[]=[0,0,.01],indices:number[]=[];
  for(let i=0;i<=32;i++){const a=i/32*Math.PI*2,x=Math.cos(a)*width,y=Math.sin(a)*height*(.78+.22*Math.abs(Math.sin(a)));vertices.push(x,y,-Math.abs(x)*.12);}
  for(let i=1;i<=32;i++)indices.push(0,i,i+1);
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function scalpGeometry(bob:boolean,swept:boolean,mature:boolean,id='') {
  const positions:number[]=[],indices:number[]=[],segments=56,rows=20;
  for(let i=0;i<=rows;i++)for(let j=0;j<=segments;j++){
    const a=j/segments*Math.PI*2,front=Math.cos(a),side=Math.abs(Math.sin(a));
    // A forehead hairline, receding temples, covered occiput and cut nape.
    const blend=Math.max(0,Math.min(1,(front-.12)/.38)),transition=blend*blend*(3-2*blend);
    const frontHem=(bob?.205:mature?.208:.18)+side*.043+Math.sin(a)*faceFeatures(id).part;
    const backHem=bob?(id==='aunt'?-.2:id==='yue'?-.34:-.31):-.085;
    const hem=backHem+(frontHem-backHem)*transition+Math.sin(a*9+.8)*.0035*transition;
    const end=Math.acos(Math.max(-.95,Math.min(.95,hem/.412))),theta=(i/rows)*end;
    const wave=swept?Math.sin(a+.7)*Math.sin(theta)*.018:0;
    const y=Math.cos(theta)*.425+.012+wave,x=Math.sin(a)*Math.sin(theta)*(id==='aunt'?.318:.305);
    let z=Math.cos(a)*Math.sin(theta)*.282-.018;
    if(bob&&front<.3){z-=.02*(i/rows);}
    positions.push(x,y,z);
  }
  for(let i=0;i<rows;i++)for(let j=0;j<segments;j++){const a=i*(segments+1)+j,b=a+segments+1;indices.push(a,b,a+1,a+1,b,b+1);}
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function ellipsoid(position:V3,scale:V3) {const g=new SphereGeometry(1,12,8);g.applyMatrix4(new Matrix4().compose(new Vector3(...position),new Quaternion(),new Vector3(...scale)));return g;}
/** Fingers are continuous tapered tubes with phalange bends; merge once per pose. */
export function handGeometry(pose:'relaxed'|'cup'|'stem'|'phone'|'open',side=1) {
  const parts:BufferGeometry[]=[ellipsoid([0,-.07,.015],[.061,.087,.032]),ellipsoid([0,-.005,.007],[.037,.052,.028])];
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

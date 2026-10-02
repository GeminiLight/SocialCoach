import {test} from 'node:test';
import assert from 'node:assert/strict';
import {faceFeatures,faceGeometry,faceSurface,eyeGeometry,scalpGeometry,clothSurface,drapedPolygonGeometry,type Ring,type V3} from '../../src/features/dinner/lib/avatar';
import {scenarios} from '../../src/features/dinner/lib/content';

const cast=scenarios.flatMap(s=>s.characters);
test('all portrait surfaces have finite positions and normals within a small geometry budget',()=>{
  for(const c of cast){
    const mature=['chen','aunt','mom','dad'].includes(c.id);
    for(const g of [faceGeometry(mature,c.hair==='bob',c.id),scalpGeometry(c.hair==='bob',c.hair==='swept',mature,c.id)]){
      assert.ok(g.getAttribute('position').count<32000,c.id);
      for(const name of ['position','normal'])assert.ok(Array.from(g.getAttribute(name).array).every(Number.isFinite),`${c.id}: ${name}`);
      g.dispose();
    }
  }
});
test('front skin seam has continuous lighting rather than a split down the nose',()=>{
  for(const c of cast){
    const g=faceGeometry(false,c.hair==='bob',c.id),normal=g.getAttribute('normal');
    // 160 radial segments plus a duplicate UV seam, then the two cap vertices.
    for(let first=0;first<normal.count-2;first+=161){
      for(const read of ['getX','getY','getZ'] as const)assert.ok(Math.abs(normal[read](first)-normal[read](first+160))<1e-6,c.id);
    }
    g.dispose();
  }
});
test('eye apertures follow each cheek and remain in front of the skin',()=>{
  for(const c of cast)for(const side of [-1,1]){
    const x=side*faceFeatures(c.id).eye,y=.023,g=eyeGeometry(.054,.022,c.id,x,y),position=g.getAttribute('position'),uv=g.getAttribute('uv');
    for(let i=0;i<position.count;i++){
      const depth=faceSurface(c.id,x,y)+position.getZ(i)-faceSurface(c.id,x+position.getX(i),y+position.getY(i));
      assert.ok(depth>=.0024&&depth<.0071,`${c.id}: embedded or floating eye`);
      assert.ok(uv.getX(i)>=0&&uv.getX(i)<=1&&uv.getY(i)>=0&&uv.getY(i)<=1);
    }
    g.dispose();
  }
});
test('hair stays outside the forehead instead of revealing jagged skin through the fringe',()=>{
  for(const c of cast){
    const g=scalpGeometry(c.hair==='bob',c.hair==='swept',['chen','aunt','mom','dad'].includes(c.id),c.id),position=g.getAttribute('position');
    for(let i=0;i<position.count;i++){
      const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
      if(Math.abs(x)<.12&&y>.15&&y<.38&&z>.1)assert.ok(z-faceSurface(c.id,x,y)>.0079,c.id);
    }
    g.dispose();
  }
});

test('shirt fronts and concave lapels stay outside the curved torso at triangle interiors',()=>{
  const rings:Ring[]=[[-.35,.305,.205,0],[-.2,.33,.216,0],[0,.34,.222,0],[.23,.365,.24,0],[.44,.445,.251,0],[.59,.465,.228,-.005],[.685,.37,.19,-.014],[.755,.18,.135,0]];
  const panels:V3[][]=[
    [[-.14,.738,0],[.14,.738,0],[.176,.58,0],[.105,.02,0],[-.105,.02,0],[-.176,.58,0]],
    [[.135,.75,0],[.34,.6,0],[.242,.49,0],[.29,.435,0],[.042,.08,0],[.135,.6,0]],
  ];
  for(const panel of panels){
    const g=drapedPolygonGeometry(panel,rings),v=g.getAttribute('position'),index=g.getIndex()!;
    assert.ok(index.count>0);assert.ok(Array.from(g.getAttribute('normal').array).every(Number.isFinite));
    for(let i=0;i<index.count;i+=3){
      const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);
      const x=(v.getX(a)+v.getX(b)+v.getX(c))/3,y=(v.getY(a)+v.getY(b)+v.getY(c))/3,z=(v.getZ(a)+v.getZ(b)+v.getZ(c))/3;
      assert.ok(z>clothSurface(rings,x,y),'clothing triangle clips inside the chest');
    }
    g.dispose();
  }
});

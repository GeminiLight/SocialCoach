import { useEffect, useMemo } from 'react';
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import type { Palette } from './palette';

/**
 * The family room's blossom painting is the only procedural surface the
 * Blender scenes still draw; every other material ships inside the GLBs.
 * The seed is the generator state the painting used when it was drawn after
 * the retired wood, wall, fabric and rug textures, so the image is unchanged.
 */
const FAMILY_ART_SEED = 3356044913;

// Deterministic and local. Every pigment comes from the CSS palette.
function createFamilyArt(p: Palette) {
  let seed = FAMILY_ART_SEED;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const n = 1024, canvas = document.createElement('canvas'); canvas.width = canvas.height = n;
  const c = canvas.getContext('2d')!;
  c.fillStyle=p.porcelain;c.fillRect(0,0,n,n);
  for(let i=0;i<18000;i++){c.globalAlpha=.035+random()*.035;c.fillStyle=i%3?p.napkin:p.woodEdge;c.fillRect(random()*n,random()*n,1+random()*2,1);}
  c.globalAlpha=1;
  c.strokeStyle=p.woodEdge;
  const branch=(x:number,y:number,tx:number,ty:number,width:number)=>{c.globalAlpha=.64;c.lineWidth=width;c.lineCap='round';c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+(tx-x)*.25,y-40,tx-35,ty+60,tx,ty);c.stroke();};
  branch(70,880,795,218,17);branch(370,613,183,354,7);branch(510,495,846,513,5);branch(637,358,560,137,4);
  for(let i=0;i<65;i++){const a=random(),x=130+a*685+(random()-.5)*130,y=830-a*650+(random()-.5)*135;if(i%4===0)branch(x-12,y+17,x,y,1);c.globalAlpha=.48+random()*.3;c.fillStyle=p.wine;for(let j=0;j<5;j++){const angle=j*Math.PI*.4;c.beginPath();c.ellipse(x+Math.cos(angle)*7,y+Math.sin(angle)*7,6,8,angle,0,Math.PI*2);c.fill();}c.fillStyle=p.brass;c.beginPath();c.arc(x,y,2.4,0,Math.PI*2);c.fill();}
  c.globalAlpha=.4;c.fillStyle=p.red;c.fillRect(858,810,24,34);c.globalAlpha=1;
  const t = new CanvasTexture(canvas); t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping; t.anisotropy = 4;
  return t;
}

/** Built only for the family room and disposed with the scene. */
export function useFamilyArt(p: Palette, enabled: boolean) {
  const texture = useMemo(() => enabled ? createFamilyArt(p) : null, [p, enabled]);
  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}

import { useEffect, useMemo } from 'react';
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import type { Palette } from './palette';

// Deterministic, local surface assets. Every pigment comes from the CSS palette.
function createSurfaces(p: Palette, art:'landscape'|'family'|'none') {
    const make = (size:number, draw:(c:CanvasRenderingContext2D,n:number)=>void, repeat=1) => {
      const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
      draw(canvas.getContext('2d')!,size);
      const t=new CanvasTexture(canvas);t.colorSpace=SRGBColorSpace;
      t.wrapS=t.wrapT=RepeatWrapping;t.repeat.set(repeat,repeat);t.anisotropy=4;
      return t;
    };
    let seed=81;
    const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    const wood=make(512,(c,n)=>{
      c.fillStyle=p.wood;c.fillRect(0,0,n,n);
      for(let i=0;i<240;i++){
        c.globalAlpha=.06+random()*.14;c.strokeStyle=i%4?p.woodEdge:p.napkin;c.lineWidth=.5+random()*1.4;
        const y=random()*n;c.beginPath();c.moveTo(-5,y);
        for(let x=0;x<=n;x+=8)c.lineTo(x,y+Math.sin(x*.018+i)*3+Math.sin(x*.05+i)*1.2);
        c.stroke();
      }
      c.globalAlpha=.16;c.strokeStyle=p.woodEdge;c.lineWidth=1;
      for(let k=1;k<5;k++){c.beginPath();c.ellipse(330,210,k*29,k*4,.04,0,Math.PI*2);c.stroke();}
      c.globalAlpha=1;
    });
    const wall=make(256,(c,n)=>{
      c.fillStyle=p.wall;c.fillRect(0,0,n,n);
      for(let i=0;i<4500;i++){c.globalAlpha=.02+random()*.05;c.fillStyle=i%2?p.napkin:p.woodEdge;c.fillRect(random()*n,random()*n,random()*3+1,1);}
      c.globalAlpha=1;
    },4);
    const fabric=make(128,(c,n)=>{
      c.fillStyle=p.napkin;c.fillRect(0,0,n,n);c.lineWidth=.6;
      for(let i=0;i<n;i+=3){c.globalAlpha=.11;c.strokeStyle=p.porcelain;c.beginPath();c.moveTo(i,0);c.lineTo(i,n);c.stroke();c.globalAlpha=.09;c.strokeStyle=p.woodEdge;c.beginPath();c.moveTo(0,i);c.lineTo(n,i);c.stroke();}
      c.globalAlpha=1;
    },3);
    const rug=make(256,(c,n)=>{
      c.fillStyle=p.wallInset;c.fillRect(0,0,n,n);c.globalAlpha=.14;c.strokeStyle=p.napkin;c.lineWidth=1;
      for(let i=0;i<n;i+=4){c.beginPath();c.moveTo(i,0);c.lineTo(i,n);c.stroke();c.beginPath();c.moveTo(0,i);c.lineTo(n,i);c.stroke();}
      c.globalAlpha=1;
    },4);
    const paper=(c:CanvasRenderingContext2D,n:number)=>{
      c.fillStyle=p.porcelain;c.fillRect(0,0,n,n);
      for(let i=0;i<18000;i++){c.globalAlpha=.035+random()*.035;c.fillStyle=i%3?p.napkin:p.woodEdge;c.fillRect(random()*n,random()*n,1+random()*2,1);}
      c.globalAlpha=1;
    };
    const landscape=art==='landscape'?make(1024,(c,n)=>{
      paper(c,n);
      // Layered ink wash, broken ridge strokes and dry-brush texture on rice paper.
      for(let layer=0;layer<5;layer++){
        const ridge: [number,number][]=[];
        for(let x=-20;x<=n+20;x+=5){const peak=Math.abs(Math.sin(x/n*5.1+layer*.83));ridge.push([x,n*(.38+layer*.115)-peak*n*(.13+layer*.012)-Math.sin(x*.04+layer)*7]);}
        c.globalAlpha=.11+layer*.055;c.fillStyle=layer<3?p.art:p.woodEdge;c.beginPath();c.moveTo(-20,n);ridge.forEach(([x,y])=>c.lineTo(x,y));c.lineTo(n+20,n);c.fill();
        c.globalAlpha=.08;c.strokeStyle=p.woodEdge;c.lineWidth=1.4;c.beginPath();ridge.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();
        for(let i=0;i<460;i++){const at=Math.floor(random()*ridge.length),[x,y]=ridge[at];c.globalAlpha=.025+random()*.06;c.strokeStyle=p.woodEdge;c.lineWidth=.5+random()*1.3;c.beginPath();c.moveTo(x,y+8);c.lineTo(x-12-random()*18,y+18+random()*60);c.stroke();}
      }
      const mist=c.createLinearGradient(0,n*.49,0,n*.86);mist.addColorStop(0,p.porcelain);mist.addColorStop(.5,p.napkin);mist.addColorStop(1,p.porcelain);c.globalAlpha=.26;c.fillStyle=mist;c.fillRect(0,n*.54,n,n*.13);
      const pine=(x:number,y:number,h:number)=>{c.strokeStyle=p.woodEdge;c.lineWidth=2.4;c.globalAlpha=.6;c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+10,y-h*.4,x-7,y-h*.8,x+3,y-h);c.stroke();for(let j=0;j<7;j++){const a=j/7,yy=y-h*(.35+a*.64),w=h*(.17-a*.10);for(let k=0;k<5;k++){c.globalAlpha=.28+random()*.2;c.lineWidth=.6+random();c.beginPath();c.moveTo(x+3,yy);c.lineTo(x-w,yy+7+k*2);c.moveTo(x+3,yy);c.lineTo(x+w*.8,yy+9+k*2);c.stroke();}}};
      pine(178,824,166);pine(220,845,124);pine(831,895,108);
      c.globalAlpha=.35;c.fillStyle=p.red;c.fillRect(865,120,22,30);c.globalAlpha=1;
    }):null;
    const familyArt=art==='family'?make(1024,(c,n)=>{
      paper(c,n);c.strokeStyle=p.woodEdge;
      const branch=(x:number,y:number,tx:number,ty:number,width:number)=>{c.globalAlpha=.64;c.lineWidth=width;c.lineCap='round';c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+(tx-x)*.25,y-40,tx-35,ty+60,tx,ty);c.stroke();};
      branch(70,880,795,218,17);branch(370,613,183,354,7);branch(510,495,846,513,5);branch(637,358,560,137,4);
      for(let i=0;i<65;i++){const a=random(),x=130+a*685+(random()-.5)*130,y=830-a*650+(random()-.5)*135;if(i%4===0)branch(x-12,y+17,x,y,1);c.globalAlpha=.48+random()*.3;c.fillStyle=p.wine;for(let j=0;j<5;j++){const angle=j*Math.PI*.4;c.beginPath();c.ellipse(x+Math.cos(angle)*7,y+Math.sin(angle)*7,6,8,angle,0,Math.PI*2);c.fill();}c.fillStyle=p.brass;c.beginPath();c.arc(x,y,2.4,0,Math.PI*2);c.fill();}
      c.globalAlpha=.4;c.fillStyle=p.red;c.fillRect(858,810,24,34);c.globalAlpha=1;
    }):null;
    const painting=landscape??familyArt??fabric;
    return {wood,wall,fabric,rug,landscape:painting,familyArt:painting};
}

export function useDinnerSurfaces(p: Palette, art:'landscape'|'family'|'none'='landscape') {
  const textures=useMemo(()=>createSurfaces(p,art),[p,art]);
  useEffect(()=>()=>{[...new Set(Object.values(textures))].forEach(t=>t.dispose());},[textures]);
  return textures;
}
export type DinnerSurfaces=ReturnType<typeof useDinnerSurfaces>;

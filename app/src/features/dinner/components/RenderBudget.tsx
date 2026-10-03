import {useEffect,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {nextPixelRatio} from '../lib/renderBudget';

export function RenderBudget({active,onChange}:{active:boolean;onChange:(dpr:number)=>void}) {
  const {viewport,size}=useThree();
  const sample=useRef({seconds:0,frames:0,windows:0,good:0,warmup:1.5});
  const cap=Math.min(window.devicePixelRatio||1,size.width<=600?1.25:1.5);
  useEffect(()=>{if(viewport.dpr>cap)onChange(cap);},[cap,viewport.dpr,onChange]);
  useEffect(()=>{sample.current={seconds:0,frames:0,windows:0,good:0,warmup:1.5};},[active]);
  useFrame((_,dt)=>{
    if(!active)return;
    const s=sample.current;
    if(dt>.15){s.seconds=0;s.frames=0;return;}
    if(s.warmup>0){s.warmup-=dt;return;}
    s.seconds+=dt;s.frames++;
    if(s.seconds<2)return;
    const fps=s.frames/s.seconds;s.seconds=0;s.frames=0;s.windows++;
    s.good=fps>57?s.good+1:0;
    if(fps>57&&s.good<3)return;
    const next=nextPixelRatio(viewport.dpr,fps,cap);
    if(next!==viewport.dpr){onChange(next);s.good=0;}
  });
  return null;
}

/* eslint-disable react-hooks/immutability -- Sampling writes diagnostics on the renderer-owned canvas, outside React state. */
import {useEffect,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {nextPixelRatio} from '../lib/renderBudget';

export function RenderBudget({active,onChange}:{active:boolean;onChange:(dpr:number)=>void}) {
  const {viewport,size,gl}=useThree();
  const sample=useRef({seconds:0,frames:0,windows:0,good:0,warmup:1.5,elapsed:0,times:[] as number[]});
  const cap=Math.min(window.devicePixelRatio||1,size.width<=600?1.25:1.5);
  useEffect(()=>{if(viewport.dpr>cap)onChange(cap);},[cap,viewport.dpr,onChange]);
  useEffect(()=>{sample.current={seconds:0,frames:0,windows:0,good:0,warmup:1.5,elapsed:0,times:[] as number[]};},[active]);
  useFrame((_,dt)=>{
    if(!active)return;
    const s=sample.current;
    s.elapsed+=dt;s.times.push(dt*1000);
    if(s.elapsed>=2){
      const times=s.times.sort((a,b)=>a-b),canvas=gl.domElement;
      canvas.dataset.sceneFps=(s.times.length/s.elapsed).toFixed(1);
      canvas.dataset.sceneFrameP95=times[Math.min(times.length-1,Math.floor(times.length*.95))].toFixed(1);
      canvas.dataset.sceneCalls=String(gl.info.render.calls);canvas.dataset.sceneTriangles=String(gl.info.render.triangles);
      canvas.dataset.sceneGeometries=String(gl.info.memory.geometries);canvas.dataset.sceneTextures=String(gl.info.memory.textures);
      canvas.dataset.sceneDpr=String(viewport.dpr);s.elapsed=0;s.times=[];
    }
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

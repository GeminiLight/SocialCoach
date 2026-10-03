/* Local benchmark instrumentation only; installed by scripts/dinner-perf.mjs. */
import {useEffect,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';

export function DinnerProbe({paused,view}:{paused:boolean;view:string}) {
  const {gl}=useThree();
  const frames=useRef(0),first=useRef(0);
  const state=useRef({paused,view});
  useEffect(()=>{state.current={paused,view};},[paused,view]);
  useFrame(()=>{frames.current++;if(!first.current&&gl.info.render.calls>0)first.current=performance.now();});
  useEffect(()=>{
    const output=document.createElement('output');output.id='dinner-performance';
    Object.assign(output.style,{position:'fixed',top:'210px',right:'14px',zIndex:'1000',fontSize:'11px',whiteSpace:'pre',pointerEvents:'none',color:'var(--dinner-ink)',background:'var(--dinner-paper)',padding:'10px'});
    document.body.append(output);
    let reads=0,writes=0,longTasks=0,longMs=0,last=performance.now();
    const measure=Element.prototype.getBoundingClientRect,write=Storage.prototype.setItem;
    Element.prototype.getBoundingClientRect=function(){reads++;return measure.call(this);};
    Storage.prototype.setItem=function(key,value){writes++;return write.call(this,key,value);};
    const observer=new PerformanceObserver(list=>{for(const entry of list.getEntries()){longTasks++;longMs+=entry.duration;}});
    if(PerformanceObserver.supportedEntryTypes.includes('longtask'))observer.observe({type:'longtask',buffered:true});
    const publish=()=>{
      const now=performance.now(),seconds=(now-last)/1000;
      const scripts=performance.getEntriesByType('resource').filter(entry=>(entry as PerformanceResourceTiming).initiatorType==='script') as PerformanceResourceTiming[];
      const report={...state.current,seconds:+seconds.toFixed(2),fps:+(frames.current/seconds).toFixed(1),drawCalls:gl.info.render.calls,triangles:gl.info.render.triangles,geometries:gl.info.memory.geometries,programs:gl.info.programs?.length,layoutReadsPerSecond:+(reads/seconds).toFixed(1),storageWritesPerSecond:+(writes/seconds).toFixed(1),firstFrameMs:+first.current.toFixed(1),scriptDecodedKB:+(scripts.reduce((sum,r)=>sum+r.decodedBodySize,0)/1024).toFixed(1),longTasks,longMs:+longMs.toFixed(1)};
      output.textContent=JSON.stringify(report,null,2);output.dataset.report=JSON.stringify(report);
      frames.current=0;reads=0;writes=0;last=now;
    };
    const timer=setInterval(publish,3000);
    return()=>{clearInterval(timer);observer.disconnect();output.remove();Element.prototype.getBoundingClientRect=measure;Storage.prototype.setItem=write;};
  },[gl]);
  return null;
}

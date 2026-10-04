'use client';
import {useEffect,useRef,useState,type ReactNode,type CSSProperties} from 'react';
import {pick} from '@/lib/i18n';
import type {Lang} from '@/data/taxonomy';
const KEY='socialcoach.review-split';
const L={resize:{zh:'调整复盘和原话的宽度，左右方向键微调',en:'Resize assessment and transcript; adjust with the left and right arrow keys'}};
const initial=()=>{try{const value=Number(localStorage.getItem(KEY));return value>=24&&value<=48?value:34;}catch{return 34;}};
export function reviewBounds(total:number,sideMin:number,mainMin:number,gap:number){
 if(!Number.isFinite(total)||total<sideMin+mainMin+gap)return {min:34,max:34};
 const min=Math.min(48,Math.max(24,100*sideMin/total)),max=Math.max(24,Math.min(48,100*(total-mainMin-gap)/total));
 return min<=max?{min,max}:{min:34,max:34};
}

export function ReviewSplit({children,aside,lang}:{children:ReactNode;aside:ReactNode;lang:Lang}){
 const container=useRef<HTMLDivElement>(null),dragging=useRef(false),value=useRef(34);
 const [width,setWidth]=useState(initial),[bounds,setBounds]=useState({min:24,max:48});
 useEffect(()=>{
  const el=container.current;if(!el)return;
  const observer=new ResizeObserver(()=>{
   const total=el.clientWidth;if(!total)return;
   const tokens=getComputedStyle(el);
   setBounds(reviewBounds(total,parseFloat(tokens.getPropertyValue('--review-side-min')),parseFloat(tokens.getPropertyValue('--review-main-min')),parseFloat(tokens.getPropertyValue('--review-split-gap'))));
  });observer.observe(el);return()=>observer.disconnect();
 },[]);
 const shown=Math.max(bounds.min,Math.min(bounds.max,width));
 const change=(next:number)=>{const clamped=Math.max(bounds.min,Math.min(bounds.max,next));value.current=clamped;setWidth(clamped);};
 const save=()=>{try{localStorage.setItem(KEY,String(value.current));}catch{/* The current layout remains usable when storage is unavailable. */}};
 return <div ref={container} className="review-split" style={{'--review-side-width':`${shown}%`} as CSSProperties}>
  <div className="review-main">{children}</div>
  <div className="review-divider" role="separator" aria-orientation="vertical" aria-label={pick(L.resize,lang)} aria-valuemin={Math.round(bounds.min)} aria-valuemax={Math.round(bounds.max)} aria-valuenow={Math.round(shown)} tabIndex={0}
   onPointerDown={e=>{if(e.button!==0)return;dragging.current=true;value.current=shown;e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault();}}
   onPointerMove={e=>{if(!dragging.current||!container.current)return;const box=container.current.getBoundingClientRect();change(100*(box.right-e.clientX)/box.width);}}
   onPointerUp={e=>{if(!dragging.current)return;dragging.current=false;save();e.currentTarget.releasePointerCapture(e.pointerId);}}
   onLostPointerCapture={()=>{if(dragging.current){dragging.current=false;save();}}}
   onKeyDown={e=>{const next=e.key==='ArrowLeft'?shown+2:e.key==='ArrowRight'?shown-2:e.key==='Home'?bounds.min:e.key==='End'?bounds.max:undefined;if(next===undefined)return;e.preventDefault();change(next);save();}}><span aria-hidden/></div>
  <aside className="review-aside">{aside}</aside>
 </div>;
}

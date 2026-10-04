'use client';
import {useEffect,useRef} from 'react';
import {Sheet} from '@/components/ui';
import {pick} from '@/lib/i18n';
import type {Session} from '@/lib/types';
import type {Lang} from '@/data/taxonomy';
const L={title:{zh:'完整对话',en:'Full conversation'},you:{zh:'你',en:'You'},focus:{zh:'引用原话',en:'Quoted line'},event:{zh:'现场记录',en:'Scene record'},note:{zh:'按对话顺序保留原话，评价不改写你的发言。',en:'Original words in conversation order. The assessment does not rewrite them.'}};

export function TranscriptReader({session,lang,selection,onClose}:{session:Session;lang:Lang;selection:string|null;onClose:()=>void}){
 const body=useRef<HTMLDivElement>(null),position=useRef(0);
 const focused=session.messages.find(m=>m.role==='learner'&&!!selection&&m.text.includes(selection));
 const focusedId=focused?.id;
 useEffect(()=>{
  if(selection===null)return;
  const frame=requestAnimationFrame(()=>{
   const el=body.current;if(!el)return;
   if(focusedId){el.querySelector<HTMLElement>(`[data-line-id="${CSS.escape(focusedId)}"]`)?.scrollIntoView({block:'center'});}
   else el.scrollTop=position.current;
  });
  return()=>cancelAnimationFrame(frame);
 },[selection,focusedId]);
 return <Sheet open={selection!==null} wide bodyRef={body} onClose={()=>{position.current=body.current?.scrollTop??0;onClose();}} title={pick(L.title,lang)}>
  <p className="text-[13px] text-ink-3 mb-5">{pick(L.note,lang)}</p>
  <ol className="full-transcript">{session.messages.filter(m=>m.role!=='coach').map((m,i)=>{
   const mine=m.role==='learner',character=session.scenario.characters.find(c=>c.id===m.characterId),highlight=m.id===focusedId;
   return <li key={m.id} data-line-id={m.id} className={highlight?'transcript-highlight':undefined}>
    <span className="transcript-index num" aria-hidden>{i+1}</span>
    <div><p className="text-[13px] font-semibold text-ink-2 mb-1">{mine?pick(L.you,lang):character?.name[lang]??pick(L.event,lang)}{highlight&&<span className="ml-3 text-accent-deep">{pick(L.focus,lang)}</span>}</p><p className={`text-[16px] leading-relaxed whitespace-pre-wrap break-words ${m.role==='event'?'italic text-ink-3':mine?'text-ink':'text-ink-2'}`}>{m.text}</p></div>
   </li>;
  })}</ol>
 </Sheet>;
}

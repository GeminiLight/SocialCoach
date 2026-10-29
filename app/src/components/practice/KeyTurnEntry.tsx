'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {RotateCcw,ArrowUpRight} from 'lucide-react';
import {useApp,useLang} from '@/store/useApp';
import {pick} from '@/lib/i18n';
import {keyTurnCheckpoint} from '@/lib/key-turn';
import type {Session} from '@/lib/types';
import {Button} from '../ui';

export const keyTurnCopy={
 title:{zh:'这一句，重来',en:'Try that line again'},
 focus:{zh:'只练一个动作：说清能帮到哪一步',en:'One focus: make the limits of your help clear'},
 intro:{zh:'想试试另一种开口？回到唐悦请你改六页的时刻，换一种回应，再接住她的追问。',en:'Want to try another opening? Return to Tang’s request to fix six slides, respond differently, then handle her follow-up.'},
 original:{zh:'你当时的第一句',en:'Your original first response'},
 expand:{zh:'展开原话',en:'Read the full response'},collapse:{zh:'收起原话',en:'Show less'},
 start:{zh:'试试另一种回应',en:'Try another response'},
 resume:{zh:'继续这次尝试',en:'Continue this attempt'},
 note:{zh:'1轮可回顾，最多4轮；原练习保留，不计评分或能力估计。',en:'Review after 1–4 exchanges. Original practice kept; scores and ability estimates unchanged.'},
 history:{zh:'这句话的重练记录',en:'Attempts at this line'},
 reviewed:{zh:'查看原话与回顾',en:'View words and review'},
 unsaved:{zh:'请先处理页面上的保存提示，再开始重试。',en:'Resolve the save notice on this page before starting.'},
};
export const keyTurnHref=(sessionId:string,id:string)=>`/practice/${encodeURIComponent(sessionId)}/retry/${encodeURIComponent(id)}`;

export function KeyTurnEntry({session}:{session:Session}){
 const lang=useLang(),router=useRouter(),[expanded,setExpanded]=useState(false);
 const start=useApp(s=>s.startKeyTurn),saveIssue=useApp(s=>s.saveIssue);
 const checkpoint=keyTurnCheckpoint(session);
 if(!checkpoint)return null;
 const pending=session.keyTurnAttempts?.find(a=>a.status!=='reviewed');
 const records=session.keyTurnAttempts?.filter(a=>a.status==='reviewed')??[];
 return <section id="key-turn-entry" aria-labelledby="key-turn-title" className="card p-5 sm:p-6 flex flex-col gap-4 scroll-mt-24">
  <div className="flex items-center gap-2 text-action"><RotateCcw size={18} aria-hidden/><h2 id="key-turn-title" className="text-[18px] font-semibold">{pick(keyTurnCopy.title,lang)}</h2></div>
  <div className="rounded-[var(--radius-sm)] bg-inset p-4"><p className="text-[12px] text-ink-2 mb-2">{pick(keyTurnCopy.original,lang)}</p><blockquote id="key-turn-original" className={`text-[16px] leading-relaxed whitespace-pre-wrap break-words ${checkpoint.original.text.length>200&&!expanded?'line-clamp-4':''}`}>“{checkpoint.original.text}”</blockquote>{checkpoint.original.text.length>200&&<button className="press min-h-11 text-[13px] text-action mt-1" aria-controls="key-turn-original" aria-expanded={expanded} onClick={()=>setExpanded(x=>!x)}>{pick(expanded?keyTurnCopy.collapse:keyTurnCopy.expand,lang)}</button>}</div>
  <p className="text-[14px] font-medium">{pick(keyTurnCopy.focus,lang)}</p>
  <Button variant="secondary" disabled={!!saveIssue} onClick={()=>{const id=start(session.id,lang);if(id)router.push(keyTurnHref(session.id,id));}}>{pick(pending?keyTurnCopy.resume:keyTurnCopy.start,lang)}<ArrowUpRight size={17} aria-hidden/></Button>
  <p className="text-[12px] leading-relaxed text-ink-2">{pick(saveIssue?keyTurnCopy.unsaved:keyTurnCopy.note,lang)}</p>
  {!!records.length&&<details><summary className="min-h-11 flex items-center cursor-pointer text-[14px] text-ink-2">{pick(keyTurnCopy.history,lang)} · {records.length}</summary><ul className="flex flex-col gap-1">{[...records].reverse().map((a,i)=><li key={a.id}><Link href={keyTurnHref(session.id,a.id)} className="press min-h-11 flex items-center gap-2 text-action text-[14px]">{records.length-i} · {pick(keyTurnCopy.reviewed,lang)}<ArrowUpRight size={14} aria-hidden/></Link></li>)}</ul></details>}
 </section>;
}

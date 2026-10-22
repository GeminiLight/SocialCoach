'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {RotateCcw,ArrowUpRight} from 'lucide-react';
import {useApp,useLang} from '@/store/useApp';
import {pick} from '@/lib/i18n';
import {keyTurnCheckpoint} from '@/lib/key-turn';
import type {Session} from '@/lib/types';
import {Button} from '../ui';

export const keyTurnCopy={
 title:{zh:'这一句，重来',en:'Try that line again'},
 focus:{zh:'只练一个动作：说清能帮到哪一步',en:'One focus: make the limits of your help clear'},
 intro:{zh:'回到唐悦第一次请你改六页的时刻。换一种回应，接住她的追问，再对照自己的原话。',en:'Return to Tang’s first request to fix six slides. Try another response, handle her follow-up, then compare your own words.'},
 start:{zh:'试试另一种回应',en:'Try another response'},
 resume:{zh:'继续这次短练',en:'Continue this short practice'},
 note:{zh:'建议先接两轮，最多四轮。单独保存，不计入整场评分与能力估计。',en:'Try two exchanges, with room for four. Saved separately from full-practice scores and ability estimates.'},
 history:{zh:'这句话的重练记录',en:'Attempts at this line'},
 reviewed:{zh:'查看原话与回顾',en:'View words and review'},
 unsaved:{zh:'请先处理页面上的保存提示，再开始短练。',en:'Resolve the save notice on this page before starting.'},
};
export const keyTurnHref=(sessionId:string,id:string)=>`/practice/${encodeURIComponent(sessionId)}/retry/${encodeURIComponent(id)}`;

export function KeyTurnEntry({session}:{session:Session}){
 const lang=useLang(),router=useRouter();
 const start=useApp(s=>s.startKeyTurn),saveIssue=useApp(s=>s.saveIssue);
 if(!keyTurnCheckpoint(session))return null;
 const pending=session.keyTurnAttempts?.find(a=>a.status!=='reviewed');
 const records=session.keyTurnAttempts?.filter(a=>a.status==='reviewed')??[];
 return <section id="key-turn-entry" aria-labelledby="key-turn-title" className="card p-5 sm:p-6 flex flex-col gap-4">
  <div className="flex items-center gap-2 text-action"><RotateCcw size={18} aria-hidden/><h2 id="key-turn-title" className="text-[18px] font-semibold">{pick(keyTurnCopy.title,lang)}</h2></div>
  <p className="text-[16px] font-medium">{pick(keyTurnCopy.focus,lang)}</p>
  <p className="text-[14px] leading-relaxed text-ink-2">{pick(keyTurnCopy.intro,lang)}</p>
  <Button variant="secondary" disabled={!!saveIssue} onClick={()=>{const id=start(session.id,lang);if(id)router.push(keyTurnHref(session.id,id));}}>{pick(pending?keyTurnCopy.resume:keyTurnCopy.start,lang)}<ArrowUpRight size={17} aria-hidden/></Button>
  <p className="text-[12px] leading-relaxed text-ink-2">{pick(saveIssue?keyTurnCopy.unsaved:keyTurnCopy.note,lang)}</p>
  {!!records.length&&<details><summary className="min-h-11 flex items-center cursor-pointer text-[14px] text-ink-2">{pick(keyTurnCopy.history,lang)} · {records.length}</summary><ul className="flex flex-col gap-1">{[...records].reverse().map((a,i)=><li key={a.id}><Link href={keyTurnHref(session.id,a.id)} className="press min-h-11 flex items-center gap-2 text-action text-[14px]">{records.length-i} · {pick(keyTurnCopy.reviewed,lang)}<ArrowUpRight size={14} aria-hidden/></Link></li>)}</ul></details>}
 </section>;
}

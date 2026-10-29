'use client';
import Link from 'next/link';
import {pick} from '@/lib/i18n';
import {PRACTICE_INTENT_MAX} from '@/lib/practice-intent';
import type {Session} from '@/lib/types';
import type {Lang} from '@/data/taxonomy';

const L={
 title:{zh:'这次，你想怎么回应？',en:'What would you like to try?'},
 note:{zh:'可以先问清情况、拒绝、协商，也可以改变主意。复盘会区分你的表达和场景原有目标。',en:'You can clarify, refuse, negotiate, or change your mind. The review separates your communication from the scene’s original aims.'},
 optional:{zh:'写下自己的打算（可选）',en:'Your own approach (optional)'},
 placeholder:{zh:'例如：先问清对方需要什么，再决定是否帮忙。',en:'For example: understand the request before deciding whether to help.'},
 role:{zh:'这个身份不适合你？',en:'Does this role fit you?'},
 roleNote:{zh:'这是练习中的角色。身份、关系或可用条件不符合你的处境时，可以换题。',en:'This is a practice role. Choose another scene if the relationship, authority or resources do not fit your situation.'},
 uncertain:{zh:'目前的背景还不足以确认角色是否适合，请先看身份和条件。',en:'Your background does not establish role fit yet. Check the role and conditions first.'},
 change:{zh:'换一个场景',en:'Choose another scene'},real:{zh:'排练我的真实处境',en:'Rehearse my situation'},
};
const choices=[
 {zh:'先问清楚，再决定',en:'Clarify before deciding'},
 {zh:'说清我的边界',en:'State my boundary'},
 {zh:'协商双方能接受的安排',en:'Negotiate a workable arrangement'},
 {zh:'尝试修复关系',en:'Try to repair the relationship'},
];

export function PracticeSetup({session,lang,value,onChange}:{session:Session;lang:Lang;value:string;onChange:(value:string)=>void}){
 return <section className="card p-4 flex flex-col gap-3" aria-labelledby="practice-intent-title">
  <h2 id="practice-intent-title" className="text-[16px] font-semibold">{pick(L.title,lang)}</h2>
  <p className="text-[13px] text-ink-2 leading-relaxed">{pick(L.note,lang)}</p>
  {session.retrieval?.roleFit?.fit==='uncertain'&&<p className="inset p-3 text-[13px] leading-relaxed text-ink-2">{pick(L.uncertain,lang)}</p>}
  <div className="flex flex-wrap gap-2">{choices.map((choice,i)=><button key={i} type="button" aria-pressed={value===pick(choice,lang)} onClick={()=>onChange(value===pick(choice,lang)?'':pick(choice,lang))} className="press rounded-full border border-line-strong px-3 min-h-11 text-[13px] text-ink-2 aria-pressed:bg-accent-soft aria-pressed:text-accent-deep">{pick(choice,lang)}</button>)}</div>
  <label htmlFor="practice-intent" className="text-[13px] text-ink-2">{pick(L.optional,lang)}</label>
  <textarea id="practice-intent" value={value} onChange={e=>onChange(e.target.value)} maxLength={PRACTICE_INTENT_MAX} rows={2} placeholder={pick(L.placeholder,lang)} className="w-full rounded-[var(--radius-sm)] border border-line-strong bg-inset px-3 py-2 text-[14px] leading-relaxed text-ink" />
  <details className="dotted pt-3">
   <summary className="cursor-pointer min-h-11 text-[14px] text-ink-2">{pick(L.role,lang)}</summary>
   <p className="text-[13px] text-ink-2 leading-relaxed">{pick(session.retrieval?.roleFit?.fit==='uncertain'?L.uncertain:L.roleNote,lang)}</p>
   <div className="flex flex-wrap gap-4 pt-2 text-[14px] text-accent-deep"><Link className="min-h-11 inline-flex items-center underline underline-offset-4" href={`/arena?context=${session.scenario.context}`}>{pick(L.change,lang)}</Link><Link className="min-h-11 inline-flex items-center underline underline-offset-4" href="/rehearse">{pick(L.real,lang)}</Link></div>
  </details>
 </section>;
}

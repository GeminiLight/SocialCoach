'use client';
import {useRef,useState,useSyncExternalStore} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowRight,Share2} from 'lucide-react';
import dynamic from 'next/dynamic';
import {Button} from '@/components/ui';
import {BrandMark} from '@/components/BrandMark';
import {ModelAccessNotice} from '@/components/ModelAccessNotice';
import {useApp} from '@/store/useApp';
import {pick} from '@/lib/i18n';
import type {Lang} from '@/data/taxonomy';
import {buildChallengeSession,challengePath,challengePublic,challengeUrl,inviteCopy,pendingChallenge,inviteDestination} from '@/lib/challenge';
import {track} from '@/lib/analytics/track';

const InviteCard=dynamic(()=>import('./InviteCard').then(m=>m.InviteCard),{ssr:false});
const L={
 title:{zh:'朋友邀你来接这一句',en:'A friend invites you to try'},
 you:{zh:'你在这场对话里',en:'Your part in the conversation'},
 goal:{zh:'试着做到',en:'What to work on'},start:{zh:'我来试试',en:'Let me try'},resume:{zh:'继续我的这场挑战',en:'Continue my challenge'},
 privacy:{zh:'不用注册。开始后，练习记录只保存在这台设备上，朋友看不到你的回答。',en:'No sign-up needed. Once you start, your practice stays on this device. Your friend cannot see your answers.'},
 busy:{zh:'正在打开你的练习…',en:'Opening your practice…'},
 source:{zh:'公共虚构场景 · SocialCoach 原创 · 2026-10-03',en:'Fictional public scene · SocialCoach original · 2026-10-03'},
 invite:{zh:'我也想邀请朋友',en:'Invite another friend'},fallback:{zh:'换个入口打开同一题',en:'Open this scene on the other site'},
 blocked:{zh:'请先处理上方的保存提示，再开始挑战。',en:'Resolve the storage notice above before starting.'},
};
export function ChallengeLanding({lang}:{lang:Lang}) {
 const destination=useSyncExternalStore(()=>()=>{},()=>inviteDestination(window.location.hostname),()=> 'main' as const);
 const router=useRouter(),starting=useRef(false),[opening,setOpening]=useState(false),[showInvite,setShowInvite]=useState(false);
 const hydrated=useApp(s=>s.hydrated),saveIssue=useApp(s=>s.saveIssue),sessions=useApp(s=>s.sessions);
 const pending=hydrated?pendingChallenge(sessions,lang):undefined,p=challengePublic(lang),text=(k:keyof typeof L)=>pick(L[k],lang);
 const start=()=>{
  const state=useApp.getState();if(starting.current||!state.hydrated||state.saveIssue||state.storageIssue)return;
  starting.current=true;setOpening(true);
  // The same blank visitor profile as the welcome screen; no personal form or model adaptation.
  if(!state.profile)state.setProfile({name:'',bio:'',goals:['communication'],contexts:[],lang,createdAt:Date.now()});
  state.setLang(lang);
  const existing=pendingChallenge(state.sessions,lang);
  if(existing){router.push(`/practice/${existing.id}`);return;}
  const session=buildChallengeSession(lang);session.status='active';
  state.addSession(session);
  track({name:'session_start',ts:session.startedAt,session:session.id,scenario:session.scenario.id,origin:'arena',context:session.scenario.context,difficulty:session.scenario.difficulty,timed:false,wait_s:0});
  router.push(`/practice/${session.id}`);
 };
 return <main id="challenge-landing" lang={lang} className="min-h-dvh pt-safe pb-safe px-5 py-6 lg:py-10 mx-auto max-w-[var(--form-max)]">
  <header className="flex flex-wrap items-center justify-between gap-3 mb-8">
   <Link href="/" className="press flex items-center gap-2 min-h-11"><BrandMark size={30}/><span className="display text-[20px]">SocialCoach</span></Link>
   <nav aria-label={pick({zh:'语言',en:'Language'},lang)} className="flex gap-2">{(['zh','en'] as const).map(l=><Link href={challengePath(l)} key={l} aria-current={lang===l?'page':undefined} className="press min-h-11 px-3 inline-flex items-center text-[13px] rounded-[var(--radius-sm)] aria-[current=page]:bg-inset">{l==='zh'?'中文':'English'}</Link>)}</nav>
  </header>
  <p className="eyebrow mb-3">{text('title')}</p>
  <h1 className="display text-[34px] lg:text-[44px] leading-tight mb-6">{pick(inviteCopy.question,lang)}</h1>
  <section className="card p-5 lg:p-7 mb-7" aria-label={p.title}>
   <p className="text-[13px] text-accent-deep font-medium mb-4">{p.npc} · {p.npcRole}</p>
   <blockquote className="text-[22px] lg:text-[28px] leading-relaxed font-medium">“{p.opening}”</blockquote>
  </section>
  <section className="mb-6"><h2 className="text-[14px] text-ink-2 mb-2">{text('you')} · {p.role}</h2><p className="text-base leading-relaxed">{p.background}</p></section>
  <section className="mb-7"><h2 className="text-[14px] text-ink-2 mb-3">{text('goal')}</h2><ul className="flex flex-col gap-2">{p.objectives.map((o,i)=><li key={o} className="flex items-start gap-3 text-[15px] leading-relaxed"><span className="num text-accent-deep">0{i+1}</span>{o}</li>)}</ul></section>
  <ModelAccessNotice className="mb-4"/>
  <Button requiresModel block size="lg" onClick={start} disabled={!hydrated||!!saveIssue||opening}>{opening?text('busy'):pending?text('resume'):text('start')}<ArrowRight size={18} aria-hidden/></Button>
  {saveIssue&&<p role="alert" className="text-[14px] text-danger mt-3">{text('blocked')}</p>}
  <p className="text-[13px] text-ink-2 leading-relaxed mt-4">{text('privacy')}</p>
  <p className="text-[12px] text-ink-3 leading-relaxed mt-3">{pick(inviteCopy.note,lang)}</p>
  <div className="flex flex-wrap gap-x-5 gap-y-2 mt-7">
   <Button variant="ghost" onClick={()=>setShowInvite(true)}><Share2 size={16} aria-hidden/>{text('invite')}</Button>
   <a href={challengeUrl(lang,destination==='studio'?'main':'studio')} target="_blank" rel="noopener noreferrer" className="press inline-flex min-h-11 items-center text-[13px] text-action">{text('fallback')} ↗</a>
  </div>
  <p className="text-[12px] text-ink-3 mt-6">{text('source')} · v1</p>
  {showInvite&&<InviteCard lang={lang} onClose={()=>setShowInvite(false)}/>}
 </main>;
}

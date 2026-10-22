'use client';
import {InviteEntry} from "@/components/challenge/InviteEntry";
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowLeft,ArrowUpRight,RotateCcw,Send} from 'lucide-react';
import {useApp,useLang} from '@/store/useApp';
import {pick} from '@/lib/i18n';
import {uid} from '@/lib/format';
import {assessStream,parseRoleplay,roleplayStream} from '@/lib/client-api';
import {keyTurnCheckpoint,keyTurnMessages,keyTurnObservations,keyTurnPending,keyTurnTurns,canReviewKeyTurn,KEY_TURN_LIMIT} from '@/lib/key-turn';
import {useSessionDraft} from '@/lib/use-session-draft';
import type {ChatMessage,KeyTurnAttempt,Session} from '@/lib/types';
import {Shell} from '../Shell';
import {Button,Spinner} from '../ui';
import {SlowModelNotice} from '../SlowModelNotice';
import {TranscriptReader} from './TranscriptReader';
import {keyTurnCopy,keyTurnHref} from './KeyTurnEntry';

const L={
 back:{zh:'返回原场复盘',en:'Back to the original review'},
 setup:{zh:'回到这个时刻',en:'Back to this moment'},
 context:{zh:'保留原来的身份与背景。从第一次回应重来，后面发生的事不带入这次尝试。',en:'Your original role and background stay the same. Replay your first response; later events are not part of this attempt.'},
 you:{zh:'你',en:'You'},input:{zh:'这次，你怎么回应？',en:'How would you respond this time?'},
 placeholder:{zh:'说清自己的限制，也可以先问清需要做什么……',en:'State your limit, or first ask what the task involves…'},
 send:{zh:'接这一句',en:'Send your response'},replying:{zh:'唐悦正在回应你的这句话…',en:'Tang is responding to your words…'},
 paused:{zh:'你的话已保留，继续获取对方回复。',en:'Your words are saved. Resume the other side’s reply.'},
 retry:{zh:'重新获取回复',en:'Retry the reply'},stop:{zh:'暂停等待',en:'Pause waiting'},
 review:{zh:'看看这次的表达',en:'Review this attempt'},reviewing:{zh:'正在核对这次尝试的原话…',en:'Checking the words from this attempt…'},
 retryReview:{zh:'生成这次回顾',en:'Review this attempt'},continue:{zh:'继续接招',en:'Keep responding'},
 checkpoint:{zh:'已经接了两轮。可以看看这次的表达，也可以再接两轮。',en:'Two exchanges complete. Review your words now, or try two more.'},
 cap:{zh:'四轮已完成。把这次的表达看清楚，再决定要不要换一种开口。',en:'Four exchanges complete. Review this attempt, then decide whether to try a different opening.'},
 compare:{zh:'同一个开场，两次回应',en:'One opening, two responses'},before:{zh:'原场第一次回应',en:'Original first response'},after:{zh:'这次第一次回应',en:'This attempt’s first response'},
 same:{zh:'两次开口相同。接下来的回应仍可能不同，可以在完整对话里查看。',en:'Your opening words are the same. The following exchanges may still differ; read them in the full conversation.'},
 compareNote:{zh:'先看你表达的范围、时间和责任有哪些变化。这里不据此判断整体能力提升。',en:'Notice changes in scope, timing and responsibility. This comparison does not estimate an overall ability gain.'},
 observations:{zh:'这次尝试的观察',en:'Observations from this attempt'},empty:{zh:'目前没有足够的原话证据支持单项观察，你仍可以查看完整对话。',en:'There is not enough quoted evidence for a focused observation. You can still read the full conversation.'},
 estimated:{zh:'以上为模型对这次模拟的判断。局部重试不会改变原场评分或能力估计。',en:'These are model judgments about this simulation. This attempt does not change your original score or ability estimate.'},
 transcript:{zh:'查看这次完整对话',en:'Read this attempt’s full conversation'},new:{zh:'再换一种开口',en:'Try a different opening'},
 saved:{zh:'草稿已保存在当前标签页',en:'Draft saved in this tab'},unsaved:{zh:'草稿暂未保存，请保留此页面',en:'Draft not saved; keep this page open'},
 changed:{zh:'记录已更新或暂时无法保存。请处理保存提示后重新打开这次尝试。',en:'The record changed or could not be saved. Resolve any save notice, then reopen this attempt.'},
 failed:{zh:'这次没有完成，记录已保留，请重试。',en:'This request did not complete. Your record is retained; please retry.'},
 pausedReview:{zh:'这次尝试已保留，可以稍后继续生成回顾。',en:'Your attempt is saved. You can resume its review later.'},
 leave:{zh:'可以随时返回。已发送的对话会保留，下次从这里继续。',en:'You can return at any time. Sent messages are saved so you can pick up here later.'},
 source:{zh:'看看我原来怎么说',en:'See my original response'},
};

export function KeyTurnPractice({session,attempt}:{session:Session;attempt:KeyTurnAttempt}){
 const lang=useLang(),router=useRouter();
 const text=useCallback((k:keyof typeof L)=>pick(L[k],lang),[lang]);
 const saveIssue=useApp(s=>s.saveIssue),profile=useApp(s=>s.profile);
 const [draft,setDraft,draftSaved]=useSessionDraft(`retry-${attempt.id}`);
 const [busy,setBusy]=useState<'reply'|'review'|null>(null),[error,setError]=useState<string|null>(null);
 const [preview,setPreview]=useState<ChatMessage[]>([]),[selection,setSelection]=useState<{source:Session;quote:string}|null>(null);
 const request=useRef<AbortController|null>(null),input=useRef<HTMLTextAreaElement>(null),latest=useRef<HTMLDivElement>(null),reviewHeading=useRef<HTMLHeadingElement>(null),previousBusy=useRef(busy);
 const checkpoint=keyTurnCheckpoint(session)!;
 const npc=session.scenario.characters.find(c=>c.id===checkpoint.prefix[0].characterId)!;
 const pending=keyTurnPending(attempt),turns=keyTurnTurns(attempt);
 const originalHref=`/practice/${encodeURIComponent(session.id)}#key-turn-entry`;
 const branchView:Session={...session,messages:keyTurnMessages(session,attempt),keyTurnAttempts:undefined,report:attempt.report};
 const current=useCallback(()=>useApp.getState().sessions.find(s=>s.id===session.id)?.keyTurnAttempts?.find(a=>a.id===attempt.id),[session.id,attempt.id]);
 const commit=useCallback((a:KeyTurnAttempt,patch:Parameters<ReturnType<typeof useApp.getState>['changeKeyTurn']>[3])=>useApp.getState().changeKeyTurn(session.id,a.id,a.revision,patch),[session.id]);

 useEffect(()=>{
  const pause=()=>{request.current?.abort();request.current=null;setBusy(null);setPreview([]);};
  window.addEventListener('pagehide',pause);
  return()=>{window.removeEventListener('pagehide',pause);request.current?.abort();request.current=null;};
 },[attempt.id]);
 useEffect(()=>{if(attempt.messages.length||busy)latest.current?.scrollIntoView({block:'nearest',behavior:'instant'});},[attempt.messages.length,busy]);
 useEffect(()=>{
  if(previousBusy.current==='reply'&&!busy&&!pending)input.current?.focus({preventScroll:true});
  if(previousBusy.current==='review'&&attempt.status==='reviewed'){
   reviewHeading.current?.focus({preventScroll:true});
   reviewHeading.current?.scrollIntoView({block:'start',behavior:'instant'});
  }
  previousBusy.current=busy;
 },[busy,pending,attempt.status]);

 const stop=()=>{request.current?.abort();request.current=null;setPreview([]);setBusy(null);setError(text(busy==='review'?'pausedReview':'paused'));};
 const reply=useCallback(async()=>{
  if(request.current||saveIssue)return;
  let live=current();if(!live||live.status!=='active')return;
  if(!keyTurnPending(live)){
   const value=draft.trim();if(!value||keyTurnTurns(live)>=KEY_TURN_LIMIT)return;
   if(!commit(live,{messages:[...live.messages,{id:uid(),role:'learner',text:value,ts:Date.now()}]})){setError(text('changed'));return;}
   setDraft('');live=current()!;
  }
  const snapshot=live,controller=new AbortController();request.current=controller;setBusy('reply');setError(null);
  try{
   const full=await roleplayStream({practiceMode:'key-turn',scenario:session.scenario,learnerCharacterId:session.learnerCharacterId,messages:keyTurnMessages(session,snapshot),lang:snapshot.lang,learnerName:profile?.name},raw=>{
    if(controller.signal.aborted)return;
    const parsed=parseRoleplay(raw,[npc.id]);
    setPreview(parsed.utterances.map((u,i)=>({id:`preview-${i}`,role:'npc',characterId:u.characterId,text:u.text,ts:Date.now()})));
   },controller.signal);
   controller.signal.throwIfAborted();
   const parsed=parseRoleplay(full,[npc.id]);if(parsed.error||!parsed.utterances.length)throw new Error(parsed.error||text('failed'));
   const messages:ChatMessage[]=parsed.utterances.map(u=>({id:uid(),role:'npc',characterId:u.characterId,text:u.text,ts:Date.now()}));
   if(parsed.meta)messages[messages.length-1].meta=parsed.meta;
   if(!commit(snapshot,{messages:[...snapshot.messages,...messages]}))setError(text('changed'));
  }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:text('failed'));}
  finally{if(request.current===controller){request.current=null;setBusy(null);setPreview([]);}}
 },[saveIssue,current,commit,draft,setDraft,text,session,npc.id,profile]);

 const review=useCallback(async()=>{
  if(request.current||saveIssue)return;
  let live=current();if(!live||live.status==='reviewed'||keyTurnPending(live)||!keyTurnTurns(live))return;
  if(live.status==='active'){
   if(!commit(live,{status:'ended',endedAt:Date.now()})){setError(text('changed'));return;}
   live=current()!;
  }
  const snapshot=live,controller=new AbortController();request.current=controller;setBusy('review');setError(null);
  try{
   const report=await assessStream({practiceMode:'key-turn',scenario:session.scenario,learnerCharacterId:session.learnerCharacterId,messages:keyTurnMessages(session,snapshot),lang:snapshot.lang,goals:['communication'],learnerName:profile?.name},()=>{},controller.signal);
   controller.signal.throwIfAborted();
   if(!commit(snapshot,{status:'reviewed',report}))setError(text('changed'));
  }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:text('failed'));}
  finally{if(request.current===controller){request.current=null;setBusy(null);}}
 },[saveIssue,current,commit,text,session,profile]);

 return <Shell><main id="key-turn-practice" className="px-5 pt-6 lg:px-10 lg:pt-10 mx-auto max-w-[var(--form-max)]">
  <Link href={originalHref} className="press inline-flex items-center gap-2 min-h-11 text-[14px] text-ink-2"><ArrowLeft size={16} aria-hidden/>{text('back')}</Link>
  <header className="pt-5 pb-7 flex flex-col gap-3"><p className="eyebrow text-ink-2">{pick(session.scenario.title,lang)}</p><h1 className="display text-[30px] sm:text-[36px]">{pick(keyTurnCopy.title,lang)}</h1><p className="text-[17px] font-medium">{pick(keyTurnCopy.focus,lang)}</p><p className="text-[13px] leading-relaxed text-ink-2">{pick(keyTurnCopy.note,lang)}</p></header>
  {attempt.status==='reviewed'?<div className="flex flex-col gap-7">
   <section aria-labelledby="retry-comparison"><h2 ref={reviewHeading} tabIndex={-1} id="retry-comparison" className="text-[19px] font-semibold mb-4 scroll-mt-6">{text('compare')}</h2><div className="grid sm:grid-cols-2 gap-4">
    {[{label:'before' as const,quote:checkpoint.original.text,source:session},{label:'after' as const,quote:attempt.messages.find(m=>m.role==='learner')!.text,source:branchView}].map(row=><div key={row.label} className="card p-5 min-w-0"><h3 className="text-[13px] text-ink-2 mb-3">{text(row.label)}</h3><button className="press text-left text-[16px] leading-relaxed whitespace-pre-wrap break-words min-h-11 w-full" onClick={()=>setSelection({source:row.source,quote:row.quote})}><span>“{row.quote}”</span><ArrowUpRight size={15} className="inline ml-2 text-action" aria-hidden/></button></div>)}
   </div><p className="text-[13px] text-ink-2 leading-relaxed mt-4">{text(checkpoint.original.text===attempt.messages.find(m=>m.role==='learner')?.text?'same':'compareNote')}</p></section>
   <section aria-labelledby="retry-observations"><h2 id="retry-observations" className="text-[19px] font-semibold mb-4">{text('observations')}</h2><div className="flex flex-col gap-4">{keyTurnObservations(attempt).length?keyTurnObservations(attempt).map((item,i)=><article key={i} className="card p-5"><button onClick={()=>setSelection({source:branchView,quote:item.quote})} className="press min-h-11 text-left text-[16px] leading-relaxed break-words text-action">“{item.quote}”<ArrowUpRight size={15} className="inline ml-2" aria-hidden/></button><p className="text-[15px] leading-relaxed mt-3">{item.text}</p></article>):<p className="text-ink-2 text-[14px]">{text('empty')}</p>}</div><p className="text-[12px] leading-relaxed text-ink-2 mt-4">{text('estimated')}</p></section>
   <button onClick={()=>setSelection({source:branchView,quote:''})} className="press min-h-11 self-start text-action text-[14px]">{text('transcript')}</button>
   <div className="flex flex-col sm:flex-row gap-3"><Button onClick={()=>router.push(originalHref)}><ArrowLeft size={17} aria-hidden/>{text('back')}</Button><Button variant="secondary" disabled={!!saveIssue} onClick={()=>{const id=useApp.getState().startKeyTurn(session.id,lang);if(id)router.push(keyTurnHref(session.id,id));}}><RotateCcw size={17} aria-hidden/>{text('new')}</Button></div>
   <InviteEntry session={session} />
  </div>:<div className="flex flex-col gap-6">
   <section className="rounded-[var(--radius)] bg-inset p-5"><h2 className="text-[15px] font-semibold mb-2">{text('setup')}</h2><p className="text-[14px] leading-relaxed whitespace-pre-wrap">{session.adaptation?.briefing??pick(session.scenario.background,lang)}</p><p className="mt-3 text-[12px] leading-relaxed text-ink-2">{text('context')}</p><details className="mt-2"><summary className="press min-h-11 flex items-center text-[14px] cursor-pointer text-action">{text('source')}</summary><blockquote className="text-[15px] leading-relaxed whitespace-pre-wrap break-words mt-1">“{checkpoint.original.text}”</blockquote></details></section>
   {!saveIssue&&<p className="text-[12px] leading-relaxed text-ink-2">{text('leave')}</p>}
   <section aria-label={text('transcript')} className="flex flex-col gap-4">
    {[...checkpoint.prefix,...attempt.messages,...preview].map(message=><article key={message.id} className={`rounded-[var(--radius)] p-4 sm:p-5 ${message.role==='learner'?'bg-inset sm:ml-10':'bg-card sm:mr-10'}`}><p className="text-[12px] font-semibold text-ink-2 mb-2">{message.role==='learner'?text('you'):pick(npc.name,lang)}</p><p className="text-[16px] leading-relaxed whitespace-pre-wrap break-words">{message.text}</p></article>)}
    <div ref={latest}/>
   </section>
   {error&&<p role="alert" className="text-[14px] text-danger leading-relaxed">{error}</p>}
   {saveIssue&&<p role="alert" className="text-[14px] text-danger">{pick(keyTurnCopy.unsaved,lang)}</p>}
   {busy?<div className="flex flex-col gap-3"><p role="status" className="flex items-center gap-3 text-[14px] text-ink-2"><Spinner/>{text(busy==='reply'?'replying':'reviewing')}</p><SlowModelNotice lang={lang}/><Button variant="ghost" onClick={stop}>{text('stop')}</Button></div>:attempt.status==='ended'?<div className="flex flex-col gap-3"><Button requiresModel disabled={!!saveIssue} onClick={()=>void review()}>{text('retryReview')}</Button>{turns<KEY_TURN_LIMIT&&<Button variant="ghost" disabled={!!saveIssue} onClick={()=>{const live=current();if(live&&commit(live,{status:'active',endedAt:undefined}))setError(null);}}>{text('continue')}</Button>}</div>:pending?<div className="flex flex-col gap-3"><p className="text-[14px] text-ink-2">{text('paused')}</p><Button requiresModel disabled={!!saveIssue} onClick={()=>void reply()}>{text('retry')}</Button></div>:<>
    {turns>=2&&<p className="rounded-[var(--radius)] bg-inset p-4 text-[14px] leading-relaxed">{text(turns>=KEY_TURN_LIMIT?'cap':'checkpoint')}</p>}
    {turns<KEY_TURN_LIMIT&&<form onSubmit={e=>{e.preventDefault();void reply();}} className="flex flex-col gap-3"><label htmlFor="retry-response" className="text-[15px] font-medium">{text('input')} <span className="text-[12px] font-normal text-ink-2">{turns+1} / {KEY_TURN_LIMIT}</span></label><textarea ref={input} id="retry-response" rows={4} maxLength={2000} value={draft} onChange={e=>setDraft(e.target.value)} placeholder={text('placeholder')} className="writing-field p-4 text-base leading-relaxed resize-y min-h-28"/><p role="status" className="text-[12px] text-ink-2">{draft?text(draftSaved?'saved':'unsaved'):'\u00a0'}</p><Button type="submit" requiresModel disabled={!draft.trim()||!!saveIssue}><Send size={17} aria-hidden/>{text('send')}</Button></form>}
    {canReviewKeyTurn(attempt)&&<Button variant={turns>=KEY_TURN_LIMIT?'primary':'secondary'} requiresModel disabled={!!saveIssue} onClick={()=>void review()}>{text('review')}</Button>}
   </>}
  </div>}
  {selection&&<TranscriptReader session={selection.source} lang={lang} selection={selection.quote} onClose={()=>setSelection(null)}/>}
 </main></Shell>;
}

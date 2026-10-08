'use client';
import {useEffect,useRef,useState} from 'react';
import {Copy,Download,Share2} from 'lucide-react';
import {Sheet,Button,useToast} from '../ui';
import {pick} from '@/lib/i18n';
import type {Session} from '@/lib/types';
import type {Lang} from '@/data/taxonomy';
import {defaultShareCard,renderShareCard,sharePreparedFile,shareCardText,copyShareText} from '@/lib/share-card';
const L={
 title:{zh:'分享练习记录',en:'Share a practice note'},privacy:{zh:'默认只分享通用练习记录。场景名和原话可能含私人信息，加入前请检查。',en:'The default card is a general practice note. Scene names and quotations may contain private details; review them before adding.'},
 headline:{zh:'图片标题',en:'Card title'},caption:{zh:'分享短文',en:'Caption'},scene:{zh:'使用这场练习的标题',en:'Use this practice title'},include:{zh:'加入一段我的原话',en:'Include a passage from my words'},quote:{zh:'要分享的片段（可删改姓名和细节）',en:'Passage to share (edit names and details)'},
 source:{zh:'选择片段',en:'Choose a passage'},save:{zh:'保存图片',en:'Save image'},copy:{zh:'复制短文',en:'Copy caption'},native:{zh:'系统分享',en:'Share via device'},preparing:{zh:'正在准备图片…',en:'Preparing the image…'},
 copied:{zh:'短文已复制',en:'Caption copied'},copyFailure:{zh:'暂不能复制，请在下方选中文字手动复制。',en:'Copying is unavailable; select the text below and copy it manually.'},
 failure:{zh:'系统分享未完成，可以保存图片或复制短文。',en:'Device sharing failed. You can save the image or copy the caption.'},unsupported:{zh:'此设备未提供图片分享，可以先保存图片。',en:'Image sharing is unavailable on this device; save the image instead.'},imageFailure:{zh:'图片暂未生成，仍可复制下方短文。',en:'The image could not be prepared; you can still copy the caption below.'},
 review:{zh:'分享前预览',en:'Preview before sharing'},retry:{zh:'重新生成图片',en:'Retry image'},
};
export function SharePractice({open,onClose,session,stars,quality,lang}:{open:boolean;onClose:()=>void;session:Session;stars:number;quality:string;lang:Lang}){
 const [card,setCard]=useState(()=>({...defaultShareCard(lang,stars),quality})),[include,setInclude]=useState(false),[ready,setReady]=useState<{file:File;url:string}|null>(null),[error,setError]=useState<string|null>(null),[sharing,setSharing]=useState(false),[copying,setCopying]=useState(false);
 const [selectedPassage,setSelectedPassage]=useState<string|null>(null),[imageStatus,setImageStatus]=useState<'preparing'|'ready'|'failed'>('preparing'),[retry,setRetry]=useState(0);
 const canvas=useRef<HTMLCanvasElement>(null),generation=useRef(0),toast=useToast(s=>s.show),text=(key:keyof typeof L)=>pick(L[key],lang);
 const passages=session.messages.filter(m=>m.role==='learner');
 const actual={...card,quote:include?card.quote:''};
 useEffect(()=>{
  if(!open||!canvas.current)return;
  const owned=++generation.current;let url:string|undefined;let disposed=false;
  setReady(null);setError(null);setImageStatus('preparing');
  void renderShareCard(canvas.current,{...card,quote:include?card.quote:''}).then(blob=>{
   if(disposed||owned!==generation.current)return;url=URL.createObjectURL(blob);setReady({url,file:new File([blob],'SocialCoach-practice.png',{type:'image/png'})});setImageStatus('ready');
  }).catch(()=>{if(!disposed&&owned===generation.current)setImageStatus('failed');});
  return()=>{disposed=true;if(url)URL.revokeObjectURL(url);};
 },[open,card,include,lang,retry]);
 const copy=async()=>{if(copying)return;setCopying(true);setError(null);try{await copyShareText(shareCardText(actual),navigator.clipboard);toast(text('copied'));}catch{setError(text('copyFailure'));}finally{setCopying(false);}};
 const share=async()=>{if(!ready||sharing)return;setSharing(true);setError(null);try{const result=await sharePreparedFile(ready.file,navigator);if(result==='unsupported')setError(text('unsupported'));}catch{setError(text('failure'));}finally{setSharing(false);}};
 return <Sheet open={open} onClose={onClose} title={text('title')} wide footer={<div className="flex flex-wrap items-center gap-3">
  {ready?<a className="press inline-flex min-h-11 items-center gap-2 px-4 border border-line rounded-xl bg-card text-[14px]" href={ready.url} download="SocialCoach-practice.png"><Download size={16}/>{text('save')}</a>:imageStatus==='failed'?<Button variant="secondary" onClick={()=>setRetry(v=>v+1)}>{text('retry')}</Button>:<span role="status" className="text-[13px] text-ink-3">{text('preparing')}</span>}
  <Button variant="ghost" disabled={copying} onClick={()=>void copy()}><Copy size={16}/>{text('copy')}</Button><Button variant="ghost" disabled={!ready||sharing} onClick={()=>void share()}><Share2 size={16}/>{text('native')}</Button>
 </div>}>
  <p className="text-[14px] text-ink-2 leading-relaxed mb-5">{text('privacy')}</p>
  <div className="grid md:grid-cols-2 gap-5 items-start">
   <div className="flex flex-col gap-4">
    <label className="flex flex-col gap-2 text-[14px]">{text('headline')}<textarea rows={3} maxLength={72} value={card.title} onChange={e=>setCard({...card,title:e.target.value})} className="writing-field p-3 text-base"/></label>
    <Button variant="ghost" onClick={()=>setCard({...card,title:session.scenario.title[lang].slice(0,72)})}>{text('scene')}</Button>
    <label className="flex flex-col gap-2 text-[14px]">{text('caption')}<textarea rows={3} maxLength={140} value={card.caption} onChange={e=>setCard({...card,caption:e.target.value})} className="writing-field p-3 text-base"/></label>
    <label className="flex items-center gap-3 min-h-11 text-[14px]"><input type="checkbox" checked={include} disabled={!passages.length} onChange={e=>{setInclude(e.target.checked);if(e.target.checked&&selectedPassage===null){setSelectedPassage(passages[0]?.id??null);setCard({...card,quote:passages[0]?.text.slice(0,160)??''});}}}/>{text('include')}</label>
    {include&&<div className="flex flex-col gap-3"><label className="flex flex-col gap-2 text-[14px]">{text('source')}<select className="bg-card p-3 rounded-xl border border-line max-w-full" value={selectedPassage??passages[0]?.id??''} onChange={e=>{setSelectedPassage(e.target.value);setCard({...card,quote:passages.find(p=>p.id===e.target.value)?.text.slice(0,160)??''});}}>{passages.map((p,i)=><option key={p.id} value={p.id}>{i+1} · {p.text.slice(0,24)}</option>)}</select></label><label className="flex flex-col gap-2 text-[14px]">{text('quote')}<textarea rows={4} maxLength={160} value={card.quote} onChange={e=>setCard({...card,quote:e.target.value})} className="writing-field p-3 text-base"/></label></div>}
   </div>
   <canvas ref={canvas} className="w-full h-auto rounded-xl border border-line" role="img" aria-label={`${text('review')}: ${shareCardText(actual)}`} />
  </div>
  {imageStatus==='failed'&&<p role="alert" className="text-danger text-[14px] leading-relaxed mt-4">{text('imageFailure')}</p>}
  {error&&<p role="alert" className="text-danger text-[14px] leading-relaxed mt-4">{error}</p>}
  <details className="mt-5" open={error===text('copyFailure')}><summary className="min-h-11 cursor-pointer text-[13px] text-ink-3">{text('copy')}</summary><p className="text-[14px] whitespace-pre-wrap leading-relaxed select-text">{shareCardText(actual)}</p></details>
 </Sheet>;
}

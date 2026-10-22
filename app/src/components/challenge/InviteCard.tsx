'use client';
import Image from 'next/image';
import {useEffect,useState} from 'react';
import {Copy,Download,Share2} from 'lucide-react';
import {Button,Sheet} from '@/components/ui';
import {pick} from '@/lib/i18n';
import type {Lang} from '@/data/taxonomy';
import {challengeUrl,invitationText,inviteCopy,inviteDestination,type InviteDestination} from '@/lib/challenge';
import {copyShareText} from '@/lib/share-card';
import {renderInviteCard,shareInvitation} from '@/lib/invite-card';
const L={
 title:{zh:'邀请朋友来接这一句',en:'Invite a friend to try'},
 preview:{zh:'朋友会看到这张邀请卡',en:'The invitation your friend sees'},
 copy:{zh:'复制邀请',en:'Copy invitation'},save:{zh:'保存邀请卡',en:'Save card'},native:{zh:'系统分享',en:'Share via device'},
 preparing:{zh:'正在准备邀请卡…',en:'Preparing your card…'},retry:{zh:'重新生成图片',en:'Retry image'},
 failed:{zh:'图片暂未生成，可以先复制邀请链接。',en:'The image is unavailable. You can still copy the invitation link.'},
 copied:{zh:'邀请已复制，粘贴给朋友就可以。',en:'Invitation copied. Paste it to your friend.'},
 copyFailed:{zh:'浏览器暂不允许复制，请长按或选中下方文字手动复制。',en:'Copying is unavailable. Select the invitation below and copy it manually.'},
 shareFailed:{zh:'系统分享未完成，可以保存图片或复制邀请。',en:'Device sharing could not finish. Save the card or copy the invitation.'},
 unsupported:{zh:'当前浏览器不支持系统分享，可以保存图片或复制邀请。',en:'Device sharing is unavailable here. Save the card or copy the invitation.'},
 destination:{zh:'朋友从哪里打开',en:'Where your friend opens it'},main:{zh:'主站',en:'Main site'},studio:{zh:'国内入口',en:'China entry'},
 destinationHelp:{zh:'两个入口都是同一题，练习记录各自保存在对应网站。',en:'Both entries open the same scene. Practice records stay on the site used.'},
 text:{zh:'邀请文字与链接',en:'Invitation text and link'},language:{zh:'邀请语言',en:'Invitation language'},
};
export function InviteCard({lang:initialLang,onClose}:{lang:Lang;onClose:()=>void}) {
 const [lang,setLang]=useState(initialLang),[destination,setDestination]=useState<InviteDestination>(()=>inviteDestination(window.location.hostname));
 const [ready,setReady]=useState<{url:string;file:File;key:string}|null>(null),[failed,setFailed]=useState<string|null>(null),[retry,setRetry]=useState(0),[busy,setBusy]=useState(false),[notice,setNotice]=useState<keyof typeof L|null>(null);
 const text=(k:keyof typeof L)=>pick(L[k],lang),key=`${lang}:${destination}:${retry}`;
 const current=ready?.key===key?ready:null;
 useEffect(()=>{
  let disposed=false,url:string|undefined;
  // Every generation owns its canvas; a slow previous render cannot repaint the preview.
  const canvas=document.createElement('canvas');
  void renderInviteCard(canvas,lang,destination).then(blob=>{if(disposed)return;url=URL.createObjectURL(blob);setReady({url,file:new File([blob],`SocialCoach-invite-${lang}.png`,{type:'image/png'}),key});}).catch(()=>{if(!disposed)setFailed(key);});
  return()=>{disposed=true;if(url)URL.revokeObjectURL(url);};
 },[lang,destination,key,retry]);
 const copy=async()=>{if(busy)return;setBusy(true);setNotice(null);try{await copyShareText(invitationText(lang,destination),navigator.clipboard);setNotice('copied');}catch{setNotice('copyFailed');}finally{setBusy(false);}};
 const share=async()=>{if(busy)return;setBusy(true);setNotice(null);try{const result=await shareInvitation(lang,destination,current?.file,navigator);if(result==='unsupported')setNotice('unsupported');}catch{setNotice('shareFailed');}finally{setBusy(false);}};
 return <Sheet open onClose={onClose} title={text('title')} wide footer={<div className="flex flex-wrap gap-2">
  <Button disabled={busy} onClick={()=>void copy()}><Copy size={16} aria-hidden/>{text('copy')}</Button>
  {current&&<a className="press inline-flex min-h-11 items-center gap-2 px-3 text-[14px] text-action" href={current.url} download={`SocialCoach-invite-${lang}.png`}><Download size={16} aria-hidden/>{text('save')}</a>}
  <Button variant="ghost" disabled={busy} onClick={()=>void share()}><Share2 size={16} aria-hidden/>{text('native')}</Button>
 </div>}>
  <div id="invite-card" className="flex flex-col gap-5">
   <p className="text-[14px] leading-relaxed text-ink-2">{pick(inviteCopy.privacy,lang)}</p>
   <div className="grid md:grid-cols-2 gap-6 items-start">
    <figure className="min-w-0 flex flex-col gap-2">
     {current?/* The downloadable PNG is the preview, so both always match. */<Image unoptimized src={current.url} width={1080} height={1350} alt={`${text('preview')}: ${pick(inviteCopy.question,lang)}`} className="w-full h-auto rounded-[var(--radius)] border border-line"/>:<div className="aspect-[4/5] rounded-[var(--radius)] bg-inset grid place-items-center p-6 text-[14px] text-ink-2" role="status">{failed===key?<div className="flex flex-col gap-4"><p>{text('failed')}</p><Button variant="secondary" onClick={()=>setRetry(n=>n+1)}>{text('retry')}</Button></div>:text('preparing')}</div>}
     <figcaption className="text-[12px] text-ink-3">{text('preview')}</figcaption>
    </figure>
    <div className="flex flex-col gap-5 min-w-0">
     <fieldset disabled={busy}><legend className="text-[13px] text-ink-2 mb-2">{text('language')}</legend><div className="flex gap-2">{(['zh','en'] as const).map(l=><Button key={l} variant={lang===l?'secondary':'ghost'} aria-pressed={lang===l} onClick={()=>{setNotice(null);setLang(l);}}>{l==='zh'?'中文':'English'}</Button>)}</div></fieldset>
     <fieldset disabled={busy}><legend className="text-[13px] text-ink-2 mb-2">{text('destination')}</legend><div className="flex gap-2">{(['main','studio'] as const).map(d=><Button key={d} variant={destination===d?'secondary':'ghost'} aria-pressed={destination===d} onClick={()=>{setNotice(null);setDestination(d);}}>{text(d)}</Button>)}</div><p className="text-[12px] leading-relaxed text-ink-3 mt-2">{text('destinationHelp')}</p></fieldset>
     <label className="text-[13px] text-ink-2 flex flex-col gap-2">{text('text')}<textarea readOnly value={invitationText(lang,destination)} rows={9} className="writing-field p-3 text-[14px] leading-relaxed select-text" onFocus={e=>e.currentTarget.select()} /></label>
     <a href={challengeUrl(lang,destination)} target="_blank" rel="noopener noreferrer" className="press min-h-11 text-[13px] text-action inline-flex items-center">{pick({zh:'预览朋友打开的页面 ↗',en:'Preview your friend’s page ↗'},lang)}</a>
    </div>
   </div>
   <p role="status" aria-live="polite" className="text-[14px] text-ink-2 leading-relaxed">{notice?text(notice):''}</p>
  </div>
 </Sheet>;
}

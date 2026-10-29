'use client';
import {useState} from 'react';
import dynamic from 'next/dynamic';
import {Share2} from 'lucide-react';
import {useLang} from '@/store/useApp';
import {pick} from '@/lib/i18n';
import {canInvite} from '@/lib/challenge';
import type {Session} from '@/lib/types';
const InviteCard=dynamic(()=>import('./InviteCard').then(m=>m.InviteCard),{ssr:false});
export function InviteEntry({session}:{session:Session}) {
 const lang=useLang(),[open,setOpen]=useState(false);
 if(!canInvite(session))return null;
 return <section aria-label={pick({zh:'同题邀请',en:'Invite to this scene'},lang)}>
  <button type="button" className="press inline-flex items-center gap-2 min-h-11 text-[13px] text-action text-left" onClick={()=>setOpen(true)}><Share2 size={15} className="shrink-0" aria-hidden/>{pick({zh:'邀请朋友挑战同一场景',en:'Invite a friend to this scene'},lang)}</button>
  {open&&<InviteCard lang={lang} onClose={()=>setOpen(false)}/>}
 </section>;
}

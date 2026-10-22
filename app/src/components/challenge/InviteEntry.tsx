'use client';
import {useState} from 'react';
import dynamic from 'next/dynamic';
import {Share2} from 'lucide-react';
import {Button} from '@/components/ui';
import {useLang} from '@/store/useApp';
import {pick} from '@/lib/i18n';
import {canInvite} from '@/lib/challenge';
import type {Session} from '@/lib/types';
const InviteCard=dynamic(()=>import('./InviteCard').then(m=>m.InviteCard),{ssr:false});
export function InviteEntry({session}:{session:Session}) {
 const lang=useLang(),[open,setOpen]=useState(false);
 if(!canInvite(session))return null;
 return <section className="rounded-[var(--radius)] bg-inset p-5" aria-label={pick({zh:'同题邀请',en:'Invite to this scene'},lang)}>
  <h2 className="font-semibold text-[17px]">{pick({zh:'换朋友来，会怎么回？',en:'How would your friend respond?'},lang)}</h2>
  <p className="text-[14px] leading-relaxed text-ink-2 mt-2 mb-3">{pick({zh:'把唐悦的公共开场发给朋友，让对方试试自己的回应。',en:'Send Tang’s public opening to a friend and let them try their own response.'},lang)}</p>
  <Button variant="secondary" onClick={()=>setOpen(true)}><Share2 size={16} aria-hidden/>{pick({zh:'邀请朋友挑战同一场景',en:'Invite a friend to this scene'},lang)}</Button>
  {open&&<InviteCard lang={lang} onClose={()=>setOpen(false)}/>}
 </section>;
}

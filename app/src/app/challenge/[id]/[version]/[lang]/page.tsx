import type {Metadata} from 'next';
import Link from 'next/link';
import {ChallengeLanding} from '@/components/challenge/ChallengeLanding';
import {challengeRef,challengePath,challengePublic,challengeUrl,inviteCopy} from '@/lib/challenge';
import {pick} from '@/lib/i18n';
type Props={params:Promise<{id:string;version:string;lang:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {id,version,lang}=await params,ref=challengeRef(id,version,lang);
 if(!ref)return {title:'SocialCoach',robots:{index:false,follow:false}};
 const p=challengePublic(ref.lang),title=`${pick(inviteCopy.question,ref.lang)} · SocialCoach`,description=p.opening;
 return {title,description,alternates:{canonical:challengeUrl(ref.lang,'main'),languages:{'zh-CN':challengeUrl('zh','main'),en:challengeUrl('en','main')}},openGraph:{title,description,url:challengeUrl(ref.lang,'main'),siteName:'SocialCoach',type:'website',images:[{url:`https://socialcoach-ai.vercel.app/invites/office-quick-favor-v1-${ref.lang}.png`,width:1080,height:1350,alt:title}]},twitter:{card:'summary_large_image',title,description,images:[`https://socialcoach-ai.vercel.app/invites/office-quick-favor-v1-${ref.lang}.png`]}};
}
export default async function Page({params}:Props) {
 const {id,version,lang}=await params,ref=challengeRef(id,version,lang);
 if(!ref){const l=lang==='en'?'en':'zh';return <main className="min-h-dvh px-5 py-16 mx-auto max-w-[var(--form-max)]"><h1 className="display text-[30px]">{pick({zh:'这张邀请暂时打不开',en:'This invitation is unavailable'},l)}</h1><p className="text-base leading-relaxed my-5">{pick({zh:'场景或版本不存在。可以请朋友重新发一张，或试试当前开放的公共场景。',en:'This scene or version is unavailable. Ask your friend for a new invitation, or try the current public scene.'},l)}</p><Link href={challengePath(l)} className="press min-h-11 inline-flex items-center text-action">{pick({zh:'看看唐悦的五分钟请求',en:'See Tang’s five-minute favor'},l)} →</Link></main>;}
 return <ChallengeLanding lang={ref.lang}/>;
}

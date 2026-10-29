import {pick} from '@/lib/i18n';
import type {Lang} from '@/data/taxonomy';

export function PracticeIntentNote({intent,lang}:{intent?:string;lang:Lang}){
 if(!intent?.trim())return null;
 return <div className="inset p-3 flex flex-col gap-1">
  <p className="eyebrow text-ink-2">{pick({zh:'练习前的打算',en:'Your initial approach'},lang)}</p>
  <p className="text-[14px] leading-relaxed text-ink-2 whitespace-pre-wrap">{intent}</p>
  <p className="text-[12px] text-ink-3">{pick({zh:'可以改变主意；复盘以对话里的实际表达为依据。',en:'You can change your mind. The review uses what you actually said in the conversation.'},lang)}</p>
 </div>;
}

import {pick} from '@/lib/i18n';
import type {Lang} from '@/data/taxonomy';

export function PracticeIntentNote({intent,lang}:{intent?:string;lang:Lang}){
 if(!intent?.trim())return null;
 return <p className="text-[13px] leading-relaxed text-ink-3 break-words"><span className="mr-2">{pick({zh:'练习前的打算：',en:'Your initial approach:'},lang)}</span><span className="text-ink-2 whitespace-pre-wrap">{intent}</span></p>;
}

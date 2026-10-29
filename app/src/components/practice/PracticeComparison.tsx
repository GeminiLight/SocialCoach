'use client';
import {useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,MessageSquareText} from 'lucide-react';
import {useLang} from '@/store/useApp';
import {pick} from '@/lib/i18n';
import type {PracticeComparison as Comparison} from '@/lib/practice-comparison';
import {skillById} from '@/data/taxonomy';
import type {Session} from '@/lib/types';
import {TranscriptReader} from './TranscriptReader';

export const comparisonCopy={
 tab:{zh:'前后对照',en:'Compare practices'},
 title:{zh:'两次练习的原话对照',en:'Your words, across two practices'},
 intro:{zh:'同一场景、相同准备条件的两次独立练习。先看原话，再读各次复盘。',en:'Two independent practices with the same scene and preparation. Read your words, then each assessment.'},
 empty:{zh:'再次练习同一场景并完成复盘后，可以在这里对照两次原话。',en:'Practice this scene again and finish the review to compare your words here.'},
 previous:{zh:'上次',en:'Previous'},current:{zh:'这次',en:'This time'},
 source:{zh:'查看这句话的完整对话',en:'Read this line in its conversation'},
 assessment:{zh:'该次复盘：',en:'Assessment at the time: '},
 higher:{zh:'本次评级更高',en:'Higher estimate this time'},same:{zh:'两次评级相同',en:'Same estimate'},lower:{zh:'本次评级更低',en:'Lower estimate this time'},
 estimate:{zh:'评级为模型估计，目标结果单独记录。两次对话的具体压力仍可能不同。',en:'Ratings are model estimates; goal outcomes are separate. The pressure within each conversation may still differ.'},
 older:{zh:'打开上次复盘',en:'Open the previous review'},
};
const copy=comparisonCopy;

export function PracticeComparison({session,comparison}:{session:Session;comparison:Comparison}){
 const lang=useLang();
 const [selection,setSelection]=useState<{session:Session;quote:string}|null>(null);
 return <section id="review-comparison" aria-labelledby="comparison-title" className="flex flex-col gap-4">
  <div className="flex items-center gap-2"><MessageSquareText size={18} className="text-teal" aria-hidden/><h2 id="comparison-title" className="text-[17px] font-semibold">{pick(copy.title,lang)}</h2></div>
   <p className="text-[14px] leading-relaxed text-ink-2">{pick(copy.intro,lang)}</p>
   <div className="flex flex-col gap-5">{comparison.rows.map(row=><article key={row.skill} className="card p-4 sm:p-5 flex flex-col gap-4">
    <h3 className="text-[14px] font-semibold text-ink-2">{skillById(row.skill).name[lang]}</h3>
    <div className="grid gap-5 sm:grid-cols-2">{([{label:copy.previous,record:comparison.previous,rating:row.previous},{label:copy.current,record:session,rating:row.current}]).map(({label,record,rating})=><div key={record.id} className="min-w-0 flex flex-col gap-2">
     <p className="eyebrow text-ink-2">{pick(label,lang)} · <time dateTime={new Date(record.startedAt).toISOString()}>{new Date(record.startedAt).toLocaleDateString(lang==='zh'?'zh-CN':'en-US',{month:'short',day:'numeric'})}</time></p>
     <button type="button" onClick={()=>setSelection({session:record,quote:rating.evidence})} aria-label={`${pick(copy.source,lang)} · ${pick(label,lang)}`} className="press min-h-11 text-left rounded-xl bg-inset px-4 py-3 hover:bg-slab hover:text-slab-ink transition-colors">
      <span className="block text-[15px] leading-relaxed whitespace-pre-wrap break-words">“{rating.evidence}”</span>
     </button>
     {rating.reason&&<p className="text-[13px] text-ink-2 leading-relaxed"><span className="text-ink-2">{pick(copy.assessment,lang)}</span>{rating.reason}</p>}
    </div>)}</div>
    <p className="text-[12px] text-ink-2">{pick(copy[row.change],lang)} · {row.previous.level}/3 → {row.current.level}/3</p>
   </article>)}</div>
   <p className="text-[12px] text-ink-2 leading-relaxed">{pick(copy.estimate,lang)}</p>
   <Link href={`/practice/${encodeURIComponent(comparison.previous.id)}`} className="press inline-flex items-center gap-1.5 text-[13px] text-action min-h-11 self-start">{pick(copy.older,lang)}<ArrowUpRight size={15} aria-hidden/></Link>
  {selection&&<TranscriptReader session={selection.session} lang={lang} selection={selection.quote} onClose={()=>setSelection(null)}/>}
 </section>;
}

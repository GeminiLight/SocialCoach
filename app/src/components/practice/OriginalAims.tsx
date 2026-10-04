import {pick} from '@/lib/i18n';
import type {Report,Session} from '@/lib/types';
import type {Lang} from '@/data/taxonomy';
const L={title:{zh:'原目标',en:'Original aims'},met:{zh:'有证据达成',en:'Evidenced as met'},unmet:{zh:'未达成',en:'Not met'},unknown:{zh:'尚无法确认',en:'Not established'},note:{zh:'这是开场目标的完成情况；沟通星数另评，不因你改变选择就扣分。',en:'These are the opening aims. Communication is rated separately; choosing a different direction is not itself a penalty.'},inspect:{zh:'查看原话',en:'View source'}};
export function OriginalAims({results,session,lang,onInspect}:{results:Report['objectiveResults'];session:Session;lang:Lang;onInspect:(quote:string)=>void}){
 if(!results)return null;
 const achieved=results.filter(r=>r.status==='met').length,unknown=results.filter(r=>r.status==='unknown').length;
 return <details className="inset px-4 py-3">
  <summary className="cursor-pointer text-[14px] font-medium leading-relaxed">{pick(L.title,lang)} · {achieved}/{results.length} {pick(L.met,lang)}{unknown>0&&` · ${unknown} ${pick(L.unknown,lang)}`}</summary>
  <p className="text-[13px] text-ink-3 leading-relaxed mt-3">{pick(L.note,lang)}</p>
  <ol className="flex flex-col gap-4 mt-4">{results.map(result=><li key={result.index}>
   <button className="press text-left text-[14px] text-ink-2 min-h-11" title={pick(L.inspect,lang)} onClick={()=>onInspect(result.evidence)}>“{result.evidence}”</button>
   <p className="text-[14px] leading-relaxed"><span className={result.status==='met'?'text-teal':'text-ink-3'}>{pick(L[result.status],lang)}</span> · {session.scenario.objectives[result.index]?.[lang]}</p>
   <p className="text-[13px] text-ink-2 leading-relaxed mt-1">{result.reason}</p>
  </li>)}</ol>
 </details>;
}

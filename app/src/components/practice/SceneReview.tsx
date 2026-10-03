'use client';
import {MapPin,Users,ChevronDown} from 'lucide-react';
import type {SceneContext,SceneNote} from '@/lib/scene-context';
import type {Lang} from '@/data/taxonomy';
import {pick} from '@/lib/i18n';

export const sceneReviewCopy={
  title:{zh:'把这句话放回现场',en:'Put these words back in the scene'},
  credit:{zh:'同一局多次复盘，只记录新增的能力变化。',en:'Further debriefs of this practice count only additional progress.'},
  intro:{zh:'位置、对象和动作只补充上下文。评价仍以你说过的话为依据。',en:'Position, addressee and actions add context. Your actual words remain the evidence.'},
  records:{zh:'查看发言时的现场记录',en:'View the scene when you spoke'},
  actions:{zh:'实际完成的动作',en:'Actions you completed'},
  after:{zh:'第 {n} 次发言后',en:'After response {n}'},
  before:{zh:'开口前',en:'Before you spoke'},
  turn:{zh:'第 {n} 次开口',en:'Your turn {n}'},
  preparing:{zh:'复盘你刚才的回应',en:'Reviewing your response'},
  preparingNote:{zh:'对照原话和在场回应，看看哪些表达值得保留，哪一句可以重来。',en:'Checking your words and the actual replies to see what to keep and what to try again.'},
  returnScene:{zh:'回到 3D 现场',en:'Return to the 3D scene'},
  repeat:{zh:'在 3D 里再练一次',en:'Try again in 3D'},
};

export function SceneReview({context,notes=[],lang}:{context:SceneContext;notes?:SceneNote[];lang:Lang}) {
  if(!context.observations.length)return null;
  return <section id="review-scene" className="flex flex-col gap-4 scroll-mt-24">
    {context.practiceId&&<p className="text-[12px] text-ink-3">{pick(sceneReviewCopy.credit,lang)}</p>}
    <div className="flex flex-col gap-1"><h2 className="display text-[20px] leading-tight">{pick(sceneReviewCopy.title,lang)}</h2><p className="text-[13px] text-ink-3 leading-relaxed">{pick(sceneReviewCopy.intro,lang)}</p></div>
    {notes.map(note=>{const observation=context.observations.find(o=>o.id===note.observationId);if(!observation)return null;return <article key={note.observationId} className="card p-5 flex flex-col gap-3">
      <span className="eyebrow text-teal">{pick(sceneReviewCopy.turn,lang).replace('{n}',String(observation.turn))}</span>
      <blockquote className="text-[17px] leading-relaxed text-ink break-words">“{note.evidence}”</blockquote>
      <ul className="flex flex-col gap-1.5 text-[12px] text-ink-3">{observation.facts.map((fact,i)=><li key={i} className="flex items-start gap-2">{i===0?<Users size={13} className="shrink-0 mt-0.5"/>:<MapPin size={13} className="shrink-0 mt-0.5"/>}<span>{fact}</span></li>)}</ul>
      <p className="border-t border-line pt-3 text-[14px] leading-relaxed text-ink-2">{note.note}</p>
    </article>;})}
    <details className="card group">
      <summary className="press min-h-11 cursor-pointer flex items-center justify-between gap-3 px-4 py-3 text-[13px] text-ink-2 list-none"><span>{pick(sceneReviewCopy.records,lang)} · {context.observations.length}</span><ChevronDown size={15} className="shrink-0 group-open:rotate-180"/></summary>
      <ol className="px-4 pb-4 flex flex-col gap-5 max-h-96 overflow-y-auto">{context.observations.map(o=><li key={o.id} className="border-t border-line pt-4 flex flex-col gap-2">
        <span className="eyebrow">{pick(sceneReviewCopy.turn,lang).replace('{n}',String(o.turn))}</span><blockquote className="text-[14px] leading-relaxed break-words">“{o.learnerQuote}”</blockquote>
        <ul className="text-[12px] text-ink-3 leading-relaxed flex flex-col gap-1">{o.facts.map((fact,i)=><li key={i}>{fact}</li>)}</ul>
      </li>)}{!!context.actions?.length&&<li className="border-t border-line pt-4 flex flex-col gap-2"><span className="eyebrow">{pick(sceneReviewCopy.actions,lang)}</span><ul className="text-[12px] text-ink-3 leading-relaxed flex flex-col gap-2">{context.actions.map(a=><li key={a.id}><span>{a.afterTurn===0?pick(sceneReviewCopy.before,lang):pick(sceneReviewCopy.after,lang).replace('{n}',String(a.afterTurn))} · </span>{a.action}</li>)}</ul></li>}</ol>
    </details>
  </section>;
}

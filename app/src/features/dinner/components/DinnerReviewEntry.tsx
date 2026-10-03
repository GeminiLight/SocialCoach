import {ArrowRight,Download,MessageSquare,RotateCcw} from 'lucide-react';
import {Modal} from './Modal';
import {pick,ui,type Lang,type Scenario} from '../lib/content';
import type {Message} from '../lib/engine';

const copy={
  title:{zh:'这段对话，值得回看',en:'Take another look at this conversation'},
  intro:{zh:'引用你的原话，找出值得保留的表达，再挑一句换个说法。现场记录会一起带进复盘。',en:'Review your actual words, keep what helped, and try one line differently. The scene record comes with you.'},
  last:{zh:'你最后一次开口',en:'Your last response'},
  reply:{zh:'随后，对方说',en:'The reply that followed'},
  feedback:{zh:'生成这段的复盘',en:'Create a debrief for this segment'},
  existing:{zh:'打开这段的复盘',en:'Open this segment’s debrief'},
  opening:{zh:'正在打开复盘…',en:'Opening your debrief…'},
  note:{zh:'复盘保存在此设备的练习历史中。返回现场可以接着聊；新对话会生成新的复盘。',en:'The debrief stays in this device’s practice history. You can return and keep talking; new dialogue gets a new debrief.'},
  failed:{zh:'复盘暂时没能打开，现场记录和草稿都还在。请再试一次。',en:'The debrief could not open. Your scene record and draft are still here. Please try again.'},
  turns:{zh:'{n} 次开口',en:'Responses · {n}'},
  scene:{zh:'3D 现场记录',en:'3D scene record'},
};

export function DinnerReviewEntry({lang,scenario,messages,complete,hasReview,opening,error,onClose,onReview,onHistory,onExport,onExtend,onRestart}:{lang:Lang;scenario:Scenario;messages:Message[];complete:boolean;hasReview:boolean;opening:boolean;error:boolean;onClose:()=>void;onReview:()=>void;onHistory:()=>void;onExport:()=>void;onExtend?:()=>void;onRestart:()=>void}) {
  const turns=messages.filter(m=>m.role==='user').length;
  const last=messages.findLastIndex(m=>m.role==='user'),player=messages[last],reply=messages[last+1];
  const name=(id?:string)=>{const person=scenario.characters.find(c=>c.id===id);return person?pick(person.name,lang):pick(ui.wholeTable,lang);};
  return <Modal title={pick(copy.title,lang)} lang={lang} onClose={onClose} wide className="modal-review-entry">
    <div className="review-entry-meta"><span>{pick(copy.scene,lang)}</span><span>{pick(copy.turns,lang).replace('{n}',String(turns))}</span></div>
    <p className="review-entry-intro">{pick(copy.intro,lang)}</p>
    {player?<article className="review-entry-excerpt">
      <span className="evidence-label">{pick(copy.last,lang)}</span><blockquote>“{player.text}”</blockquote>
      {reply&&<div className="review-entry-response"><span className="evidence-label">{pick(copy.reply,lang)} · {name(reply.speakerId)}</span><p>“{reply.text}”</p>{reply.interjection&&<p><small>{name(reply.interjection.speakerId)}</small>“{reply.interjection.text}”</p>}</div>}
    </article>:<p className="report-empty">{pick(ui.reportEmpty,lang)}</p>}
    {error&&<p role="alert" className="review-entry-error">{pick(copy.failed,lang)}</p>}
    <div className="review-entry-primary"><button className="primary-button" disabled={!turns||opening} onClick={onReview}>{pick(opening?copy.opening:hasReview?copy.existing:copy.feedback,lang)}<ArrowRight size={17}/></button><p>{pick(copy.note,lang)}</p></div>
    <div className="review-entry-secondary"><button className="text-button" onClick={onHistory}><MessageSquare size={15}/>{pick(ui.historyTitle,lang)}</button><button className="text-button" onClick={onExport}><Download size={15}/>{pick(ui.download,lang)}</button></div>
    <footer className="review-entry-footer">{onExtend&&<button className="text-button" onClick={onExtend}>{pick(ui.continue,lang)}</button>}{complete?<button className="text-button" onClick={onRestart}><RotateCcw size={15}/>{pick(ui.restart,lang)}</button>:<button className="text-button" onClick={onClose}>{pick(ui.historyReturn,lang)}</button>}</footer>
  </Modal>;
}

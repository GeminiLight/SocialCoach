import { useEffect, useRef } from 'react';
import { ArrowDown, ArrowUp, Download } from 'lucide-react';
import { Modal } from './Modal';
import { pick, ui, type Lang, type Scenario } from '../lib/content';
import { dinnerTranscript } from '../lib/transcript';
import type { Message } from '../lib/engine';
import type { Drama } from '../lib/drama';

export function ConversationHistory({messages,records,scenario,lang,onClose,onExport,onReview}:{messages:Message[];records:Drama['records'];scenario:Scenario;lang:Lang;onClose:()=>void;onExport:()=>void;onReview:()=>void}) {
  const scroll=useRef<HTMLDivElement>(null);
  const lines=dinnerTranscript(messages,records,scenario,lang);
  const t=(key:keyof typeof ui)=>pick(ui[key],lang);
  const name=(id?:string)=>{const person=scenario.characters.find(c=>c.id===id);return person?pick(person.name,lang):t('wholeTable');};
  useEffect(()=>{const frame=requestAnimationFrame(()=>{if(scroll.current)scroll.current.scrollTop=scroll.current.scrollHeight;});return ()=>cancelAnimationFrame(frame);},[]);
  return <Modal title={t('historyTitle')} lang={lang} onClose={onClose} className="modal-history">
    <div className="history-navigation"><span>{pick(scenario.title,lang)}</span><div><button type="button" onClick={()=>{if(scroll.current)scroll.current.scrollTop=0;}}><ArrowUp size={14}/>{t('historyOpening')}</button><button type="button" onClick={()=>{if(scroll.current)scroll.current.scrollTop=scroll.current.scrollHeight;}}><ArrowDown size={14}/>{t('historyLatest')}</button></div></div>
    <div ref={scroll} className="history-scroll" tabIndex={0} role="region" aria-label={t('recap')}>
      <ol className="history-lines">{lines.map(line=><li key={line.id} className={`history-line history-${line.role}`}>
        <div className="history-line-heading"><strong>{line.role==='user'?t('historyYou'):line.role==='action'?t('historyAction'):name(line.speakerId)}</strong>{line.targetId&&<span>→ {name(line.targetId)}</span>}<small>{line.turn===0?t('historyOpening'):`${t('turn')} ${String(line.turn).padStart(2,'0')}`}</small></div>
        <p>{line.text}</p>{line.cue&&<span className="history-cue">{line.cue}</span>}
      </li>)}</ol>
    </div>
    <footer className="history-footer"><div><button type="button" className="text-button" onClick={onExport}><Download size={15}/>{t('download')}</button><button type="button" className="text-button" onClick={onReview}>{t('historyReview')}</button></div><button type="button" className="primary-button" onClick={onClose}>{t('historyReturn')}</button></footer>
  </Modal>;
}

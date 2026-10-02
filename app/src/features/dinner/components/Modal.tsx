import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { pick, ui, type Lang } from '../lib/content';

export function Modal({ title, children, onClose, lang, wide=false }: { title:string; children:ReactNode; onClose:()=>void; lang:Lang; wide?:boolean }) {
  const ref=useRef<HTMLDialogElement>(null!);
  const trigger=useRef<HTMLElement|null>(null);
  useEffect(()=>{const el=ref.current;trigger.current=document.activeElement as HTMLElement;el.showModal();return ()=>{el.close();if(trigger.current?.isConnected)trigger.current.focus({preventScroll:true});};},[]);
  const close=()=>{ref.current.close();onClose();};
  return <dialog ref={ref} className={`modal ${wide?'modal-wide':''}`} onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}}} aria-labelledby="modal-title">
    <header><h2 id="modal-title">{title}</h2><button className="icon-button" aria-label={pick(ui.close,lang)} onClick={close}><X size={20} /></button></header>{children}
  </dialog>;
}

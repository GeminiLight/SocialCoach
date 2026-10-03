import { useEffect, useRef, useState } from 'react';
import { pick, ui, type Lang } from '../lib/content';

/** Older saved lines remain verbatim; the full text is always available in history. */
export function SpokenLine({text,lang,onReadFull}:{text:string;lang:Lang;onReadFull:()=>void}) {
  const ref=useRef<HTMLParagraphElement>(null);
  const [overflow,setOverflow]=useState(false);
  useEffect(()=>{
    const node=ref.current;if(!node)return;
    const observer=new ResizeObserver(()=>setOverflow(node.scrollHeight>node.clientHeight+1));
    observer.observe(node);return ()=>observer.disconnect();
  },[text]);
  return <><p ref={ref} className="spoken-line">{text}</p>{overflow&&<button type="button" className="text-button full-line-link" onClick={onReadFull}>{pick(ui.historyFull,lang)}<span aria-hidden="true">↗</span></button>}</>;
}

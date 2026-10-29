import {ChevronDown} from 'lucide-react';
import type {ReactNode} from 'react';

/** Secondary explanations stay reachable without competing with the task. */
export function InfoDisclosure({label,children,className=''}:{label:string;children:ReactNode;className?:string}){
 return <details className={`group ${className}`}>
  <summary className="press min-h-11 flex items-center justify-between gap-3 cursor-pointer list-none text-[13px] font-medium text-ink-2 [&::-webkit-details-marker]:hidden"><span>{label}</span><ChevronDown size={15} className="shrink-0 transition-transform group-open:rotate-180" aria-hidden/></summary>
  <div className="pb-2 text-[13px] text-ink-2 leading-relaxed">{children}</div>
 </details>;
}

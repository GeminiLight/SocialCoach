import {LLMError} from './llm-core';
import {pick} from './i18n';
import type {Lang} from '@/data/taxonomy';

/** The server gets 165 seconds; the browser also bounds a stalled transport. */
export async function assessmentDeadline<T>(run:(signal:AbortSignal)=>Promise<T>,lang:Lang,signal?:AbortSignal,timeoutMs=180000):Promise<T>{
 const deadline=new AbortController(),timer=setTimeout(()=>deadline.abort(),timeoutMs);
 const combined=signal?AbortSignal.any([signal,deadline.signal]):deadline.signal;
 try{const result=await run(combined);combined.throwIfAborted();return result;}
 catch(error){
  if(deadline.signal.aborted&&!signal?.aborted)throw new LLMError(pick({zh:'这次复盘等待超时。对话仍在本机，可以稍后重试。',en:'This review timed out. Your conversation remains on this device; retry when ready.'},lang),504,true);
  throw error;
 }finally{clearTimeout(timer);}
}

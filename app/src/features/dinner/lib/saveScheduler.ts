type Schedule=(callback:()=>void,delay:number)=>()=>void;

/** Coalesce animation saves without delaying edits or losing the latest mutable pose. */
export function createSaveScheduler(schedule:Schedule=(callback,delay)=>{
  const timer=setTimeout(callback,delay);return()=>clearTimeout(timer);
}) {
  let write:(()=>void)|undefined,cancelPending:(()=>void)|undefined;
  const stop=()=>{cancelPending?.();cancelPending=undefined;};
  const flush=()=>{stop();write?.();};
  return {
    request(next:()=>void,urgent:boolean){
      write=next;
      if(urgent)flush();
      else if(!cancelPending)cancelPending=schedule(()=>{cancelPending=undefined;write?.();},500);
    },
    flush,
    cancel(){stop();write=undefined;},
  };
}

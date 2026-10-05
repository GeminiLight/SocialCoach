import {checkArchiveEnvelope} from '@/lib/archive';
export type SaveIssue='quota'|'unavailable'|'conflict';
const MAX_ARCHIVE_BYTES=4*1024*1024;

/** Acquire one writable window before hydration, then save synchronously so
 * navigation cannot abandon an outstanding write. Without Web Locks, compare
 * the original bytes and observe other windows instead of silently replacing. */
export function createArchiveStorage(notify:(issue:SaveIssue|null)=>void){
 let lastRaw:string|null=null,blockedRead=false,blockedWrite=false,owner=false;
 let acquiring:Promise<void>|undefined,release:(()=>void)|undefined;
 const locks=()=>typeof window!=='undefined'&&typeof window.addEventListener==='function'&&typeof document!=='undefined'&&typeof document.createElement==='function'&&typeof navigator!=='undefined'?navigator.locks:undefined;
 const acquire=()=>{
  if(owner)return Promise.resolve();
  if(acquiring)return acquiring;
  acquiring=new Promise<void>(resolve=>{
   const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),150);
   void locks()!.request('socialcoach.archive',{signal:abort.signal},async()=>{
    clearTimeout(timeout);owner=true;resolve();
    await new Promise<void>(done=>{release=done;});owner=false;
   }).catch(()=>{clearTimeout(timeout);notify('conflict');resolve();});
  });
  void acquiring.then(()=>{acquiring=undefined;});return acquiring;
 };
 if(typeof window!=='undefined'&&locks())window.addEventListener('pagehide',()=>{release?.();release=undefined;owner=false;});
 const read=(name:string)=>{
  try{const raw=localStorage.getItem(name);if(raw!==null)checkArchiveEnvelope(raw);lastRaw=raw;blockedRead=false;return raw;}
  catch(error){blockedRead=true;throw error;}
 };
 return {
  getItem(name:string){return locks()?acquire().then(()=>read(name)):read(name);},
  setItem(name:string,value:string){
   if(blockedRead||blockedWrite)return;
   if(locks()&&!owner){blockedWrite=true;notify('conflict');return;}
   try{
    const disk=localStorage.getItem(name);
    const same=(a:string|null,b:string)=>{try{return a!==null&&JSON.stringify(JSON.parse(a).state)===JSON.stringify(JSON.parse(b).state);}catch{return false;}};
    if(disk!==lastRaw&&!same(disk,value)){blockedWrite=true;notify('conflict');return;}
    if(same(disk,value)){lastRaw=disk;notify(null);return;}
    if(value.length*2>MAX_ARCHIVE_BYTES)throw new DOMException('Archive size limit','QuotaExceededError');
    localStorage.setItem(name,value);lastRaw=value;notify(null);
   }catch(error){blockedWrite=true;notify((error as Error)?.name==='QuotaExceededError'?'quota':'unavailable');}
  },
  removeItem(name:string){localStorage.removeItem(name);lastRaw=null;},
  retry(){blockedWrite=false;},settled(){return Promise.resolve();},
  reset(acceptCurrent=false){blockedRead=false;blockedWrite=false;if(acceptCurrent){try{lastRaw=localStorage.getItem('socialcoach.v1');}catch{}}},
  changed(raw:string|null){return raw!==lastRaw;},dirty(){return blockedWrite;},
  acceptsRemote(oldValue:string|null){return oldValue===lastRaw;},
 };
}

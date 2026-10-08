import {storageWriteCoordinator} from '@/lib/storage-write';
export const DINNER_SAVE_KEY = 'socialcoach-dinner-v1';
export const DINNER_LAUNCH_KEY = 'socialcoach.3d-launch.v1';
export type DinnerSaveIssue='conflict'|'quota'|'unavailable';

/** Independent writer for the 3D record. External restores/deletions invalidate
 * this snapshot; camera changes must never overwrite a newer practice. */
export function createDinnerStorage(notify:(issue:DinnerSaveIssue|null)=>void,storage:()=>Storage=()=>localStorage,serialize=storageWriteCoordinator<boolean>('socialcoach.dinner')){
  let original:string|null=null,unreadable=false,blocked=false,active=true,generation=0;
  let owned=false,release:(()=>void)|undefined,pending:Promise<boolean>|undefined;
  try{original=storage().getItem(DINNER_SAVE_KEY);}catch{unreadable=true;}
  const locks=()=>typeof window!=='undefined'&&typeof navigator!=='undefined'?navigator.locks:undefined;
  const issue=(value:DinnerSaveIssue)=>{blocked=true;if(active)notify(value);};
  const acquire=()=>{
    if(owned||!locks())return Promise.resolve(true);
    if(pending)return pending;
    const ticket=generation;
    pending=new Promise<boolean>(resolve=>{
      void locks()!.request('socialcoach.dinner',{ifAvailable:true},async lock=>{
        if(!active||generation!==ticket){resolve(false);return;}
        if(!lock){issue('conflict');resolve(false);return;}
        owned=true;const hold=new Promise<void>(done=>{release=done;});resolve(true);
        await hold;if(generation===ticket)owned=false;
      }).catch(()=>{if(active&&generation===ticket)issue('unavailable');resolve(false);});
    }).catch(()=>{if(active&&generation===ticket)issue('unavailable');return false;});
    return pending;
  };
  const changed=(event:StorageEvent)=>{
    if((event.key===DINNER_SAVE_KEY||event.key===null)&&event.newValue!==original)issue('conflict');
  };
  return {
    start(){active=true;if(typeof window!=='undefined')window.addEventListener('storage',changed);},
    async save(value:string){
      if(!active||blocked)return false;
      if(unreadable){issue('unavailable');return false;}
      const ticket=generation;
      if(!owned&&locks()&&!await acquire())return false;
      if(!active||ticket!==generation)return false;
      const coordinated=!locks()&&serialize;
      // Finish an already queued local write across a client-side navigation.
      // The snapshot comparison still rejects a newer tab's write or deletion.
      const write=()=>{if(blocked||(!coordinated&&(!active||ticket!==generation)))return false;try{
        const disk=storage().getItem(DINNER_SAVE_KEY);
        if(disk!==original&&disk!==value){issue('conflict');return false;}
        if(disk!==value)storage().setItem(DINNER_SAVE_KEY,value);
        original=value;if(active)notify(null);return true;
      }catch(error){issue((error as Error).name==='QuotaExceededError'?'quota':'unavailable');return false;}};
      try{const saved=coordinated?await coordinated(write):write();return saved&&active&&ticket===generation;}
      catch{if(active&&ticket===generation)issue('unavailable');return false;}
    },
    retry(){if(!unreadable){blocked=false;if(!owned)pending=undefined;}},
    dispose(){active=false;generation++;release?.();release=undefined;owned=false;pending=undefined;if(typeof window!=='undefined')window.removeEventListener('storage',changed);},
  };
}

/** Preserve even an unreadable 3D save in the main backup, never model keys. */
export function dinnerBackup(): unknown {
  try {
    const raw = localStorage.getItem(DINNER_SAVE_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return { unreadable: raw }; }
  } catch { return null; }
}

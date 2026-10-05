import {dinnerBackup} from '@/features/dinner/storage';
import {parseArchive} from './archive';
import {validAvatarImage} from './avatar-image';
import {estimateProficiency} from './proficiency';
import type {Session} from './types';
export type Archive=ReturnType<typeof parseArchive>;
export async function decodeBackup(text:string){
 if(text.length>20*1024*1024)throw new Error('backup-size');
 const raw=JSON.parse(text) as Record<string,unknown>;
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('backup-shape');
 if('state' in raw&&raw.version!==undefined&&raw.version!==0)throw new Error('backup-version');
 const source=('state' in raw?raw.state:raw) as Record<string,unknown>;
 if(!source||!Array.isArray(source.sessions))throw new Error('backup-shape');
 const avatar=raw.avatar as {seed?:unknown;portrait?:unknown;image?:unknown}|undefined;
 const settings=source.settings??(avatar?{tts:true,avatarSeed:avatar.seed,avatarPortrait:avatar.portrait,avatarImage:validAvatarImage(avatar.image)?avatar.image:undefined}:undefined);
 const archive=parseArchive({...source,settings});
 let dinner:string|undefined;
 if(raw.dinner3d!==undefined&&raw.dinner3d!==null){
  const {SaveSchema}=await import('@/features/dinner/lib/engine');
  const parsed=SaveSchema.safeParse(raw.dinner3d);
  if(!parsed.success)throw new Error('backup-dinner');
  dinner=JSON.stringify(parsed.data);
 }
 return {archive,dinner};
}
/** Different records sharing an ID are ambiguous. Preserve both input files
 * and require explicit replacement rather than silently choosing a branch. */
export function mergeArchives(current:Archive,incoming:Archive):Archive{
 const combine=<T extends {id:string}>(a:T[],b:T[])=>{
  const result=[...a];for(const value of b){const old=result.find(v=>v.id===value.id);if(old){if(JSON.stringify(old)!==JSON.stringify(value))throw new Error('backup-conflict');}else result.push(value);}return result;
 };
 const sessions=combine(current.sessions,incoming.sessions).sort((a,b)=>b.startedAt-a.startedAt);
 return {...current,profile:current.profile??incoming.profile,sessions,customScenarios:combine(current.customScenarios,incoming.customScenarios),bookmarks:[...new Set([...current.bookmarks,...incoming.bookmarks])],practiceDays:[...new Set([...current.practiceDays,...incoming.practiceDays])],proficiency:estimateProficiency(sessions as Session[],{...incoming.proficiency,...current.proficiency}),patternInsight:null};
}
export function downloadArchive(archive:Archive){
 const url=URL.createObjectURL(new Blob([JSON.stringify({state:archive,version:0,dinner3d:dinnerBackup()},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`socialcoach-before-restore-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

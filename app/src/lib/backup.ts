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
 const legacySettings=source.settings===undefined;
 let dinner:string|undefined,dinnerOriginal:string|undefined,dinnerIssue:'unreadable'|'invalid'|undefined;
 if(raw.dinner3d!==undefined&&raw.dinner3d!==null){
  const {SaveSchema}=await import('@/features/dinner/lib/engine');
  const parsed=SaveSchema.safeParse(raw.dinner3d);
  if(parsed.success)dinner=JSON.stringify(parsed.data);
  else{
   const preserved=raw.dinner3d as {unreadable?:unknown};
   const unreadable=typeof preserved?.unreadable==='string';
   dinnerOriginal=unreadable?preserved.unreadable as string:JSON.stringify(raw.dinner3d);
   dinnerIssue=unreadable?'unreadable':'invalid';
  }
 }
 return {archive,legacySettings,dinner,dinnerOriginal,dinnerIssue};
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
/** The one backup format: the full archive envelope (settings included) plus the 3D save. */
export function downloadArchive(archive:Archive,name=`socialcoach-before-restore-${Date.now()}.json`){
 const url=URL.createObjectURL(new Blob([JSON.stringify({state:archive,version:0,dinner3d:dinnerBackup(),exportedAt:new Date().toISOString()},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
/** Consent and device preferences belong to this device. A backup restores records, never re-enables telemetry. */
export function restoredSettings(current:Archive['settings'],backup:{archive:Archive;legacySettings:boolean}):Archive['settings']{
 const incoming=backup.archive.settings;
 const base=backup.legacySettings?{...current,avatarSeed:incoming.avatarSeed,avatarPortrait:incoming.avatarPortrait,avatarImage:incoming.avatarImage}:incoming;
 return current.telemetry===false?{...base,telemetry:false}:base;
}

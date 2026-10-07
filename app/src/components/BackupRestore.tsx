"use client";
import {useRef,useState} from 'react';
import {Upload} from 'lucide-react';
import {Button,Sheet} from './ui';
import {pick} from '@/lib/i18n';
import {parseArchive} from '@/lib/archive';
import {useApp,useLang} from '@/store/useApp';
import {DINNER_SAVE_KEY} from '@/features/dinner/storage';
import type {decodeBackup} from '@/lib/backup';
const copy={
 title:{zh:'恢复备份',en:'Restore a backup'},hint:{zh:'先预览，再选择合并或替换。',en:'Preview, then merge or replace.'},
 privacy:{zh:'文件只在设备内处理。恢复前会下载当前档案；请确认文件已保存。',en:'The file stays on this device. Your current archive is downloaded before restoration; check that it is saved.'},
 summary:{zh:'备份包含 {n} 场练习、{m} 个自定义场景。',en:'The backup contains {n} practices and {m} custom scenarios.'},
 merge:{zh:'合并练习记录',en:'Merge practice records'},replace:{zh:'替换当前档案',en:'Replace current records'},
 mergeNote:{zh:'合并保留当前资料、设置和 3D 局；同 ID 内容不同的记录需要单独处理。替换会恢复备份中的资料。3D 局可在主档案保存成功后单独恢复。',en:'Merge keeps your current profile, settings and 3D practice. Different records sharing an ID require separate handling. Replace restores the backup’s profile. Its 3D practice can be restored separately after the main archive saves.'},
 confirm:{zh:'确认下载已保存，再恢复',en:'Confirm the download, then restore'},done:{zh:'记录已恢复到当前窗口，请留意顶部保存状态。',en:'Records are restored in this window. Check the save status at the top.'},
 error:{zh:'备份版本、结构或 3D 档案无法核实，当前档案未改动。',en:'The backup version, structure or 3D save could not be verified. Your current archive is unchanged.'},
 conflict:{zh:'有同 ID、内容不同的记录，合并未执行。请保留两份备份，或明确选择替换。',en:'Some records share an ID but differ. Merge was not applied. Keep both backups or explicitly choose Replace.'},
 download:{zh:'下载当前档案并准备恢复',en:'Download current records and prepare restoration'},
 damagedDinner:{zh:'文字档案可恢复。备份中的 3D 记录未通过校验，将保留原件供你下载，不会写入当前 3D 局。',en:'The main archive can be restored. Its 3D record could not be verified. Keep the original download; it will not replace your current 3D practice.'},
 downloadDinner:{zh:'下载未通过校验的 3D 原件',en:'Download the unverified 3D original'},
};
export function BackupRestore(){
 const lang=useLang(),input=useRef<HTMLInputElement>(null),saveIssue=useApp(s=>s.saveIssue);
 const [dinner,setDinner]=useState<string|null>(null);
 const [quarantined,setQuarantined]=useState<string|null>(null);
 const downloadOriginal=(text:string)=>{const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='SocialCoach-3D-original.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const [backup,setBackup]=useState<Awaited<ReturnType<typeof decodeBackup>>|null>(null),[error,setError]=useState<string|null>(null),[ready,setReady]=useState(false),[mode,setMode]=useState<'merge'|'replace'>('merge');
 const selection=useRef(0);
 const choose=async(file:File)=>{const ticket=++selection.current;setBackup(null);setError(null);setReady(false);try{if(file.size>20*1024*1024)throw Error('size');const {decodeBackup}=await import('@/lib/backup');const result=await decodeBackup(await file.text());if(ticket===selection.current)setBackup(result);}catch{if(ticket===selection.current)setError(pick(copy.error,lang));}};
 const prepare=async()=>{try{const {downloadArchive}=await import('@/lib/backup');downloadArchive(parseArchive(useApp.getState()));setReady(true);}catch{setError(pick(copy.error,lang));}};
 const restore=async()=>{if(!backup||!ready)return;try{
  const {mergeArchives}=await import('@/lib/backup');
  const current=parseArchive(useApp.getState()),archive=mode==='merge'?mergeArchives(current,backup.archive):backup.archive;
  const saved=await useApp.getState().restoreArchive(archive,mode==='replace');
  if(!saved){setError(pick({zh:'恢复结果尚未保存，设备中的原档案仍被保留。关闭预览，先处理顶部保存提示。',en:'The restored records have not been saved. The original device archive is retained. Close this preview and resolve the save notice at the top.'},lang));return;}
  setDinner(mode==='replace'?backup.dinner??null:null);setQuarantined(backup.dinnerOriginal??null);setBackup(null);setReady(false);setError(pick(copy.done,lang));
 }catch(e){setError(pick(e instanceof Error&&e.message==='backup-conflict'?copy.conflict:copy.error,lang));}};
 return <><input ref={input} type="file" accept="application/json,.json" className="sr-only" aria-label={pick(copy.title,lang)} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void choose(file);}}/>
  <button onClick={()=>input.current?.click()} className="press w-full flex items-center gap-3 px-4 min-h-16 py-3.5 text-left text-[14px] font-medium"><Upload size={17} className="text-ink-3"/><span>{pick(copy.title,lang)}<span className="block font-normal text-[12px] text-ink-3 mt-1">{pick(copy.hint,lang)}</span></span></button>
  {dinner&&!backup&&<button disabled={!!saveIssue} className="press underline px-4 min-h-11" onClick={()=>{try{localStorage.setItem(DINNER_SAVE_KEY,dinner);setDinner(null);}catch{setError(pick(copy.error,lang));}}}>{pick({zh:'主档案已保存，恢复备份中的 3D 局',en:'Main archive saved; restore its 3D practice'},lang)}</button>}
  {error&&!backup&&<p role="status" className="px-4 pb-3 text-[13px] text-ink-2">{error}</p>}
  {quarantined&&!backup&&<div className="px-4 pb-3 text-[13px] text-ink-2"><p>{pick(copy.damagedDinner,lang)}</p><button className="press underline min-h-11" onClick={()=>downloadOriginal(quarantined)}>{pick(copy.downloadDinner,lang)}</button></div>}
  <Sheet open={!!backup} onClose={()=>{selection.current++;setBackup(null);setReady(false);}} title={pick(copy.title,lang)}><div className="flex flex-col gap-4 pt-2">
   <p>{pick(copy.summary,lang).replace('{n}',String(backup?.archive.sessions.length??0)).replace('{m}',String(backup?.archive.customScenarios.length??0))}</p><p className="text-[13px] text-ink-2">{pick(copy.privacy,lang)}</p>
   <fieldset className="flex flex-col gap-2"><label><input type="radio" name="restore-mode" checked={mode==='merge'} onChange={()=>{setMode('merge');setReady(false);}}/> {pick(copy.merge,lang)}</label><label><input type="radio" name="restore-mode" checked={mode==='replace'} onChange={()=>{setMode('replace');setReady(false);}}/> {pick(copy.replace,lang)}</label></fieldset>
   <p className="text-[13px] text-ink-2">{pick(copy.mergeNote,lang)}</p>
   {backup?.dinnerIssue&&<div role="status" className="text-[13px] text-ink-2"><p>{pick(copy.damagedDinner,lang)}</p><button className="press underline min-h-11" onClick={()=>downloadOriginal(backup.dinnerOriginal!)}>{pick(copy.downloadDinner,lang)}</button></div>}
   {error&&<p role="alert" className="text-[13px] text-danger">{error}</p>}
   {!ready?<Button block onClick={()=>void prepare()}>{pick(copy.download,lang)}</Button>:<Button block onClick={()=>void restore()}>{pick(copy.confirm,lang)}</Button>}
  </div></Sheet>
 </>;
}

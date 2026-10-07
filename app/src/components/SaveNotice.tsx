"use client";
import {useState} from 'react';
import {useApp,useLang} from '@/store/useApp';
import {pick} from '@/lib/i18n';
import {ArchiveSchema} from '@/lib/archive';
import type {Lang} from '@/data/taxonomy';

const copy={
 title:{zh:'这次进度尚未保存到设备',en:'Your latest progress has not been saved'},
 quota:{zh:'设备存储空间不足。当前进度仍在这个窗口中，请先下载，再释放空间并重试。',en:'Device storage is full. Your progress remains in this window. Download it, free storage, then retry.'},
 unavailable:{zh:'浏览器暂时不允许保存。当前进度仍在这个窗口中，请先下载，并检查存储权限。',en:'Your browser is preventing saves. Your progress remains in this window. Download it and check storage permissions.'},
 conflict:{zh:'这个窗口暂时不能保存。当前进度与设备档案都被保留。先下载这里的记录，再重新读取设备档案；若另一窗口正在编辑，请先关闭它。',en:'This window cannot save yet. Your progress and device records are retained. Download your progress, then load the device records again. If another window is editing, close it first.'},
 download:{zh:'下载本窗口进度',en:'Download this window’s progress'},retry:{zh:'重新保存',en:'Retry saving'},load:{zh:'已下载，读取设备档案',en:'Downloaded; load device records'},
 error:{zh:'下载没有成功，请保留这个窗口并重试。',en:'The download failed. Keep this window open and retry.'},
};
export function SaveNotice({lang:language}:{lang?:Lang}={}){
 const mainLang=useLang(),lang=language??mainLang,issue=useApp(s=>s.saveIssue);
 const [backedUp,setBackedUp]=useState(false),[failed,setFailed]=useState(false);
 if(!issue)return null;
 const download=()=>{try{
  const state=ArchiveSchema.parse(useApp.getState());
  const url=URL.createObjectURL(new Blob([JSON.stringify({state,version:0},null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='socialcoach-unsaved.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setBackedUp(true);setFailed(false);
 }catch{setFailed(true);}};
 return <div role="alert" className="bg-card border-b border-line px-5 py-3 flex flex-col gap-2">
  <strong className="text-[14px]">{pick(copy.title,lang)}</strong><p className="text-[13px] text-ink-2">{pick(copy[issue],lang)}</p>
  <div className="flex flex-wrap gap-3"><button className="press underline min-h-11" onClick={download}>{pick(copy.download,lang)}</button>
  {issue==='conflict'?<button className="press underline min-h-11 disabled:opacity-40" disabled={!backedUp} onClick={()=>{setBackedUp(false);void useApp.persist.rehydrate();}}>{pick(copy.load,lang)}</button>:<button className="press underline min-h-11" onClick={useApp.getState().retrySave}>{pick(copy.retry,lang)}</button>}</div>
  {failed&&<p>{pick(copy.error,lang)}</p>}
 </div>;
}

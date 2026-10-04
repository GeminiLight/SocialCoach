'use client';
import {useEffect,useRef,useState,type RefObject} from 'react';
import {Paperclip,ArrowRight} from 'lucide-react';
import {Button,Sheet} from './ui';
import {pick} from '@/lib/i18n';
import type {Lang} from '@/data/taxonomy';
import {buildRehearsalDescription,rehearsalFields,MAX_REHEARSAL_CHARS,type RehearsalDraft,type RehearsalField} from '@/lib/rehearsal-input';
import {validateAttachment,extractAttachment} from '@/lib/local-attachment';

const L={
 details:{zh:'补充背景（可选）',en:'Add context (optional)'},
 detailsNote:{zh:'只填对这场对话有用的部分。留空的内容会保持未知。',en:'Fill only what matters for this conversation. Blank fields stay unknown.'},
 attach:{zh:'从文件或聊天截图提取',en:'Read a file or chat screenshot'},
 limits:{zh:'TXT、Markdown、DOCX、PDF 或 PNG/JPG/WebP · 每份 ≤8MB · PDF ≤20页',en:'TXT, Markdown, DOCX, PDF or PNG/JPG/WebP · ≤8MB each · PDF ≤20 pages'},
 local:{zh:'原文件留在设备上。提取后可删改，只发送你最后确认的文字。首次读图需加载本地识别工具。',en:'The file stays on this device. Edit the extracted text; only the text you confirm is sent. The first image requires loading the local reading tools.'},
 reading:{zh:'正在设备上提取文字…',en:'Reading text on this device…'},
 fileTitle:{zh:'检查提取的文字',en:'Review extracted text'},
 extractionNote:{zh:'识别可能出错。请核对谁说了什么，删除姓名、联系方式或不想发送的内容。',en:'Extraction can make mistakes. Check who said what and remove names, contact details or anything you do not want to send.'},
 add:{zh:'加入背景',en:'Add to context'},
 attachmentLabel:{zh:'经我核对的材料：',en:'Source text I have reviewed:'},
 reviewTitle:{zh:'确认这场对话的背景',en:'Confirm the rehearsal context'},
 reviewNote:{zh:'下面是将发送给当前模型的全部处境描述。你可以继续删改；原文件、截图和文件名不会发送。',en:'This is the full situation description to send to your selected model. You can edit it; original files, screenshots and filenames are not sent.'},
 description:{zh:'发送的处境描述',en:'Situation description to send'},
 confirm:{zh:'确认发送并生成',en:'Confirm and generate'},
 cancel:{zh:'取消',en:'Cancel'},
 tooLong:{zh:'请选择最相关的内容，合计控制在 8000 字以内。没有自动截断。',en:'Keep the relevant parts within 8,000 characters. Nothing was automatically truncated.'},
 failure:{zh:'这份文件暂时无法提取。可以换一份，或直接粘贴需要练习的文字。原草稿仍保留。',en:'This file could not be read. Try another file or paste the relevant text. Your draft is preserved.'},
 errors:{size:{zh:'文件需小于 8MB。',en:'Use a file smaller than 8MB.'},format:{zh:'请选择列表中的文件格式。',en:'Choose one of the listed file formats.'},empty:{zh:'文件为空，请换一份。',en:'This file is empty; choose another.'},pages:{zh:'PDF 超过20页，请只保留相关部分。',en:'This PDF exceeds 20 pages; use only the relevant pages.'},pixels:{zh:'图片分辨率过大，请裁切到相关聊天内容。',en:'This image is too large; crop it to the relevant conversation.'},'no-text':{zh:'没有提取到文字。扫描 PDF 可改用截图，或直接粘贴文字。',en:'No text was found. Use an image for a scanned PDF or paste the text.'}},
 draftSaved:{zh:'草稿已保留在此标签页',en:'Draft saved in this tab'},
 draftUnsaved:{zh:'此浏览器暂不能保存草稿，离开前请复制。',en:'This browser cannot save the draft; copy it before leaving.'},
 descriptionLabel:{zh:'你想排练哪场对话？',en:'Which conversation do you want to rehearse?'},
 placeholder:{zh:'对方是谁？发生了什么？你想说成什么？一句话也能开始。',en:'Who is involved? What happened? What do you want to achieve? One sentence is enough to start.'},
 original:{zh:'原图（仅在设备上显示）',en:'Original image (shown only on this device)'},
 extracted:{zh:'可编辑的提取文字',en:'Editable extracted text'},
 review:{zh:'检查背景并生成',en:'Review context and generate'},
 short:{zh:'至少写 8 个字，也可以只填写下面的分项。',en:'Use at least 8 characters, including any optional fields below.'},
};

export function RehearsalContext({draft,onChange,lang,disabled,draftSaved,textarea,onGenerate}:{draft:RehearsalDraft;onChange:(draft:RehearsalDraft)=>void;lang:Lang;disabled:boolean;draftSaved:boolean;textarea:RefObject<HTMLTextAreaElement|null>;onGenerate:(description:string)=>void}){
 const input=useRef<HTMLInputElement>(null),controller=useRef<AbortController|null>(null),fileUrl=useRef<string|null>(null);
 const [pending,setPending]=useState<string|null>(null),[image,setImage]=useState<string|null>(null),[reading,setReading]=useState(false),[progress,setProgress]=useState<number|null>(null),[error,setError]=useState<string|null>(null),[review,setReview]=useState<string|null>(null);
 const description=buildRehearsalDescription(draft,lang),text=(key:Exclude<keyof typeof L,'errors'>)=>pick(L[key],lang);
 const closeFile=()=>{controller.current?.abort();controller.current=null;setReading(false);setPending(null);setProgress(null);setImage(null);if(fileUrl.current)URL.revokeObjectURL(fileUrl.current);fileUrl.current=null;};
 useEffect(()=>()=>{controller.current?.abort();if(fileUrl.current)URL.revokeObjectURL(fileUrl.current);},[]);
 const read=async(file:File)=>{
  closeFile();setError(null);
  try{const kind=validateAttachment(file);if(kind==='image'){fileUrl.current=URL.createObjectURL(file);setImage(fileUrl.current);}}
  catch(e){const key=e instanceof Error?e.message:'';setError(key in L.errors?pick(L.errors[key as keyof typeof L.errors],lang):text('failure'));return;}
  const owned=new AbortController();controller.current=owned;setReading(true);setPending('');
  const timer=setTimeout(()=>owned.abort(),90_000);
  try{const result=await extractAttachment(file,{signal:owned.signal,onProgress:p=>{if(controller.current===owned&&!owned.signal.aborted)setProgress(p);}});if(controller.current===owned&&!owned.signal.aborted)setPending(result);}
  catch(e){if(controller.current===owned){closeFile();const key=e instanceof Error?e.message:'';setError(key in L.errors?pick(L.errors[key as keyof typeof L.errors],lang):text('failure'));}}
  finally{clearTimeout(timer);if(controller.current===owned){controller.current=null;setReading(false);}}
 };
 return <div className="flex flex-col gap-4">
  <label htmlFor="rehearsal-description" className="font-semibold text-[15px]">{text('descriptionLabel')}</label>
  <div className="writing-field overflow-hidden">
   <textarea id="rehearsal-description" ref={textarea} value={draft.text} onChange={e=>onChange({...draft,text:e.target.value})} rows={6} placeholder={text('placeholder')} className="block w-full px-5 pt-5 pb-3 bg-transparent text-base leading-[1.8] placeholder:text-ink-3 focus:outline-none" maxLength={MAX_REHEARSAL_CHARS} disabled={disabled}/>
   <p className="px-5 pb-4 text-[12px] text-ink-3" role="status">{draftSaved?text('draftSaved'):draft.text||Object.values(draft.fields).some(Boolean)?text('draftUnsaved'):''}</p>
  </div>
  <details className="inset p-4">
   <summary className="min-h-11 cursor-pointer font-medium text-[14px]">{text('details')}</summary>
   <p className="text-[13px] text-ink-3 leading-relaxed mb-4">{text('detailsNote')}</p>
   <div className="grid md:grid-cols-2 gap-4">{Object.entries(rehearsalFields).map(([key,label])=><label key={key} className={`flex flex-col gap-2 text-[14px] ${key==='facts'?'md:col-span-2':''}`}>{pick(label,lang)}<textarea value={draft.fields[key as RehearsalField]??''} onChange={e=>onChange({...draft,fields:{...draft.fields,[key]:e.target.value}})} rows={3} maxLength={MAX_REHEARSAL_CHARS} disabled={disabled} className="bg-card rounded-xl border border-line p-3 text-base leading-relaxed resize-y"/></label>)}</div>
  </details>
  <div>
   <input ref={input} type="file" className="hidden" accept=".txt,.md,.docx,.pdf,.png,.jpg,.jpeg,.webp" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void read(file);}}/>
   <Button type="button" variant="ghost" disabled={disabled||reading} onClick={()=>input.current?.click()}><Paperclip size={16}/>{text('attach')}</Button>
   <p className="text-[12px] text-ink-3 leading-relaxed mt-2">{text('limits')}</p>
   <p className="text-[13px] text-ink-2 leading-relaxed mt-2">{text('local')}</p>
  </div>
  {error&&<p role="alert" className="text-danger text-[14px]">{error}</p>}
  <div className="flex items-start justify-between gap-4 text-[13px] text-ink-3"><p>{description.length>MAX_REHEARSAL_CHARS?text('tooLong'):description.trim().length<8?text('short'):''}</p><span className="num shrink-0">{description.length} / {MAX_REHEARSAL_CHARS}</span></div>
  {!disabled&&<Button type="button" block size="lg" disabled={description.trim().length<8||description.length>MAX_REHEARSAL_CHARS||reading} onClick={()=>setReview(description)}>{text('review')}<ArrowRight size={18}/></Button>}
  <Sheet open={pending!==null} onClose={closeFile} title={text('fileTitle')} wide footer={<div className="flex flex-wrap gap-3 justify-end"><Button type="button" variant="ghost" onClick={closeFile}>{text('cancel')}</Button><Button type="button" disabled={reading||!pending?.trim()||description.length+(pending?.length??0)+text('attachmentLabel').length+4>MAX_REHEARSAL_CHARS} onClick={()=>{onChange({...draft,text:[draft.text,`${text('attachmentLabel')}\n${pending}`].filter(Boolean).join('\n\n')});closeFile();}}>{text('add')}</Button></div>}>
   {reading?<p role="status" className="text-[15px] py-6">{text('reading')}{progress!==null&&` ${Math.round(progress*100)}%`}</p>:<div className="flex flex-col gap-4">
    <p className="text-[14px] text-ink-2 leading-relaxed">{text('extractionNote')}</p>
    {image&&<details><summary className="text-[13px] cursor-pointer min-h-11">{text('original')}</summary>
     {/* eslint-disable-next-line @next/next/no-img-element -- local-only object URL, no image optimizer request */}
     <img src={image} alt={text('original')} className="max-h-80 max-w-full object-contain"/>
    </details>}
    <label className="text-[14px] flex flex-col gap-2">{text('extracted')}<textarea value={pending??''} onChange={e=>setPending(e.target.value)} rows={12} className="writing-field p-4 text-base leading-relaxed resize-y"/></label>
    <p className="text-[13px] text-ink-3">{pending?.length??0} {pending&&description.length+pending.length+text('attachmentLabel').length+4>MAX_REHEARSAL_CHARS?`· ${text('tooLong')}`:''}</p>
   </div>}
  </Sheet>
  <Sheet open={review!==null} onClose={()=>setReview(null)} title={text('reviewTitle')} wide footer={<div className="flex flex-wrap gap-3 justify-end"><Button type="button" variant="ghost" onClick={()=>setReview(null)}>{text('cancel')}</Button><Button requiresModel type="button" disabled={!review||review.trim().length<8||review.length>MAX_REHEARSAL_CHARS} onClick={()=>{if(review){const confirmed=review.trim();onChange({text:confirmed,fields:{}});setReview(null);onGenerate(confirmed);}}}>{text('confirm')}</Button></div>}>
   <p className="text-[14px] text-ink-2 leading-relaxed mb-4">{text('reviewNote')}</p>
   <label className="text-[14px] flex flex-col gap-2">{text('description')}<textarea value={review??''} onChange={e=>setReview(e.target.value)} rows={14} className="writing-field p-4 text-base leading-relaxed resize-y"/></label>
   <p className="text-[13px] text-ink-3 mt-3">{review?.length??0} / {MAX_REHEARSAL_CHARS}</p>
  </Sheet>
 </div>;
}

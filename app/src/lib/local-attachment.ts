export const MAX_ATTACHMENT_BYTES=8*1024*1024;
const MAX_EXPANDED_BYTES=12*1024*1024;
export function attachmentKind(name:string){
 const ext=name.split('.').at(-1)?.toLowerCase();
 return ext==='txt'||ext==='md'?'text':ext==='docx'?'docx':ext==='pdf'?'pdf':['png','jpg','jpeg','webp'].includes(ext??'')?'image':'unsupported';
}
export function validateAttachment(file:{name:string;size:number}){
 if(file.size<=0)throw Error('empty');
 if(file.size>MAX_ATTACHMENT_BYTES)throw Error('size');
 const kind=attachmentKind(file.name);if(kind==='unsupported')throw Error('format');return kind;
}
export function extractTextFile(bytes:Uint8Array){
 let text:string;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw Error('UTF-8');}
 if(text.includes('\0'))throw Error('binary');return text.trim();
}
/** Inspect central-directory lengths before a compressed document can allocate its expanded body. */
export function validateDocxArchive(bytes:Uint8Array){
 if(bytes.length<22)throw Error('DOCX');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(view.getUint32(i,true)===0x06054b50){end=i;break;}
 if(end<0||view.getUint16(end+4,true)!==0||view.getUint16(end+6,true)!==0)throw Error('DOCX');
 const count=view.getUint16(end+10,true),offset=view.getUint32(end+16,true);
 if(count===65535||count>1000||offset>=end)throw Error('DOCX');
 let cursor=offset,total=0,hasDocument=false;
 for(let i=0;i<count;i++){
  if(cursor+46>end||view.getUint32(cursor,true)!==0x02014b50)throw Error('DOCX');
  if(view.getUint16(cursor+8,true)&1)throw Error('encrypted');
  const expanded=view.getUint32(cursor+24,true),nameLength=view.getUint16(cursor+28,true),extra=view.getUint16(cursor+30,true),comment=view.getUint16(cursor+32,true);
  total+=expanded;if(total>MAX_EXPANDED_BYTES)throw Error('expanded');
  const next=cursor+46+nameLength+extra+comment;if(next>end)throw Error('DOCX');
  const name=new TextDecoder().decode(bytes.subarray(cursor+46,cursor+46+nameLength));if(name==='word/document.xml')hasDocument=true;
  cursor=next;
 }
 if(!hasDocument)throw Error('DOCX');
}

/** No file upload: parsers and OCR run in this browser; only user-reviewed text can enter rehearsal. */
export async function extractAttachment(file:File,{signal,onProgress}:{signal:AbortSignal;onProgress:(progress:number)=>void}):Promise<string>{
 const kind=validateAttachment(file);signal.throwIfAborted();
 const bytes=new Uint8Array(await file.arrayBuffer());signal.throwIfAborted();
 let text='';
 if(kind==='text')text=extractTextFile(bytes);
 if(kind==='docx'){
  validateDocxArchive(bytes);
  const {unzipSync}=await import('fflate');signal.throwIfAborted();
  const entries=unzipSync(bytes,{filter:entry=>entry.name==='word/document.xml'&&entry.originalSize<=MAX_EXPANDED_BYTES});
  const source=entries['word/document.xml'];if(!source)throw Error('DOCX');
  const xml=new DOMParser().parseFromString(new TextDecoder('utf-8',{fatal:true}).decode(source),'application/xml');
  if(xml.querySelector('parsererror'))throw Error('DOCX');
  const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  text=Array.from(xml.getElementsByTagNameNS(ns,'p')).map(p=>Array.from(p.getElementsByTagNameNS(ns,'t')).map(t=>t.textContent??'').join('')).join('\n');
 }
 if(kind==='pdf'){
  const pdf=await import('pdfjs-dist');signal.throwIfAborted();pdf.GlobalWorkerOptions.workerSrc='/local-reading/pdf.worker.min.mjs';
  const task=pdf.getDocument({data:bytes,disableFontFace:true,useSystemFonts:true,cMapUrl:'/local-reading/cmaps/',cMapPacked:true});
  const stop=()=>{void task.destroy();};signal.addEventListener('abort',stop,{once:true});
  try{
   const doc=await task.promise;if(doc.numPages>20)throw Error('pages');
   const pages=[];for(let i=1;i<=doc.numPages;i++){signal.throwIfAborted();const page=await doc.getPage(i),content=await page.getTextContent();pages.push(content.items.map(item=>'str' in item?item.str+('hasEOL' in item&&item.hasEOL?'\n':' '):'').join(''));onProgress(i/doc.numPages);page.cleanup();}
   text=pages.join('\n\n');
  }finally{signal.removeEventListener('abort',stop);await task.destroy();}
 }
 if(kind==='image'){
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('format');
  const image=await createImageBitmap(file);if(image.width*image.height>24_000_000){image.close();throw Error('pixels');}image.close();
  signal.throwIfAborted();const {createWorker,OEM,PSM}=await import('tesseract.js');
  const worker=await createWorker(['chi_sim','eng'],OEM.LSTM_ONLY,{workerPath:'/local-reading/worker.min.js',corePath:'/local-reading/core',langPath:'/local-reading/lang',cacheMethod:'none',logger:event=>{if(event.status==='recognizing text')onProgress(event.progress);}});
  const stop=()=>{void worker.terminate();};signal.addEventListener('abort',stop,{once:true});
  try{signal.throwIfAborted();await worker.setParameters({tessedit_pageseg_mode:PSM.AUTO,user_defined_dpi:'150'});const result=await worker.recognize(file);text=result.data.text;}
  finally{signal.removeEventListener('abort',stop);await worker.terminate();}
 }
 signal.throwIfAborted();if(!text.trim())throw Error('no-text');return text.trim();
}

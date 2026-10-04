import {pick} from './i18n';
import type {Lang} from '@/data/taxonomy';
export type ShareCard={lang:Lang;title:string;caption:string;quote:string;quality:string};
export function defaultShareCard(lang:Lang,stars:number):ShareCard{
 return {lang,title:pick({zh:'难开口的话，\n我练过一遍了。',en:'I practiced the\nconversation I was avoiding.'},lang),caption:pick({zh:'下次面对同样的压力，试着把想说的话说出来。',en:'Next time the pressure returns, I will try saying what I mean.'},lang),quote:'',quality:pick({zh:`本次沟通表现 · ${stars}/3（模型估计）`,en:`Communication · ${stars}/3 (model estimate)`},lang)};
}
export function shareCardText(card:ShareCard){return ['SocialCoach',card.title.replaceAll('\n',' '),card.quality,card.quote?`“${card.quote}”`:'',card.caption].filter(Boolean).join('\n');}
export async function copyShareText(value:string,clipboard:Pick<Clipboard,'writeText'>|undefined,timeoutMs=2000){
 if(!clipboard?.writeText)throw Error('Clipboard unavailable');
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{await Promise.race([clipboard.writeText(value),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('Clipboard unavailable')),timeoutMs);})]);}
 finally{if(timer)clearTimeout(timer);}
}
type ShareDevice={canShare?:(data:ShareData)=>boolean;share?:(data:ShareData)=>Promise<void>};
export async function sharePreparedFile(file:File,device:ShareDevice){
 if(!device.share||!device.canShare?.({files:[file]}))return 'unsupported' as const;
 try{await device.share({files:[file]});return 'shared' as const;}catch(error){if(error instanceof Error&&error.name==='AbortError')return 'cancelled' as const;throw error;}
}
/** Fit every character into its own region; never silently slice a private passage. */
export function fitCardText(value:string,box:{width:number;height:number;size:number;lineRatio:number},measure:(value:string,size:number)=>number){
 const text=value.replace(/\s+/g,' ').trim();
 const wrap=(size:number)=>{
  const lines:string[]=[];let line='';
  for(const char of Array.from(text)){
   if(line&&measure(line+char,size)>box.width){
    const space=line.lastIndexOf(' ');
    if(space>0&&/[a-z\d]/i.test(char)&&/[a-z\d]$/i.test(line)){lines.push(line.slice(0,space));line=line.slice(space+1)+char;}
    else{lines.push(line.trimEnd());line=char.trimStart();}
   }else line+=char;
  }
  if(line)lines.push(line);
  return lines;
 };
 let size=box.size,lines=wrap(size);
 while(size>1&&(lines.length*size*box.lineRatio>box.height||lines.some(line=>measure(line,size)>box.width))){size--;lines=wrap(size);}
 const lineHeight=size*box.lineRatio;
 return {size,lineHeight,lines,height:lines.length*lineHeight};
}
export async function renderShareCard(canvas:HTMLCanvasElement,card:ShareCard){
 await document.fonts.ready;
 const context=canvas.getContext('2d');if(!context)throw Error('Canvas unavailable');
 canvas.width=1080;canvas.height=1350;
 const css=getComputedStyle(document.documentElement),color=(name:string)=>css.getPropertyValue(name).trim();
 const sans='system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
 context.fillStyle=color('--paper');context.fillRect(0,0,1080,1350);
 context.fillStyle=color('--accent-deep');context.fillRect(72,72,6,52);
 context.fillStyle=color('--ink');context.font=`500 38px ${sans}`;context.fillText('SocialCoach',98,112);
 context.fillStyle=color('--ink-3');context.font=`24px ${sans}`;context.fillText(pick({zh:'练习记录',en:'PRACTICE NOTE'},card.lang),72,195);
 const block=(value:string,x:number,y:number,width:number,height:number,size:number)=>{
  const layout=fitCardText(value,{width,height,size,lineRatio:1.4},(text,fontSize)=>{context.font=`${fontSize}px ${sans}`;return context.measureText(text).width;});
  context.font=`${layout.size}px ${sans}`;
  layout.lines.forEach((line,i)=>context.fillText(line,x,y+layout.size+i*layout.lineHeight));
 };
 context.fillStyle=color('--ink');block(card.title,72,260,936,300,68);
 context.fillStyle=color('--line');context.fillRect(72,625,936,2);
 context.fillStyle=color('--accent-deep');block(card.quality,72,655,936,80,30);
 let captionY=840;
 if(card.quote){context.fillStyle=color('--inset');context.fillRect(72,760,936,290);context.fillStyle=color('--ink-2');block(`“${card.quote}”`,106,780,868,250,34);captionY=1080;}
 context.fillStyle=color('--ink-2');block(card.caption,72,captionY,936,card.quote?160:360,30);
 context.fillStyle=color('--ink-3');context.font=`24px ${sans}`;context.fillText(pick({zh:'想说的话，说出来。',en:'Say the thing you’ve been not saying.'},card.lang),72,1290);
 return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Image encoding failed')),'image/png'));
}

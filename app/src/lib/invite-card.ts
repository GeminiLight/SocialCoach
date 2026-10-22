import qrcode from 'qrcode-generator';
import type {Lang} from '@/data/taxonomy';
import {challengePublic,challengeUrl,invitationText,inviteCopy,type InviteDestination} from './challenge';
import {fitCardText} from './share-card';
import {pick} from './i18n';

export function inviteQR(lang:Lang,destination:InviteDestination) {
 const qr=qrcode(0,'M');qr.addData(challengeUrl(lang,destination),'Byte');qr.make();return qr;
}
export async function renderInviteCard(canvas:HTMLCanvasElement,lang:Lang,destination:InviteDestination) {
 await document.fonts.ready;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');
 canvas.width=1080;canvas.height=1350;
 const css=getComputedStyle(document.documentElement),color=(token:string)=>css.getPropertyValue(token).trim();
 const font='system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
 const block=(value:string,x:number,y:number,width:number,height:number,size:number,weight=400)=>{
  const layout=fitCardText(value,{width,height,size,lineRatio:1.45},(line,s)=>{ctx.font=`${weight} ${s}px ${font}`;return ctx.measureText(line).width;});
  ctx.font=`${weight} ${layout.size}px ${font}`;
  layout.lines.forEach((line,i)=>ctx.fillText(line,x,y+layout.size+i*layout.lineHeight));
 };
 ctx.fillStyle=color('--invite-paper');ctx.fillRect(0,0,1080,1350);
 ctx.fillStyle=color('--invite-accent');ctx.fillRect(72,76,6,40);
 ctx.fillStyle=color('--invite-ink');block('SocialCoach',98,70,650,65,36,600);
 ctx.fillStyle=color('--invite-muted');block(pick(inviteCopy.label,lang),72,166,936,60,27);
 ctx.fillStyle=color('--invite-ink');block(pick(inviteCopy.question,lang),72,260,936,190,76,600);
 const p=challengePublic(lang);
 ctx.fillStyle=color('--invite-panel');ctx.beginPath();ctx.roundRect(72,500,936,365,24);ctx.fill();
 ctx.fillStyle=color('--invite-accent');block(p.npc+' · '+p.npcRole,108,532,864,65,26);
 ctx.fillStyle=color('--invite-ink');block(`“${p.opening}”`,108,625,864,205,49,500);
 ctx.fillStyle=color('--invite-muted');block(pick({zh:'你的报告 16:30 要交。\n这一次，你会怎么回？',en:'Your own report is due at 16:30.\nWhat will you say?'},lang),72,925,480,190,34);
 const qr=inviteQR(lang,destination),count=qr.getModuleCount(),cell=Math.floor(350/(count+8)),width=(count+8)*cell,x=1008-width,y=920;
 ctx.fillStyle=color('--invite-paper');ctx.fillRect(x,y,width,width);
 ctx.fillStyle=color('--invite-ink');
 for(let r=0;r<count;r++)for(let c=0;c<count;c++)if(qr.isDark(r,c))ctx.fillRect(x+(c+4)*cell,y+(r+4)*cell,cell,cell);
 ctx.fillStyle=color('--invite-accent');block(pick({zh:'扫码，接这一句',en:'Scan to try it'},lang),x,y+width+12,width,50,26,500);
 ctx.fillStyle=color('--invite-muted');block(pick({zh:'公共虚构场景 · 不用注册 · 各自独立练习',en:'Fictional public scene · No sign-up · Your own practice'},lang),72,1268,936,50,24);
 return new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Image encoding failed')),'image/png'));
}

type Device={canShare?:(data:ShareData)=>boolean;share?:(data:ShareData)=>Promise<void>};
/** Invoked inside the user's click; a prepared image avoids losing user activation. */
export async function shareInvitation(lang:Lang,destination:InviteDestination,file:File|undefined,device:Device) {
 if(!device.share)return 'unsupported' as const;
 const link={title:'SocialCoach',text:invitationText(lang,destination).split('\n\n').slice(0,-1).join('\n\n'),url:challengeUrl(lang,destination)};
 const data=file&&device.canShare?.({files:[file]})?{files:[file]}:link;
 if(device.canShare&&!device.canShare(data))return 'unsupported' as const;
 try{await device.share(data);return 'opened' as const;}catch(e){if(e instanceof Error&&e.name==='AbortError')return 'cancelled' as const;throw e;}
}

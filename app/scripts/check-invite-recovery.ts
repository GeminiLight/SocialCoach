/** Focused browser fallbacks. Uses synthetic data and blocks all model and telemetry calls. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import jsQR from 'jsqr';
import {buildChallengeSession,challengePath,challengeUrl} from '../src/lib/challenge';
import {parseArchive} from '../src/lib/archive';
const sharp=createRequire(import.meta.url)(require.resolve('sharp',{paths:[require.resolve('next/package.json')]}));
const base=process.env.UX_BASE_URL??'http://localhost:3119',out=process.env.UX_ARTIFACTS??'/tmp/socialcoach-invite-recovery',name=`invite-recovery-${process.pid}`;
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));mkdirSync(out,{recursive:true});
function b(args:string[],input?:string){const r=JSON.parse(execFileSync('agent-browser',['--session',name,'--json',...args],{input,encoding:'utf8',timeout:45000}));assert(r.success,JSON.stringify(r.error));return r.data;}
const ev=(s:string)=>b(['eval','--stdin'],s).result,wait=(s:string)=>b(['wait','--fn',s]);
const click=(s:string)=>b(['find','role','button','click','--name',s,'--exact']);
async function main(){try{
 b(['open','about:blank']);for(const [path,body] of [['health','{"state":"available","serverKey":true,"requireByok":false}'],['track','{"available":false}']])b(['network','route','**/api/'+path,'--body',body]);
 b(['network','route','**/api/roleplay','--abort']);b(['network','route','**/api/assess','--abort']);
 b(['open',base+challengePath('zh')]);wait("!!document.querySelector('#challenge-landing button[data-variant=primary]:not(:disabled)')");
 const other={...buildChallengeSession('en'),challenge:undefined,id:'preserved-practice'},profile={name:'Existing learner',bio:'Private bio',goals:['communication'],contexts:[],lang:'en',createdAt:1};
 const value=JSON.stringify({version:0,state:parseArchive({profile,sessions:[other],settings:{tts:false,telemetry:false}})});
 ev(`localStorage.setItem('socialcoach.v1',${JSON.stringify(value)});true`);b(['reload']);wait("!!document.querySelector('#challenge-landing')");
 click('我也想邀请朋友');wait("!!document.querySelector('#invite-card img')");
 ev("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new DOMException('denied','NotAllowedError')}}});true");
 click('复制邀请');wait("document.querySelector('#invite-card [role=status]').textContent.includes('手动复制')");
 assert(ev("document.querySelector('#invite-card textarea').value.includes('https://socialcoach-ai.vercel.app/challenge/')"));
 ev("Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('cancel','AbortError')}});true");click('系统分享');wait("!Array.from(document.querySelectorAll('button')).find(x=>x.textContent.includes('系统分享')).disabled");assert.equal(ev("document.querySelector('#invite-card [role=status]').textContent"),'');
 ev("Object.defineProperty(navigator,'share',{configurable:true,value:undefined});true");click('系统分享');wait("document.querySelector('#invite-card [role=status]').textContent.includes('不支持')");
 ev("Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('denied','NotAllowedError')}});true");click('系统分享');wait("document.querySelector('#invite-card [role=status]').textContent.includes('未完成')");
 b(['press','Escape']);assert(ev("document.activeElement.textContent.includes('我也想邀请朋友')"));
 ev("window.__toBlob=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=function(cb){cb(null)};true");click('我也想邀请朋友');wait("document.querySelector('#invite-card').textContent.includes('图片暂未生成')");assert(ev("document.querySelector('#invite-card textarea').value.includes('https://')"));
 ev("HTMLCanvasElement.prototype.toBlob=window.__toBlob;true");click('重新生成图片');wait("!!document.querySelector('#invite-card img')");
 for(const label of ['English','China entry','中文','主站'])click(label);wait("!!document.querySelector('#invite-card img')");
 assert(ev("document.querySelector('#invite-card textarea').value.includes('/v1/zh')"));
 b(['press','Escape']);
 // Rapid activation followed by browser back must keep one practice and keep the old history/profile.
 ev("const b=Array.from(document.querySelectorAll('button')).find(x=>x.textContent.includes('我来试试'));b.click();b.click();true");wait("location.pathname.startsWith('/practice/')&&!!document.querySelector('textarea')");
 assert.equal(ev("JSON.parse(localStorage.getItem('socialcoach.v1')).state.sessions.length"),2);
 assert.equal(ev("JSON.parse(localStorage.getItem('socialcoach.v1')).state.profile.name"),'Existing learner');
 b(['back']);wait("!!document.querySelector('#challenge-landing')");assert(ev("Array.from(document.querySelectorAll('button')).some(x=>x.textContent.includes('继续我的这场挑战')&&!x.disabled)"));
 click('继续我的这场挑战');wait("location.pathname.startsWith('/practice/')");assert.equal(ev("JSON.parse(localStorage.getItem('socialcoach.v1')).state.sessions.length"),2);
 b(['open',base+'/challenge/office-quick-favor/v99/en']);wait("document.body.textContent.includes('This invitation is unavailable')");assert(!ev("location.pathname.includes('/onboarding')"));
 ev("localStorage.setItem('socialcoach.v1','{broken');true");b(['open',base+challengePath('zh')]);wait("!document.querySelector('#challenge-landing')");assert.equal(ev("localStorage.getItem('socialcoach.v1')"),'{broken');
 for(const lang of ['zh','en'] as const){const img=readFileSync(`public/invites/office-quick-favor-v1-${lang}.png`);for(const width of [360,540]){const {data,info}=await sharp(img).resize({width}).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(jsQR(new Uint8ClampedArray(data),info.width,info.height)?.data,challengeUrl(lang,'main'));}}
 writeFileSync(out+'/recovery.json',JSON.stringify({clipboardDenied:true,nativeCancel:true,nativeUnsupported:true,nativeFailure:true,imageFailureRetry:true,rapidLanguageDestination:true,keyboardFocusReturn:true,doubleClick:true,backResume:true,oldProfileHistoryPreserved:true,unknownVersion:true,corruptArchiveRetained:true,exportQrAt360And540:true},null,2));console.log(out);
}catch(error){console.error('Failure URL',b(['get','url']));console.error('Failure UI',b(['snapshot']));throw error;}finally{b(['close']);}}
void main().catch(e=>{console.error(e);process.exitCode=1;});

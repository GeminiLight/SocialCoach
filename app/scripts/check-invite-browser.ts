/** Synthetic isolated sender/receiver. Model and telemetry requests never leave this harness. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import jsQR from 'jsqr';
import {parseArchive} from '../src/lib/archive';
import {buildChallengeSession,challengeUrl,challengePath,invitationText} from '../src/lib/challenge';
import type {Report,Session} from '../src/lib/types';
const sharp=createRequire(import.meta.url)(require.resolve('sharp',{paths:[require.resolve('next/package.json')]}));
const base=process.env.UX_BASE_URL??'http://localhost:3119',out=process.env.UX_ARTIFACTS??'/tmp/socialcoach-invite-browser';
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));mkdirSync(out,{recursive:true});
const names=[`invite-sender-${process.pid}`,`invite-receiver-${process.pid}`],results:unknown[]=[];
const before='PRIVATE: 张三 13800000000',after='我的报告16:30截止。你具体需要我改哪些内容？';
const report:Report={stars:1,outcome:'partial',scoringVersion:2,ratings:[{skill:'communication',level:1,evidence:after,reason:'虚构测试观察。'}],verdict: '虚构测试复盘',verdictEvidence:after,summary:'虚构测试内容。',strengths:[{skill:'communication',evidence:after,behavior:'核实范围。'}],weaknesses:[],alternatives:[],knowledge:{theoryIds:[],caseIds:[],whyThis:''},reflectionQuestions:[],nextStep:'再核实范围。',deltas:{}};
function b(who:number,args:string[],input?:string){const r=JSON.parse(execFileSync('agent-browser',['--session',names[who],'--json',...args],{input,encoding:'utf8',timeout:45000}));assert(r.success,JSON.stringify(r.error));return r.data;}
const ev=(who:number,code:string)=>b(who,['eval','--stdin'],code).result;
const wait=(who:number,code:string)=>b(who,['wait','--fn',code]);
const click=(who:number,label:string)=>b(who,['find','role','button','click','--name',label,'--exact']);
const state=(who:number)=>ev(who,"JSON.parse(localStorage.getItem('socialcoach.v1')).state") as {sessions:Session[];profile:{name:string}|null};
const init=(who:number,lang:'zh'|'en',theme:'light'|'dark',sessions:Session[]=[])=>{
 const value=JSON.stringify({version:0,state:parseArchive({sessions,settings:{tts:false,telemetry:false,theme}})});
 ev(who,`localStorage.setItem('socialcoach.v1',${JSON.stringify(value)});sessionStorage.clear();true`);
 b(who,['errors','--clear']);b(who,['open',base+challengePath(lang)]);wait(who,"!!document.querySelector('#challenge-landing') && !document.querySelector('#challenge-landing button[data-variant=primary]').disabled");
};
async function png(who:number,lang:'zh'|'en',destination:'main'|'studio',label:string){
 const data=await ev(who,"(async()=>{const blob=await(await fetch(document.querySelector('#invite-card img').src)).blob();return await new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(blob)})})()");
 const bytes=Buffer.from(data.split(',')[1],'base64');writeFileSync(join(out,label+'.png'),bytes);
 const {data:raw,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.equal(jsQR(new Uint8ClampedArray(raw),info.width,info.height)?.data,challengeUrl(lang,destination));
 return bytes;
}
async function main(){
try{
 for(let who=0;who<2;who++){
  b(who,['open','about:blank']);
  for(const [path,body] of [['health',JSON.stringify({state:'available',serverKey:true,requireByok:false})],['track','{"available":false}'],['roleplay','@@meta\n{"objectives":[false,false],"ended":false,"stance":60,"revealed":false}\n@@tang\n先看看第三页吧，其他几页我也想请你看看。'],['assess',JSON.stringify(report)+'\n@@final\n'+JSON.stringify(report)]])b(who,['network','route',`**/api/${path}`,'--body',body]);
  b(who,['open',base+challengePath('zh')]);
 }
 for(const lang of ['zh','en'] as const)for(const theme of ['light','dark'] as const)for(const width of [375,1440]){
  for(let who=0;who<2;who++)b(who,['set','viewport',String(width),'900']);
  const source={...buildChallengeSession(lang),id:'sender-private',status:'assessed' as const,report:{...report,verdictEvidence:before,ratings:[],strengths:[]},revealSeen:true,messages:[{id:'op',role:'npc' as const,characterId:'tang',text:buildChallengeSession(lang).scenario.opening.text[lang],ts:1},{id:'private-id',role:'learner' as const,text:before,ts:2}]};
  init(0,lang,theme,[source]);
  // A real completed practice exposes the invite entry, separate from private practice-note sharing.
  ev(0,`const a=JSON.parse(localStorage.getItem('socialcoach.v1'));a.state.profile={name:'PRIVATE NAME',bio:'PRIVATE BIO',goals:['communication'],contexts:[],lang:${JSON.stringify(lang)},createdAt:1};localStorage.setItem('socialcoach.v1',JSON.stringify(a));true`);
  b(0,['open',base+'/practice/sender-private']);wait(0,"!!document.querySelector('section[aria-label] button')");
  click(0,lang==='zh'?'邀请朋友挑战同一场景':'Invite a friend to this scene');wait(0,"!!document.querySelector('#invite-card img')");
  assert(!ev(0,"document.querySelector('#invite-card').textContent.includes('PRIVATE')"));
  ev(0,"window.__copied='';Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async t=>{window.__copied=t}}});true");
  click(0,lang==='zh'?'复制邀请':'Copy invitation');wait(0,"!!window.__copied");assert.equal(ev(0,'window.__copied'),invitationText(lang,'main'));
  const image=await png(0,lang,'main',`card-${lang}-${theme}-${width}`);
  if(theme==='light'&&width===1440){mkdirSync('public/invites',{recursive:true});writeFileSync(`public/invites/office-quick-favor-v1-${lang}.png`,image);}
  click(0,lang==='zh'?'国内入口':'China entry');wait(0,`document.querySelector('#invite-card img')&&document.querySelector('#invite-card textarea').value.includes('modelscope.cn')`);
  // Read image only after the new link's generation completes.
  await png(0,lang,'studio',`card-studio-${lang}-${theme}-${width}`);
  b(0,['screenshot',join(out,`share-${lang}-${theme}-${width}.png`)]);
  const axe=b(0,['a11y','--selector','#invite-card','--tags','wcag2a,wcag2aa']);assert.equal(axe.counts.violations,0,JSON.stringify(axe.violations));
  b(0,['press','Escape']);assert.equal(state(0).sessions[0].messages[1].text,before);
  // A clean receiver has no sender identity, transcript, profile or imported score.
  init(1,lang,theme);assert.equal(state(1).profile,null);assert.equal(state(1).sessions.length,0);
  assert(!ev(1,"document.querySelector('#challenge-landing').textContent.includes('论证逻辑')"));
  b(1,['screenshot',join(out,`landing-${lang}-${theme}-${width}.png`)]);
  const axeLanding=b(1,['a11y','--selector','#challenge-landing','--tags','wcag2a,wcag2aa']);assert.equal(axeLanding.counts.violations,0,JSON.stringify(axeLanding.violations));
  assert(ev(1,'document.documentElement.scrollWidth<=innerWidth'));
  click(1,lang==='zh'?'我来试试':'Let me try');wait(1,"!!document.querySelector('textarea')&&location.pathname.startsWith('/practice/')");
  let s=state(1).sessions[0];assert.equal(state(1).sessions.length,1);assert.equal(s.messages[0].text,s.scenario.opening.text[lang]);assert.equal(s.timed,false);assert.equal(s.challenge?.lang,lang);assert.equal(state(1).profile?.name,'');
  const id=s.id;
  b(1,['reload']);wait(1,"!!document.querySelector('textarea')");assert.equal(state(1).sessions[0].id,id);
  b(1,['open',base+challengePath(lang)]);wait(1,"!!document.querySelector('#challenge-landing')");click(1,lang==='zh'?'继续我的这场挑战':'Continue my challenge');wait(1,"!!document.querySelector('textarea')");assert.equal(state(1).sessions.length,1);
  b(1,['fill','textarea',after]);click(1,lang==='zh'?'发送':'Send');wait(1,"JSON.parse(localStorage.getItem('socialcoach.v1')).state.sessions[0].messages.length===3");
  b(1,['reload']);wait(1,"!!document.querySelector('textarea')");
  click(1,lang==='zh'?'收尾 / 复盘':'Finish / review');wait(1,"!!document.querySelector('dialog[open]')");
  click(1,lang==='zh'?'结束并复盘':'End and review');wait(1,"JSON.parse(localStorage.getItem('socialcoach.v1')).state.sessions[0].status==='assessed'");
  s=state(1).sessions[0];assert.equal(s.report?.verdictEvidence,after);assert.equal(s.challenge?.version,1);assert.equal(s.messages.length,3);
  assert.equal(state(0).sessions[0].id,'sender-private');
  for(let who=0;who<2;who++)assert.deepEqual(b(who,['errors']).errors,[],JSON.stringify(b(who,['errors'])));
  results.push({lang,theme,width,pageErrors:0,qr:true,copy:true,privateExcluded:true,freshReceiver:true,resume:true,review:true,axe:0});
 }
 writeFileSync(join(out,'browser.json'),JSON.stringify({base,models:'stubbed',groups:results},null,2));
 console.log(JSON.stringify({groups:results.length,output:out}));
}finally{for(let who=0;who<2;who++)b(who,['close']);}

}
void main().catch(e=>{console.error(e);process.exitCode=1;});

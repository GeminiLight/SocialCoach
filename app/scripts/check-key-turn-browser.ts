/** Disposable browser fixture; every model/telemetry request is intercepted. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {SCENARIOS} from '../src/data/corpus';
import {buildSession} from '../src/lib/session-utils';
import {parseArchive} from '../src/lib/archive';
import type {Report,Session} from '../src/lib/types';

const base=process.env.UX_BASE_URL??'http://localhost:4322';
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname)||process.env.UX_ALLOW_PUBLIC==='1');
const name=`socialcoach-key-turn-${process.pid}`,artifacts=process.env.UX_ARTIFACTS??join(tmpdir(),name);
mkdirSync(artifacts,{recursive:true});
const scenario=SCENARIOS.find(s=>s.id==='office-quick-favor')!;
const before='行，我先帮你改吧。',after='我自己的报告16:30截止。你希望我具体改哪部分？';
const report=(quote:string):Report=>({scoringVersion:2,ratings:[{skill:'communication',level:1,evidence:quote,reason:'虚构验收观察。'}],stars:1,outcome:'partial',verdictEvidence:quote,verdict:'虚构验收复盘。',summary:'虚构测试记录。',strengths:[{skill:'communication',evidence:quote,behavior:'说明自己的交付，并询问范围。'}],weaknesses:[],alternatives:[],knowledge:{theoryIds:[],caseIds:[],whyThis:''},reflectionQuestions:[],nextStep:'先确认范围。',deltas:{}});
const parent:Session={...buildSession(scenario,'arena','zh'),id:'key-turn-browser',status:'assessed',report:report(before),revealSeen:true,messages:[{id:'original-opening',role:'npc',characterId:'tang',text:scenario.opening.text.zh,ts:1},{id:'original-answer',role:'learner',text:before,ts:2},{id:'future',role:'npc',characterId:'tang',text:'老板说第三页的论证有问题。',ts:3}],startedAt:1};
function browser(args:string[],input?:string){const r=JSON.parse(execFileSync('agent-browser',['--session',name,'--json',...args],{input,encoding:'utf8',timeout:45000}));assert(r.success,JSON.stringify(r.error));return r.data;}
const evaluate=(code:string)=>browser(['eval','--stdin'],code).result;
const wait=(code:string)=>browser(['wait','--fn',code]);
const click=(label:string)=>browser(['find','role','button','click','--name',label,'--exact']);
const store=()=>evaluate("JSON.parse(localStorage.getItem('socialcoach.v1')).state") as {sessions:Session[];proficiency:unknown};
const attempts=()=>store().sessions[0].keyTurnAttempts!;
function routes(){
 browser(['network','unroute']);
 browser(['network','route','**/api/health','--body',JSON.stringify({state:'available',serverKey:true,requireByok:false})]);
 browser(['network','route','**/api/track','--body',JSON.stringify({available:false})]);
 browser(['network','route','**/api/roleplay','--body','@@meta\n{"objectives":[false,false],"ended":false,"stance":60,"revealed":false}\n@@tang\n第三页最要紧，但其他几页我也想请你看看。']);
 browser(['network','route','**/api/assess','--body',JSON.stringify(report(after))+'\n@@final\n'+JSON.stringify(report(after))]);
}
function openFixture(lang:'zh'|'en',theme:'light'|'dark'){
 const source={...parent,messages:[{...parent.messages[0],text:scenario.opening.text[lang]},...parent.messages.slice(1)]};
 const value=JSON.stringify({version:0,state:parseArchive({profile:{name:'Browser fixture',bio:'',goals:['communication'],contexts:[],lang,createdAt:1},sessions:[source],settings:{tts:false,telemetry:false,theme}})});
 evaluate(`localStorage.setItem('socialcoach.v1',${JSON.stringify(value)});sessionStorage.clear();true`);
 browser(['open',base+'/practice/'+parent.id]);wait("!!document.querySelector('#key-turn-entry')");
 wait(`document.documentElement.dataset.theme==='${theme}'`);
 click(lang==='zh'?'试试另一种回应':'Try another response');wait("!!document.querySelector('#retry-response')");
}
function fill(text:string){browser(['fill','#retry-response',text]);}
function scan(selector:string){const a=browser(['a11y','--selector',selector,'--tags','wcag2a,wcag2aa']);assert.equal(a.counts.violations,0,JSON.stringify(a.violations));return a.counts;}
const checks:unknown[]=[];
try{
 browser(['open','about:blank']);routes();browser(['open',base+'/onboarding']);
 for(const lang of ['zh','en'] as const)for(const theme of ['light','dark'] as const)for(const width of [375,1440]){
  browser(['set','viewport',String(width),'900']);openFixture(lang,theme);
  const originalProficiency=store().proficiency;
  assert(!evaluate("document.querySelector('#key-turn-practice').innerText.includes('老板说第三页的论证有问题')"));
  fill(after);browser(['reload']);wait("!!document.querySelector('#retry-response')");
  assert.equal(evaluate("document.querySelector('#retry-response').value"),after);
  browser(['screenshot',join(artifacts,`practice-${lang}-${theme}-${width}.png`)]);scan('#key-turn-practice');
  click(lang==='zh'?'接这一句':'Send your response');wait("document.querySelectorAll('#key-turn-practice section[aria-label] article').length===3&&!!document.querySelector('#retry-response')");
  fill('我只能先看一页、列出问题，不负责改稿。');click(lang==='zh'?'接这一句':'Send your response');
  wait("document.querySelectorAll('#key-turn-practice section[aria-label] article').length===5&&!!document.querySelector('#retry-response')");
  click(lang==='zh'?'看这次短练':'Review this attempt');wait("!!document.querySelector('#retry-comparison')");
  assert(evaluate(`document.querySelector('#retry-comparison').parentElement.innerText.includes(${JSON.stringify(before)})&&document.querySelector('#retry-comparison').parentElement.innerText.includes(${JSON.stringify(after)})`));
  const quotes=[before,after];
  for(const [index,quote] of quotes.entries()){
   browser(['click',`#retry-comparison + div > div:nth-child(${index+1}) button`]);wait("!!document.querySelector('dialog[open]')");
   assert(evaluate(`document.querySelector('dialog[open]').innerText.includes(${JSON.stringify(quote)})&&!document.querySelector('dialog[open]').innerText.includes(${JSON.stringify(quotes[1-index])})`));
   browser(['press','Escape']);
  }
  const saved=store();assert.equal(saved.sessions.length,1);assert.deepEqual(saved.sessions[0].report,parent.report);assert.deepEqual(saved.proficiency,originalProficiency);
  assert.equal(attempts()[0].status,'reviewed');assert.equal(attempts()[0].messages.length,4);
  browser(['reload']);wait("!!document.querySelector('#retry-comparison')");
  assert(evaluate('document.documentElement.scrollWidth<=innerWidth'));const a11y=scan('#key-turn-practice');
  evaluate('window.scrollTo({top:0,behavior:"instant"});true');browser(['screenshot',join(artifacts,`review-${lang}-${theme}-${width}.png`)]);
  click(lang==='zh'?'再换一种开口':'Try a different opening');wait("!!document.querySelector('#retry-response')");
  assert.equal(attempts().length,2);assert.equal(attempts()[1].messages.length,0);
  checks.push({lang,theme,width,draftRefresh:true,checkpoint:true,independentQuotes:true,originalPreserved:true,repeatedAttempt:true,a11y});console.log(`PASS ${lang}/${theme}/${width}`);
 }
 openFixture('zh','light');
 browser(['network','unroute','**/api/roleplay']);browser(['network','route','**/api/roleplay','--abort']);fill(after);click('接这一句');wait("!!document.querySelector('[role=alert]')");
 assert.equal(attempts()[0].messages.length,1);browser(['reload']);wait("document.body.innerText.includes('重新获取回复')");routes();click('重新获取回复');
 wait("!!document.querySelector('#retry-response')");assert.equal(attempts()[0].messages.length,2);
 browser(['network','unroute','**/api/assess']);browser(['network','route','**/api/assess','--abort']);click('看这次短练');wait("document.body.innerText.includes('重新生成短练回顾')");
 assert.equal(attempts()[0].status,'ended');browser(['reload']);wait("document.body.innerText.includes('重新生成短练回顾')");routes();click('重新生成短练回顾');wait("!!document.querySelector('#retry-comparison')");
 openFixture('zh','light');
 evaluate("window.__originalFetch=window.fetch;window.fetch=(url,options)=>String(url).includes('/api/roleplay')?new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')))):window.__originalFetch(url,options);true");
 fill(after);click('接这一句');wait("document.body.innerText.includes('暂停等待')");click('暂停等待');wait("document.body.innerText.includes('重新获取回复')");
 assert.equal(attempts()[0].messages.length,1);evaluate('window.fetch=window.__originalFetch;true');click('重新获取回复');wait("!!document.querySelector('#retry-response')");
 for(let i=1;i<4;i++){fill(`第${i+1}次：只看一页，不改稿。`);click('接这一句');wait(`document.querySelectorAll('#key-turn-practice section[aria-label] article').length===${1+(i+1)*2}&&!document.body.innerText.includes('正在回应你的这句话')`);}
 assert(!evaluate("!!document.querySelector('#retry-response')"));assert.equal(attempts()[0].messages.filter(m=>m.role==='learner').length,4);
 checks.push({failedReplyResumed:true,noDuplicateLearner:true,failedReviewResumed:true,cancelResumed:true,fourTurnLimit:true});
 writeFileSync(join(artifacts,'checks.json'),JSON.stringify(checks,null,2)+'\n');console.log(`PASS ${checks.length} groups; ${artifacts}`);
}catch(error){
 browser(['screenshot',join(artifacts,'failure.png')]);writeFileSync(join(artifacts,'failure.json'),JSON.stringify({error:String(error),page:evaluate('({url:location.href,text:document.body.innerText.slice(-5000)})')},null,2));throw error;
}finally{browser(['close']);}

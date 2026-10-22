/** Public SSR/hydration regression: URL language wins without changing the local profile. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {M} from '../src/lib/model-copy';
import {challengePath} from '../src/lib/challenge';
const base=process.env.UX_BASE_URL??'http://localhost:3120',out=process.env.UX_ARTIFACTS??'/tmp/socialcoach-invite-first-visit';
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));mkdirSync(out,{recursive:true});
const name=`invite-first-visit-${process.pid}`,results:unknown[]=[];
function b(args:string[],input?:string){const r=JSON.parse(execFileSync('agent-browser',['--session',name,'--json',...args],{input,encoding:'utf8',timeout:45000}));assert(r.success,JSON.stringify(r.error));return r.data;}
const ev=(code:string)=>b(['eval','--stdin'],code).result;
async function main(){try{
 b(['open','about:blank']);
 b(['network','route','**/api/health','--body',JSON.stringify({state:'unavailable',issue:'setup'})]);
 b(['network','route','**/api/track','--body','{"available":false}']);
 b(['open',base+challengePath('zh')]);
 // Click as soon as the public page appears: hydration must not swallow this action.
 b(['find','role','button','click','--name','我也想邀请朋友','--exact']);
 b(['wait','--fn',"!!document.querySelector('#invite-card img')"]);b(['press','Escape']);
 // Public HTML precedes archive hydration. Wait before seeding a test profile.
 b(['wait','--fn',"!!document.querySelector('button[aria-label=反馈]') && !!document.querySelector('#challenge-landing aside button')"]);
 for(const lang of ['zh','en'] as const)for(const existing of [false,true]){
  const profile=existing?{name:'Synthetic retained profile',bio:'',goals:['communication'],contexts:[],lang:lang==='en'?'zh':'en',createdAt:1}:null;
  const archive=JSON.stringify({version:0,state:{sessions:[],profile,settings:{tts:false,telemetry:false}}});
  ev(`localStorage.setItem('socialcoach.v1',${JSON.stringify(archive)});true`);
  b(['errors','--clear']);b(['console','--clear']);
  const html=await(await fetch(base+challengePath(lang))).text();assert(html.includes(M.checking[lang]),'Server notice must use URL language');
  b(['open',base+challengePath(lang)]);b(['wait','--fn',`document.querySelector('#challenge-landing aside')?.textContent.includes(${JSON.stringify(M.setup[lang])})`]);
  assert.equal(ev("document.querySelector('#challenge-landing button[data-variant=primary]').title"),M.disabled[lang]);
  assert.equal(ev('document.documentElement.lang'),lang==='zh'?'zh-CN':'en');
  assert.deepEqual(ev("JSON.parse(localStorage.getItem('socialcoach.v1')).state.profile"),profile);
  assert.deepEqual(b(['errors']).errors,[]);
  const consoleOutput=b(['console']);assert(!JSON.stringify(consoleOutput).includes('hydration')&&!JSON.stringify(consoleOutput).includes('Hydration'),JSON.stringify(consoleOutput));
  b(['find','role','button','click','--name',M.title[lang],'--exact']);b(['wait','--fn',"!!document.querySelector('dialog[open]')"]);
  assert(ev(`document.querySelector('dialog[open]').textContent.includes(${JSON.stringify(M.connect[lang])})`));
  results.push({lang,existing,profilePreserved:true,serverLanguage:true,noticeAndButtonLanguage:true,modelSheetLanguage:true,pageErrors:0});
  b(['press','Escape']);
 }
 writeFileSync(join(out,'first-visit.json'),JSON.stringify({base,models:'unavailable fixture; no generation',firstClickPreview:true,groups:results},null,2));console.log(JSON.stringify({groups:results.length,output:out}));
}finally{b(['close']);}}
void main().catch(e=>{console.error(e);process.exitCode=1});

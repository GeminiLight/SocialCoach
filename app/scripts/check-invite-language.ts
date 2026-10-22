/** Invitations choose interface language without changing private practice records. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {buildChallengeSession,challengePath} from '../src/lib/challenge';
import {parseArchive} from '../src/lib/archive';
import {M} from '../src/lib/model-copy';
import {t} from '../src/lib/i18n';
const base=process.env.UX_BASE_URL??'http://127.0.0.1:4339',out=process.env.UX_ARTIFACTS??'/tmp/socialcoach-invite-language',name=`invite-language-${process.pid}`;
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));mkdirSync(out,{recursive:true});
function b(args:string[],input?:string){const r=JSON.parse(execFileSync('agent-browser',['--session',name,'--json',...args],{input,encoding:'utf8',timeout:45000}));assert(r.success,JSON.stringify(r.error));return r.data;}
const ev=(s:string)=>b(['eval','--stdin'],s).result,wait=(s:string)=>b(['wait','--fn',s]);
const click=(s:string)=>b(['find','role','button','click','--name',s,'--exact']);
try{
 b(['open','about:blank']);
 for(const [path,body] of [['health','{"state":"unavailable","serverKey":false,"requireByok":true,"issue":"setup"}'],['track','{"available":false}']])b(['network','route','**/api/'+path,'--body',body]);
 for(const api of ['roleplay','assess','feedback'])b(['network','route','**/api/'+api,'--abort']);
 b(['open',base+challengePath('en')]);
 // The landing HTML is visible before archive hydration. Seed only after it completes.
 wait("!!document.querySelector('button[aria-label=Feedback]') && !!document.querySelector('#challenge-landing aside button')");
 for(const lang of ['en','zh'] as const){
  const stored=lang==='en'?'zh':'en';
  const session={...buildChallengeSession(stored),challenge:undefined,id:'existing-private-practice'};
  const raw=JSON.stringify({version:0,state:parseArchive({profile:{name:'Private learner',bio:'Private biography',goals:['communication'],contexts:[],lang:stored,createdAt:1},sessions:[session],settings:{tts:false,telemetry:false}})});
  ev(`localStorage.setItem('socialcoach.v1',${JSON.stringify(raw)});true`);b(['open',base+challengePath(lang)]);
  wait("!!document.querySelector('#challenge-landing aside button')");
  assert.equal(ev('document.documentElement.lang'),lang==='en'?'en':'zh-CN');
  assert.equal(ev("localStorage.getItem('socialcoach.v1')"),raw);
  assert.equal(ev("document.querySelector('#challenge-landing aside button').textContent"),M.title[lang]);
  assert.equal(ev("document.querySelector('#challenge-landing button[disabled][title]').title"),M.disabled[lang]);
  click(M.title[lang]);wait("!!document.querySelector('dialog[open]')");
  assert(ev(`document.querySelector('dialog[open]').textContent.includes(${JSON.stringify(M.intro[lang])})`));
  assert(ev(`!!document.querySelector('dialog[open] button[aria-label="${lang==='en'?'Close':'关闭'}"]')`));
  b(['press','Escape']);click(lang==='en'?'Feedback':'反馈');wait("!!document.querySelector('dialog[open]')");
  assert(ev(`document.querySelector('dialog[open]').textContent.includes(${JSON.stringify(lang==='en'?'Leave a little feedback':'留一句反馈')})`));b(['press','Escape']);
  assert.equal(ev("localStorage.getItem('socialcoach.v1')"),raw);
  b(['open',base+`/challenge/office-quick-favor/v99/${lang}`]);
  wait(`document.body.textContent.includes(${JSON.stringify(lang==='en'?'This invitation is unavailable':'这张邀请暂时打不开')})`);assert.equal(ev('document.documentElement.lang'),lang==='en'?'en':'zh-CN');
  assert.equal(ev("localStorage.getItem('socialcoach.v1')"),raw);
 }
 ev("localStorage.setItem('socialcoach.v1','{broken');true");b(['open',base+challengePath('en')]);
 wait(`document.body.textContent.includes(${JSON.stringify(t('en','storage_title'))})`);
 click('中文');wait(`document.body.textContent.includes(${JSON.stringify(t('zh','storage_title'))})`);assert(ev("location.pathname.endsWith('/zh')"));
 click('English');wait(`document.body.textContent.includes(${JSON.stringify(t('en','storage_title'))})`);
 assert.equal(ev("localStorage.getItem('socialcoach.v1')"),'{broken');
 b(['open',base+'/onboarding']);wait("!!document.querySelector('.language-picker')");
 for(const lang of ['zh','en'] as const){click(lang==='zh'?'中文':'English');wait(`document.body.textContent.includes(${JSON.stringify(t(lang,'storage_title'))})`);}
 assert.equal(ev("localStorage.getItem('socialcoach.v1')"),'{broken');
 writeFileSync(out+'/language.json',JSON.stringify({bothLanguages:true,modelNotice:true,disabledHint:true,modelDialogAndClose:true,feedbackDialog:true,archiveUnchanged:true,unknownVersion:true,recoveryLanguageSwitch:true,ordinaryRecoveryLanguageSwitch:true,corruptArchiveRetained:true},null,2));console.log(out);
}finally{b(['close']);}

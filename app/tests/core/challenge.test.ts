import assert from 'node:assert/strict';
import {test} from 'node:test';
import jsQR from 'jsqr';
import {buildChallengeSession,canInvite,challengePath,challengePublic,challengeRef,challengeScene,challengeUrl,invitationText,pendingChallenge} from '../../src/lib/challenge';
import {inviteQR,shareInvitation} from '../../src/lib/invite-card';
import {parseArchive} from '../../src/lib/archive';
import {decodeBackup} from '../../src/lib/backup';
import {SCENARIOS} from '../../src/data/corpus';

test('published challenge uses a frozen sourced scenario; sessions are independent',()=>{
 const a=buildChallengeSession('zh'),b=buildChallengeSession('zh');
 assert.notEqual(a.id,b.id);assert.deepEqual(a.scenario,SCENARIOS.find(s=>s.id==='office-quick-favor'));
 a.scenario.opening.text.zh='changed';a.messages.push({id:'secret',role:'learner',text:'PRIVATE',ts:1});
 assert.notEqual(b.scenario.opening.text.zh,'changed');assert.equal(b.messages.length,0);
 assert.equal(b.learnerCharacterId,'you');assert.equal(b.timed,false);assert.equal(b.adaptation!.briefing,b.scenario.background.zh);
});
test('controlled invitation URLs carry only the public version and language',()=>{
 for(const lang of ['zh','en'] as const){
  assert(challengeRef('office-quick-favor','v1',lang));
  const main=new URL(challengeUrl(lang,'main')),studio=new URL(challengeUrl(lang,'studio'));
  assert.equal(main.pathname,challengePath(lang));assert.equal(main.search,'');assert.equal(main.hash,'');
  assert.equal(studio.searchParams.get('app_path'),main.pathname);assert.deepEqual([...studio.searchParams.keys()],['mode','app_path']);
 }
 for(const [id,v,l] of [['private','v1','zh'],['office-quick-favor','v2','zh'],['office-quick-favor','v1','zh?name=private']])assert.equal(challengeRef(id,v,l),null);
});
test('share projection excludes records, hidden facts and personalized adaptation',()=>{
 const s=buildChallengeSession('zh');s.messages=[{id:'private-id',role:'learner',text:'PRIVATE',ts:1}];s.adaptation!.briefing='PRIVATE';
 assert(canInvite(s));assert(!canInvite({...s,scenario:{...s.scenario,custom:true}}));assert(!canInvite({...s,scenario:{...s.scenario,source:'private'}}));
 for(const lang of ['zh','en'] as const){
  const p=JSON.stringify(challengePublic(lang)),text=invitationText(lang,'main');
  assert(!text.includes('PRIVATE'));assert(!text.includes(s.id));assert(!p.includes(challengeScene().characters.find(c=>c.hidden)!.hidden![lang]));
  assert(!p.includes('simulation'));assert(text.includes(challengeScene().opening.text[lang]));assert(text.endsWith(challengeUrl(lang,'main')));
 }
});
test('unfinished invitations resume only the same version and language; completed sessions start fresh',()=>{
 const zh=buildChallengeSession('zh'),en=buildChallengeSession('en');
 assert.equal(pendingChallenge([en,zh],'zh'),zh);assert.equal(pendingChallenge([{...zh,status:'assessed'},en],'zh'),undefined);
 assert.equal(pendingChallenge([{...zh,challenge:undefined}],'zh'),undefined);
});
test('invitation provenance survives archive exports; old archives still work',async()=>{
 const s=buildChallengeSession('en');
 const decoded=await decodeBackup(JSON.stringify({version:0,state:parseArchive({sessions:[s]})}));
 assert.deepEqual(decoded.archive.sessions[0].challenge,s.challenge);
 assert.equal(parseArchive({sessions:[{...s,challenge:undefined}]}).sessions[0].challenge,undefined);
 assert.throws(()=>parseArchive({sessions:[{...s,challenge:{...s.challenge,version:99}}]}));
 assert.throws(()=>parseArchive({sessions:[{...s,scenario:{...s.scenario,custom:true}}]}));
});
test('all invitation QR variants decode to the exact public destination',()=>{
 for(const lang of ['zh','en'] as const)for(const destination of ['main','studio'] as const){
  const qr=inviteQR(lang,destination),n=qr.getModuleCount(),cell=5,size=(n+8)*cell,data=new Uint8ClampedArray(size*size*4).fill(255);
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(qr.isDark(r,c))for(let y=0;y<cell;y++)for(let x=0;x<cell;x++){const i=(((r+4)*cell+y)*size+(c+4)*cell+x)*4;data[i]=data[i+1]=data[i+2]=0;}
  assert.equal(jsQR(data,size,size)?.data,challengeUrl(lang,destination));
 }
});
test('native share uses prepared image or actual URL and preserves cancellation/failure',async()=>{
 const file=new File(['test'],'invite.png',{type:'image/png'}),calls:ShareData[]=[];
 const imageDevice={canShare:(d:ShareData)=>!!d.files,share:async(d:ShareData)=>{calls.push(d);}};
 assert.equal(await shareInvitation('zh','main',file,imageDevice),'opened');assert.deepEqual(calls.pop(),{files:[file]});
 await shareInvitation('en','studio',file,{canShare:d=>!d.files,share:async d=>{calls.push(d);}});
 assert.equal(calls.pop()!.url,challengeUrl('en','studio'));
 assert.equal(await shareInvitation('zh','main',file,{}),'unsupported');
 assert.equal(await shareInvitation('zh','main',file,{share:async()=>{throw new DOMException('cancel','AbortError');}}),'cancelled');
 await assert.rejects(shareInvitation('zh','main',file,{share:async()=>{throw Error('blocked');}}),/blocked/);
});

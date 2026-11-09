import assert from 'node:assert/strict';
import {test} from 'node:test';
import Anthropic from '@anthropic-ai/sdk';
import {SCENARIOS} from '../../src/data/corpus';
import {buildSession} from '../../src/lib/session-utils';
import {appearsVerbatim,hasQuote} from '../../src/lib/practice-policy';
import {decodeBackup,restoredSettings} from '../../src/lib/backup';
import {parseArchive} from '../../src/lib/archive';
import {TaskInputSchemas} from '../../src/lib/task-input';
import {toHttpError} from '../../src/lib/llm';
import {observedServerHealth,clearServerObservation} from '../../src/lib/server-model-observation';
import {fail} from '../../src/lib/api-utils';

test('a lone character or word is not evidence, but a whole short reply and a real phrase are',()=>{
 const lines=['好的，我明天先把报告发给你，周五前再补数据。','不行。','I can’t stay late tonight, but I can start early.'];
 for(const fragment of ['好','，','我','the','I'])assert.equal(hasQuote(fragment,lines),false,fragment);
 assert.equal(hasQuote('不行。',lines),true,'the learner’s entire reply');
 assert.equal(hasQuote('不行',lines),true,'the same reply without punctuation');
 assert.equal(hasQuote('我明天先把报告发给你',lines),true);
 assert.equal(hasQuote('can’t stay late',lines),true);
 assert.equal(hasQuote('我明天先把周报发给你',lines),false,'altered words never match');
 // Checking attributed words inside prose stays literal and lenient.
 assert.equal(appearsVerbatim('好',lines),true);
 assert.equal(appearsVerbatim('  ',lines),false);
});

test('a blank learner reply is rejected before it can reach the model',()=>{
 const scene=SCENARIOS.find(s=>s.characters.some(c=>c.playable))!;
 const learner=scene.characters.find(c=>c.playable)!.id;
 const input=(text:string)=>({scenario:scene,learnerCharacterId:learner,lang:'zh',messages:[{id:'a',role:'learner',text,ts:1}]});
 assert.equal(TaskInputSchemas.roleplay.safeParse(input('  \n ')).success,false);
 assert.equal(TaskInputSchemas.roleplay.safeParse(input('我想先确认一下时间。')).success,true);
});

test('an unexplained provider 400 tells this visitor but never disables the shared model',async()=>{
 clearServerObservation();
 const plain=Anthropic.APIError.generate(400,{type:'error',error:{type:'invalid_request_error',message:'text content blocks must contain non-whitespace text'}},undefined,new Headers());
 const result=toHttpError(plain);
 assert.equal(result.modelIssue,'model');
 assert.equal(result.serverWide,false);
 const response=fail(plain);
 assert.equal((await response.json()).modelIssue,'model');
 assert.equal(observedServerHealth(),undefined,'one request’s 400 must not poison /api/health');

 const missing=Anthropic.APIError.generate(404,{type:'error',error:{type:'not_found_error',message:'model: claude-x not found'}},undefined,new Headers());
 assert.equal(toHttpError(missing).serverWide,true);
 fail(missing);
 assert.equal(observedServerHealth()?.state,'unavailable','a confirmed model failure is still shared');
 clearServerObservation();
});

test('restoring a backup keeps this device’s settings and never re-enables telemetry',async()=>{
 const scene=SCENARIOS[0];
 const current=parseArchive({sessions:[],settings:{tts:false,theme:'dark',timed:true,patience:15,telemetry:false,avatarSeed:1}}).settings;
 // The former Settings export carried only an avatar.
 const legacy=await decodeBackup(JSON.stringify({profile:null,sessions:[buildSession(scene,'arena','zh')],avatar:{seed:7}}));
 assert.equal(legacy.legacySettings,true);
 const fromLegacy=restoredSettings(current,legacy);
 assert.equal(fromLegacy.telemetry,false);assert.equal(fromLegacy.theme,'dark');assert.equal(fromLegacy.timed,true);assert.equal(fromLegacy.avatarSeed,7);
 // A full backup restores its preferences, but consent stays with the device.
 const full=await decodeBackup(JSON.stringify({version:0,state:{sessions:[],settings:{tts:true,theme:'light',telemetry:true}}}));
 assert.equal(full.legacySettings,false);
 const fromFull=restoredSettings(current,full);
 assert.equal(fromFull.theme,'light');assert.equal(fromFull.telemetry,false);
 assert.equal(restoredSettings({tts:true},full).telemetry,true,'a device that never opted out follows the backup');
});

test('analytics tables follow the server month, so a forged timestamp cannot create tables',async()=>{
 Object.assign(process.env,{FEEDBACK_FEISHU_APP_ID:'id',FEEDBACK_FEISHU_APP_SECRET:'secret',FEEDBACK_FEISHU_BASE_TOKEN:'base'});
 delete process.env.ANALYTICS_FEISHU_TABLE_ID;
 const {deliverEvents,monthOf,tableNameFor}=await import('../../src/lib/analytics/feishu');
 const now=Date.UTC(2026,10,9),calls:{method:string;url:string}[]=[];
 const previous=globalThis.fetch;
 globalThis.fetch=(async(url:string|URL,init?:RequestInit)=>{
  const u=String(url),method=init?.method??'GET';calls.push({method,url:u});
  if(u.includes('tenant_access_token'))return Response.json({code:0,tenant_access_token:'t',expire:7200});
  if(method==='GET'&&/\/tables\?/.test(u))return Response.json({code:0,data:{items:[{table_id:'tbl_now',name:tableNameFor(monthOf(now))}],has_more:false}});
  if(method==='GET'&&u.includes('/fields'))return Response.json({code:0,data:{items:[],has_more:false}});
  return Response.json({code:0,data:{}});
 }) as typeof fetch;
 try{
  await deliverEvents({id:'00000000-0000-4000-8000-000000000009',device:'device-1',lang:'zh',events:[{name:'onboarding_done',ts:8.7e12},{name:'onboarding_done',ts:1}]} as never,now);
 }finally{globalThis.fetch=previous;}
 assert.equal(calls.some(c=>c.method==='POST'&&/\/tables$/.test(new URL(c.url).pathname)),false,'no table is created');
 const writes=calls.filter(c=>c.url.includes('batch_create'));
 assert.equal(writes.length,1);
 assert.match(writes[0].url,/tables\/tbl_now\/records\/batch_create\?client_token=00000000-0000-4000-8000-000000000009/);
});

test('a “practice again” link keeps an unreviewed 3D practice instead of overwriting it',async()=>{
 const {hasUnreviewedTurns}=await import('../../src/features/dinner/storage');
 const opening={role:'npc'},reply={role:'user'};
 assert.equal(hasUnreviewedTurns({messages:[opening,reply]}),true);
 assert.equal(hasUnreviewedTurns({messages:[opening,reply],reviewSessionId:'00000000-0000-4000-8000-000000000001'}),false,'a reviewed practice is already in history');
 assert.equal(hasUnreviewedTurns({messages:[opening]}),false,'an untouched opening has nothing to lose');
 assert.equal(hasUnreviewedTurns(null),false);
});

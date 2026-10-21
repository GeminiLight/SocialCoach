import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DEVICE_KEY} from '../../src/lib/analytics/keys';

test('pending analytics honor opt-out, reset and a new identity across an async probe',async()=>{
 const entries=new Map<string,string>(),sent:Blob[]=[];
 Object.defineProperty(globalThis,'window',{value:{addEventListener(){}},configurable:true});
 Object.defineProperty(globalThis,'document',{value:{addEventListener(){}},configurable:true});
 Object.defineProperty(globalThis,'localStorage',{value:{getItem:(k:string)=>entries.get(k)??null,setItem:(k:string,v:string)=>entries.set(k,v),removeItem:(k:string)=>entries.delete(k)},configurable:true});
 Object.defineProperty(globalThis,'navigator',{value:{sendBeacon:(_url:string,body:Blob)=>{sent.push(body);return true;}},configurable:true});
 let resolveProbe!:(response:Response)=>void;
 globalThis.fetch=()=>new Promise(resolve=>{resolveProbe=resolve;});
 const {useApp}=await import('../../src/store/useApp');
 const {track,flushTracking}=await import('../../src/lib/analytics/track');
 track({name:'onboarding_done',ts:1});
 const pending=flushTracking();
 useApp.getState().setSettings({telemetry:false});
 resolveProbe(Response.json({available:true}));
 await pending;
 assert.equal(sent.length,0,'turning off statistics during the probe must prevent sending');
 assert.equal(entries.has(DEVICE_KEY),false);

 useApp.getState().setSettings({telemetry:true});
 track({name:'onboarding_done',ts:2});
 useApp.getState().setSettings({telemetry:false});
 useApp.getState().setSettings({telemetry:true});
 await flushTracking();
 assert.equal(sent.length,0,'re-enabling cannot resurrect events discarded on opt-out');

 track({name:'onboarding_done',ts:3});
 const oldFlush=flushTracking();
 useApp.getState().reset();
 track({name:'onboarding_done',ts:4});
 await oldFlush;
 assert.equal(sent.length,0,'an old flush cannot consume a new identity’s queue');
 await flushTracking();
 assert.equal(sent.length,1);
 const batch=JSON.parse(await sent[0].text());
 assert.deepEqual(batch.events,[{name:'onboarding_done',ts:4}]);
});

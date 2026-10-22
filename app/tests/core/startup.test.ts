import assert from 'node:assert/strict';
import {test} from 'node:test';
import {runInNewContext} from 'node:vm';
import {STARTUP_SCRIPT} from '../../src/lib/startup';

function boot(path='/',stored='{}',language='en',unavailable=false){
 const dataset:Record<string,string>={},listeners=new Map<string,(event?:unknown)=>void>();
 let timeout:(()=>void)|undefined;
 runInNewContext(STARTUP_SCRIPT,{
  document:{documentElement:{dataset}},location:{pathname:path},navigator:{language},
  localStorage:{getItem:()=>{if(unavailable)throw Error('denied');return stored;}},
  setTimeout:(fn:()=>void,delay:number)=>{assert.equal(delay,12000);timeout=fn;return 1;},
  clearTimeout:()=>{timeout=undefined;},
  window:{addEventListener:(name:string,fn:(event?:unknown)=>void)=>listeners.set(name,fn),removeEventListener:(name:string)=>listeners.delete(name)},
 });
 return {dataset,listeners,wait:()=>timeout?.(),error:(src:string,tagName='SCRIPT')=>listeners.get('error')?.({target:{tagName,src}}),ready:()=>{dataset.appReady='true';listeners.get('socialcoach:ready')?.();}};
}

test('startup honors invite language before loading a conflicting local profile',()=>{
 assert.equal(boot('/challenge/office-quick-favor/v1/en',JSON.stringify({state:{profile:{lang:'zh'}}}),'zh-CN').dataset.startupLanguage,'en');
 assert.equal(boot('/challenge/office-quick-favor/v1/zh','{}','en').dataset.startupLanguage,'zh');
 assert.equal(boot('/',JSON.stringify({state:{profile:{lang:'zh'}}}),'en').dataset.startupLanguage,'zh');
});
test('unreadable and unavailable storage still leave startup recovery usable',()=>{
 for(const b of [boot('/','broken','en'),boot('/','{}','zh-CN',true)]){
  assert.equal(b.dataset.startupStalled,undefined);b.wait();assert.equal(b.dataset.startupStalled,'true');
 }
});
test('a failed app chunk offers recovery without waiting; image or third-party errors do not',()=>{
 const b=boot();
 b.error('https://example.com/missing.js');assert.equal(b.dataset.startupStalled,undefined);
 b.error('https://site/_next/static/image.png','IMG');assert.equal(b.dataset.startupStalled,undefined);
 b.error('https://site/_next/static/chunks/app.js');assert.equal(b.dataset.startupStalled,'true');
});
test('ready removes recovery and cancels delayed notices, including after a slow start',()=>{
 for(const slow of [false,true]){
  const b=boot();if(slow)b.wait();b.ready();b.wait();b.error('https://site/_next/static/chunks/later.js');
  assert.equal(b.dataset.startupStalled,undefined);assert.equal(b.listeners.has('error'),false);
 }
});

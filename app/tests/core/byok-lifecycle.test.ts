import assert from 'node:assert/strict';
import {test} from 'node:test';

test('opening a model sheet cannot resurrect credentials removed by another window',async()=>{
 const entries=new Map<string,string>();
 const storage={getItem:(key:string)=>entries.get(key)??null,setItem:(key:string,value:string)=>entries.set(key,value),removeItem:(key:string)=>entries.delete(key)};
 Object.defineProperty(globalThis,'localStorage',{value:storage,configurable:true});
 entries.set('socialcoach.llm.v1',JSON.stringify({state:{enabled:false,provider:'openai',baseUrl:'https://audit.invalid/v1',apiKey:'synthetic-old-audit-key',fastModel:'test-chat',smartModel:'test-chat',tokenParam:'max_tokens'},version:0}));
 const {useByok,byokConfig}=await import('../../src/lib/byok');
 assert.equal(useByok.getState().apiKey,'synthetic-old-audit-key');
 entries.delete('socialcoach.llm.v1');
 useByok.getState().openSheet();
 assert.equal(entries.get('socialcoach.llm.v1'),undefined);
 assert.equal(useByok.getState().apiKey,'');
 assert.equal(byokConfig(),null);
});
test('a corrupt credential envelope never silently selects the shared model',async()=>{
 Object.defineProperty(globalThis,'localStorage',{value:{getItem:()=>'{broken private config',setItem:()=>{},removeItem:()=>{}},configurable:true});
 const {useByok}=await import('../../src/lib/byok');
 useByok.getState().synchronize();
 assert.equal(useByok.getState().enabled,true,'unreadable credentials need explicit repair or an explicit default-model choice');
 const {withModelAccess}=await import('../../src/lib/model-access');let ran=false;
 await assert.rejects(withModelAccess('zh',async()=>{ran=true;}));assert.equal(ran,false);
});

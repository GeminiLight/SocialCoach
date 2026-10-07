import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as storageModule from '../../src/features/dinner/storage';
import {createArchiveStorage} from '../../src/store/archive-storage';

// Re-enter a second writer between the first reader and its write. This models
// the same-origin tabs' getItem/setItem interleaving without relying on timing.
test('fallback coordination keeps the read and write in one serialized operation',async()=>{
 let tail=Promise.resolve();
 const serialize=<T,>(work:()=>T):Promise<T>=>{const result=tail.then(work);tail=result.then(()=>{});return result;};
 let raw:string|null='old',interleave:(()=>void)|undefined;
 const storage={getItem:()=>{const value=raw;const action=interleave;interleave=undefined;action?.();return value;},setItem:(_key:string,value:string)=>{raw=value;}} as unknown as Storage;
 type Writer={save:(value:string)=>Promise<boolean>;dispose:()=>void};
 const create=storageModule.createDinnerStorage as unknown as (notify:(issue:string|null)=>void,storage:()=>Storage,serialize:(work:()=>boolean)=>Promise<boolean>)=>Writer;
 const a=create(()=>{},()=>storage,serialize),b=create(()=>{},()=>storage,serialize);
 let second:Promise<boolean>|undefined;
 interleave=()=>{second=b.save('B');};
 assert.equal(await a.save('A'),true);
 assert.equal(await second,false,'the second tab must observe the committed first write');
 assert.equal(raw,'A');a.dispose();b.dispose();
});

test('main archive fallback writes settle before restore and never overwrite an interleaved tab',async()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 let raw:string|null=JSON.stringify({state:{sessions:[]},version:0}),interleave:(()=>void)|undefined;
 const fake={getItem:()=>{const value=raw;const action=interleave;interleave=undefined;action?.();return value;},setItem:(_key:string,value:string)=>{raw=value;},removeItem:()=>{raw=null;}};
 let tail=Promise.resolve();
 const serialize=(work:()=>void)=>{const result=tail.then(work);tail=result.catch(()=>{});return result;};
 Object.defineProperty(globalThis,'localStorage',{value:fake,configurable:true});
 try{
  const create=createArchiveStorage as unknown as (notify:(issue:string|null)=>void,serialize:(work:()=>void)=>Promise<void>)=>ReturnType<typeof createArchiveStorage>;
  const errors:(string|null)[]=[],a=create(()=>{},serialize),b=create(x=>errors.push(x),serialize);
  a.getItem('socialcoach.v1');b.getItem('socialcoach.v1');
  const first=JSON.stringify({state:{sessions:[],bookmarks:['A']},version:0}),second=JSON.stringify({state:{sessions:[],bookmarks:['B']},version:0});
  interleave=()=>{b.setItem('socialcoach.v1',second);};
  a.setItem('socialcoach.v1',first);
  await a.settled();await b.settled();
  assert.equal(raw,first);assert.equal(errors.at(-1),'conflict');
 }finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else Reflect.deleteProperty(globalThis,'localStorage');}
});

test('a queued fallback draft finishes on page unmount but cannot authorize a late model call',async()=>{
 let raw:string|null='old',flush:(()=>void)|undefined;
 const storage={getItem:()=>raw,setItem:(_key:string,value:string)=>{raw=value;}} as unknown as Storage;
 const serialize=(work:()=>boolean)=>new Promise<boolean>(resolve=>{flush=()=>resolve(work());});
 const writer=storageModule.createDinnerStorage(()=>{},()=>storage,serialize);
 const save=writer.save('final draft');writer.dispose();flush!();
 assert.equal(await save,false,'the disposed component cannot proceed with its send');
 assert.equal(raw,'final draft','an already queued local draft survives client-side navigation');
 assert.equal(await writer.save('late callback'),false);
 assert.equal(raw,'final draft');
});

test('an old 3D writer cannot overwrite a saved draft or resurrect a deleted record',async()=>{
 const entries=new Map<string,string>([[storageModule.DINNER_SAVE_KEY,'old']]);
 const storage={getItem:(key:string)=>entries.get(key)??null,setItem:(key:string,value:string)=>entries.set(key,value),removeItem:(key:string)=>entries.delete(key)};
 const create=(storageModule as unknown as {createDinnerStorage?:(notify:(issue:string|null)=>void,storage:()=>Storage)=>{save:(value:string)=>Promise<boolean>;dispose:()=>void}}).createDinnerStorage;
 assert.equal(typeof create,'function','3D saves need a guarded writer');
 const issues:(string|null)[]=[],a=create!(x=>issues.push(x),()=>storage as unknown as Storage),b=create!(()=>{},()=>storage as unknown as Storage);
 assert.equal(await b.save('new draft'),true);
 assert.equal(await a.save('old view and draft'),false);
 assert.equal(entries.get(storageModule.DINNER_SAVE_KEY),'new draft');
 assert.equal(issues.at(-1),'conflict');
 b.dispose();a.dispose();
 const old=create!(()=>{},()=>storage as unknown as Storage);
 entries.delete(storageModule.DINNER_SAVE_KEY);
 assert.equal(await old.save('resurrected'),false);
 assert.equal(entries.has(storageModule.DINNER_SAVE_KEY),false);
 old.dispose();
});

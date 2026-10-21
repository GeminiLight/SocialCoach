import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createArchiveStorage,type SaveIssue} from '../../src/store/archive-storage';

test('archive writes reacquire ownership after pagehide, retaining conflict protection',async()=>{
 const events=new EventTarget(),entries=new Map<string,string>();
 let requests=0;
 // Like Web Locks, grant the next lock only after the prior callback finishes.
 let tail=Promise.resolve();
 const locks={request:(_name:string,_options:unknown,work:()=>Promise<void>)=>{
  requests++;
  const granted=tail.then(work);tail=granted.catch(()=>{});return granted;
 }};
 Object.defineProperty(globalThis,'window',{value:events,configurable:true});
 Object.defineProperty(globalThis,'document',{value:{createElement(){}},configurable:true});
 Object.defineProperty(globalThis,'navigator',{value:{locks},configurable:true});
 Object.defineProperty(globalThis,'localStorage',{value:{getItem:(k:string)=>entries.get(k)??null,setItem:(k:string,v:string)=>entries.set(k,v)},configurable:true});
 const issues:(SaveIssue|null)[]=[],store=createArchiveStorage(issue=>issues.push(issue));
 const key='socialcoach.v1',value=(n:number)=>JSON.stringify({state:{sessions:[],bookmarks:[String(n)]},version:0});
 try{
  await store.getItem(key);
  await store.setItem(key,value(1));
  events.dispatchEvent(new Event('pagehide'));
  // BFCache restores the same JS instance, without calling getItem again.
  await store.setItem(key,value(2));
  await store.settled();
  assert.equal(entries.get(key),value(2));
  assert.equal(requests,2);
  assert.equal(issues.at(-1),null);
  events.dispatchEvent(new Event('pagehide'));
  await Promise.all([store.setItem(key,value(20)),store.setItem(key,value(21))]);
  await store.settled();
  assert.equal(entries.get(key),value(21),'queued writes retain their order after acquiring one shared lock');
  assert.equal(requests,3);
  events.dispatchEvent(new Event('pagehide'));
  entries.set(key,value(3)); // Another window saved while this page was away.
  await store.setItem(key,value(4));
  await store.settled();
  assert.equal(entries.get(key),value(3));
  assert.equal(issues.at(-1),'conflict');
 }finally{events.dispatchEvent(new Event('pagehide'));}
});

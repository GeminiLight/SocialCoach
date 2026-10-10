import assert from 'node:assert/strict';
import {test} from 'node:test';
import {arenaReturnPath,arenaSearchSnapshot,replaceArenaLocation,subscribeArenaLocation} from '../../src/lib/arena-location';

test('arena subscribers see committed URL and return path; popstate and disposal preserve navigation semantics',()=>{
  const previous=Object.getOwnPropertyDescriptor(globalThis,'window');
  const previousStorage=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage');
  const events=new EventTarget();
  const location={search:''};
  const stored=new Map<string,string>();
  const browser={location,addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events),dispatchEvent:events.dispatchEvent.bind(events),history:{replaceState:(_data:unknown,_title:string,path:string)=>{location.search=new URL(path,'https://example.test').search;}}};
  Object.defineProperty(globalThis,'window',{configurable:true,value:browser});
  Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{setItem:(key:string,value:string)=>stored.set(key,value),getItem:(key:string)=>stored.get(key)??null}});
  try {
    const snapshots:string[][]=[];
    const unsubscribe=subscribeArenaLocation(()=>snapshots.push([arenaSearchSnapshot(),arenaReturnPath()]));
    replaceArenaLocation('context=workplace');
    const next=new URLSearchParams(arenaSearchSnapshot());next.set('collection','recent');
    replaceArenaLocation(next.toString());
    assert.deepEqual(snapshots,[['?context=workplace','/arena?context=workplace'],['?context=workplace&collection=recent','/arena?context=workplace&collection=recent']]);
    location.search='?q=manager';events.dispatchEvent(new Event('popstate'));
    assert.equal(snapshots.at(-1)?.[0],'?q=manager');
    replaceArenaLocation('');assert.deepEqual(snapshots.at(-1),['','/arena']);
    unsubscribe();replaceArenaLocation('context=family');events.dispatchEvent(new Event('popstate'));
    assert.equal(snapshots.length,4);
    browser.history.replaceState=()=>{throw new Error('history rejected');};
    assert.throws(()=>replaceArenaLocation('context=school'),/history rejected/);
    assert.equal(arenaReturnPath(),'/arena?context=family');
  } finally {
    if(previous)Object.defineProperty(globalThis,'window',previous);else Reflect.deleteProperty(globalThis,'window');
    if(previousStorage)Object.defineProperty(globalThis,'sessionStorage',previousStorage);else Reflect.deleteProperty(globalThis,'sessionStorage');
  }
});

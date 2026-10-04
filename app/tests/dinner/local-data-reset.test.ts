import {test} from 'node:test';
import assert from 'node:assert/strict';
import {REHEARSAL_DRAFT_KEY} from '../../src/lib/rehearsal-input';

class MemoryStorage {
 getItem(key:string){return Object.hasOwn(this,key)?String((this as unknown as Record<string,unknown>)[key]):null;}
 setItem(key:string,value:string){Object.defineProperty(this,key,{value,configurable:true,writable:true,enumerable:true});}
 removeItem(key:string){delete (this as unknown as Record<string,unknown>)[key];}
}

test('reset removes a local portrait and the new rehearsal draft, preserving another app’s data',async()=>{
 const previousLocal=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),previousSession=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage'),previousWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
 const local=new MemoryStorage(),tab=new MemoryStorage();
 Object.defineProperty(globalThis,'localStorage',{value:local,configurable:true});
 Object.defineProperty(globalThis,'sessionStorage',{value:tab,configurable:true});
 Object.defineProperty(globalThis,'window',{value:{},configurable:true});
 try{
  const {useApp}=await import('../../src/store/useApp');
  useApp.getState().setSettings({avatarImage:'data:image/jpeg;base64,/9j/abcd'});
  assert.equal(JSON.parse(local.getItem('socialcoach.v1')!).state.settings.avatarImage,'data:image/jpeg;base64,/9j/abcd');
  tab.setItem(REHEARSAL_DRAFT_KEY,JSON.stringify({text:'Synthetic context',fields:{}}));
  tab.setItem('another-app.draft','Keep this');
  useApp.getState().reset();
  assert.equal(useApp.getState().settings.avatarImage,undefined);
  assert.equal(JSON.parse(local.getItem('socialcoach.v1')!).state.settings.avatarImage,undefined);
  assert.equal(tab.getItem(REHEARSAL_DRAFT_KEY),null);
  assert.equal(tab.getItem('another-app.draft'),'Keep this');
 }finally{
  if(previousLocal)Object.defineProperty(globalThis,'localStorage',previousLocal);else Reflect.deleteProperty(globalThis,'localStorage');
  if(previousSession)Object.defineProperty(globalThis,'sessionStorage',previousSession);else Reflect.deleteProperty(globalThis,'sessionStorage');
  if(previousWindow)Object.defineProperty(globalThis,'window',previousWindow);else Reflect.deleteProperty(globalThis,'window');
 }
});

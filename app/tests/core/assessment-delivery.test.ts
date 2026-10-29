import assert from 'node:assert/strict';
import {test} from 'node:test';
import {taskStream} from '../../src/lib/api-utils';

test('assessment transport opens before verification, but never sends an unverified report',async()=>{
 let release!:()=>void;
 const verified=new Promise<void>(resolve=>{release=resolve;});
 const response=taskStream(async emit=>{await verified;emit('{"verified":true}');return {verified:true};},{final:true,heartbeat:true});
 const reader=response.body!.getReader();
 try{
  const first=await Promise.race([reader.read(),new Promise<undefined>(resolve=>setTimeout(resolve,25))]);
  assert.ok(first,'No initial response while the evidence check is pending');
  assert.equal(new TextDecoder().decode(first.value),'\n');
  release();let text='';for(;;){const chunk=await reader.read();if(chunk.done)break;text+=new TextDecoder().decode(chunk.value);}
  assert.equal(text,'{"verified":true}\n@@final\n{"verified":true}');
 }finally{release();await reader.cancel();reader.releaseLock();}
});

test('cancelling a waiting report propagates cancellation without leaking its final draft',async()=>{
 let received:AbortSignal|undefined,release!:()=>void;
 const gate=new Promise<void>(resolve=>{release=resolve;});
 const response=taskStream(async(emit,signal)=>{received=signal;await gate;emit('never shown');return {};},{final:true,heartbeat:true});
 const reader=response.body!.getReader();await reader.read();await reader.cancel();
 assert.equal(received?.aborted,true);release();reader.releaseLock();
});

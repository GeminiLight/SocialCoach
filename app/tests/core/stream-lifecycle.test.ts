import assert from 'node:assert/strict';
import {test} from 'node:test';
import {streamText} from '../../src/lib/client-api';

test('a failed stream consumer cancels the response and releases its reader',async()=>{
 let cancelled=false;
 const body=new ReadableStream<Uint8Array>({start(c){c.enqueue(new TextEncoder().encode('reply'));},cancel(){cancelled=true;}});
 const original=globalThis.fetch;
 globalThis.fetch=async()=>new Response(body);
 try{
  const error=new Error('consumer stopped');
  await assert.rejects(streamText('/test',{},()=>{throw error;}),e=>e===error);
  assert.equal(cancelled,true);
  assert.equal(body.locked,false);
 }finally{globalThis.fetch=original;}
});

test('cancellation at the final chunk cannot resolve as a successful reply',async()=>{
 const controller=new AbortController();
 const body=new ReadableStream<Uint8Array>({start(c){c.enqueue(new TextEncoder().encode('reply'));c.close();}});
 const original=globalThis.fetch;
 globalThis.fetch=async()=>new Response(body);
 try{
  await assert.rejects(streamText('/test',{},()=>controller.abort(),controller.signal),{name:'AbortError'});
  assert.equal(body.locked,false);
 }finally{globalThis.fetch=original;}
});

test('split Unicode chunks remain intact and successful reads release their lock',async()=>{
 const encoded=new TextEncoder().encode('你好 👋');
 const body=new ReadableStream<Uint8Array>({start(c){for(const byte of encoded)c.enqueue(new Uint8Array([byte]));c.close();}});
 const original=globalThis.fetch;
 globalThis.fetch=async()=>new Response(body);
 try{assert.equal(await streamText('/test',{},()=>{}),'你好 👋');assert.equal(body.locked,false);}
 finally{globalThis.fetch=original;}
});

test('cancellation unblocks a pending read even when the transport does not abort its stream',async()=>{
 const controller=new AbortController();
 let cancelled=false,received!:()=>void;
 const opened=new Promise<void>(resolve=>{received=resolve;});
 const body=new ReadableStream<Uint8Array>({start(c){c.enqueue(new TextEncoder().encode('first'));},cancel(){cancelled=true;}});
 const original=globalThis.fetch;
 globalThis.fetch=async()=>new Response(body);
 try{
  const pending=streamText('/test',{},text=>{assert.equal(text,'first');received();},controller.signal);
  await opened;
  controller.abort();
  await assert.rejects(pending,{name:'AbortError'});
  assert.equal(cancelled,true);
  assert.equal(body.locked,false);
 }finally{globalThis.fetch=original;}
});

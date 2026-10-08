import assert from 'node:assert/strict';
import {test} from 'node:test';

test('a free metadata retry cannot hide shared exhaustion or shared concurrency',async()=>{
 Object.assign(process.env,{NODE_ENV:'production',LLM_PROVIDER:'openai',LLM_API_KEY:'synthetic-server-key',LLM_FAST_MODEL:'test-chat',LLM_SMART_MODEL:'test-chat',LLM_BUDGET_REDIS_URL:'https://redis.audit.invalid',LLM_BUDGET_REDIS_TOKEN:'synthetic-budget-key',LLM_BUDGET_DAILY_TOKENS:'10000000',LLM_BUDGET_CONCURRENCY:'8'});
 let used=9998465,active=0;const commands:string[][]=[];
 const realFetch=globalThis.fetch;
 globalThis.fetch=async(input,init)=>{
  const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
  if(url.startsWith('https://redis.audit.invalid')){
   const command=JSON.parse(String(init?.body));commands.push(command);
   if(command[1]?.includes('INCRBY'))return Response.json({result:0});
   return Response.json({result:[used,10000000,active,2000000000,1999999900]});
  }
  assert.ok(url.includes('/models'),'health must never generate content');
  return Response.json({object:'list',data:[{id:'test-chat'}]});
 };
 try{
  const {reserveSharedBudget}=await import('../../src/lib/shared-budget');
  await assert.rejects(reserveSharedBudget({system:'',messages:[],maxTokens:1800}),e=>(e as {modelIssue:string}).modelIssue==='shared_quota');
  const {serverModelHealth}=await import('../../src/lib/server-model-health');
  assert.deepEqual((await serverModelHealth(true)).issue,'shared_quota');
  used=0;active=8;
  assert.equal((await serverModelHealth(true)).issue,'shared_busy');
  active=0;
  assert.equal((await serverModelHealth(true)).state,'available');
  assert.ok(commands.some(c=>c[0]==='EVAL'&&!c[1].includes('INCRBY')),'health reads the shared pool without reservation');
 }finally{globalThis.fetch=realFetch;}
});

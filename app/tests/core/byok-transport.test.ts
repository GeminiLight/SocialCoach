import assert from 'node:assert/strict';
import {test} from 'node:test';
import {checkByokConnection, makeByokLLM} from '../../src/lib/llm-client';
import type {ByokConfig} from '../../src/lib/byok';
import {openaiArgs} from '../../src/lib/llm-core';

test('an explicit non-thinking request does not also request reasoning effort',()=>{
 const options={system:'Return JSON.',messages:[{role:'user' as const,content:'Check the quoted evidence.'}],maxTokens:5000,thinking:false,effort:'low' as const};
 const disabled=openaiArgs(options,'deepseek-flash','max_tokens',true);
 assert.deepEqual(disabled.thinking,{type:'disabled'});
 assert.equal('reasoning_effort' in disabled,false);
 const unchanged=openaiArgs(options,'test-chat','max_tokens',false);
 assert.equal('thinking' in unchanged,false);
 assert.equal(unchanged.reasoning_effort,'low');
});

test('Anthropic full message endpoints and versioned bases produce one v1 route',async()=>{
 const original=globalThis.fetch;
 try{
  for(const base of ['https://audit.invalid/gateway/v1/messages/','https://audit.invalid/gateway/v1','https://audit.invalid/gateway']){
   const urls:string[]=[];
   globalThis.fetch=async input=>{const url=String(input);urls.push(url);return url.includes('/models')?Response.json({data:[{id:'test-chat'}],has_more:false}):Response.json({id:'test',type:'message',role:'assistant',model:'test-chat',content:[{type:'text',text:'ok'}],stop_reason:'end_turn',usage:{input_tokens:1,output_tokens:1}});};
   const config:ByokConfig={enabled:true,provider:'anthropic',baseUrl:base,apiKey:'synthetic-test-key',fastModel:'test-chat',smartModel:'test-chat',tokenParam:'max_tokens'};
   assert.deepEqual(await checkByokConnection(config),{state:'available'});
   assert.equal(await makeByokLLM(config).chatText({system:'test',messages:[{role:'user',content:'test'}],maxTokens:20}),'ok');
   assert.deepEqual(urls,['https://audit.invalid/gateway/v1/models?limit=100','https://audit.invalid/gateway/v1/messages']);
  }
 }finally{globalThis.fetch=original;}
});

test('a pasted completion endpoint keeps the gateway prefix without duplicating the route',async()=>{
 const original=globalThis.fetch,urls:string[]=[];
 globalThis.fetch=async input=>{const url=String(input);urls.push(url);return url.endsWith('/models')?Response.json({data:[{id:'test-chat'}]}):Response.json({choices:[{message:{content:'ok'},finish_reason:'stop'}]});};
 try{
  const config:ByokConfig={enabled:true,provider:'openai',baseUrl:'https://audit.invalid/gateway/v1/chat/completions/',apiKey:'synthetic-test-key',fastModel:'test-chat',smartModel:'test-chat',tokenParam:'max_tokens'};
  await checkByokConnection(config);
  await makeByokLLM(config).chatText({system:'test',messages:[{role:'user',content:'test'}],maxTokens:20});
  assert.deepEqual(urls,['https://audit.invalid/gateway/v1/models','https://audit.invalid/gateway/v1/chat/completions']);
 }finally{globalThis.fetch=original;}
});

test('browser OpenAI metadata and generations work with standard gateway CORS headers', async () => {
  const original = globalThis.fetch;
  const requests: {url: string; body: Record<string, unknown> | null}[] = [];
  const diagnosticHeaders: string[][] = [];
  globalThis.fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('authorization'), 'Bearer synthetic-test-key');
    diagnosticHeaders.push([...headers.keys()].filter(name => name.startsWith('x-stainless-')));
    assert.deepEqual(diagnosticHeaders.at(-1), [],
      'SDK diagnostic headers are rejected by compatible gateways before the request reaches them');
    assert.ok(init?.signal, 'SDK cancellation remains attached');
    const url = String(input);
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    requests.push({url, body});
    if (url.endsWith('/models')) return Response.json({data: [{id: 'test-chat'}]});
    assert.equal(headers.get('content-type'), 'application/json');
    if (body?.stream) return new Response('data: '+JSON.stringify({choices: [{delta: {content: '回应'}, finish_reason: null}]})+'\n\ndata: [DONE]\n\n', {headers: {'content-type': 'text/event-stream'}});
    return Response.json({choices: [{message: {role: 'assistant', content: '回应'}, finish_reason: 'stop'}]});
  };
  try {
    const config: ByokConfig = {enabled: true, provider: 'openai', baseUrl: 'https://gateway.test/v1', apiKey: 'synthetic-test-key', fastModel: 'test-chat', smartModel: 'test-chat', tokenParam: 'max_tokens'};
    const connection = await checkByokConnection(config);
    assert.deepEqual(diagnosticHeaders, [[]]);
    assert.deepEqual(connection, {state: 'available'});
    const llm = makeByokLLM(config);
    const options = {system: '保持角色', messages: [{role: 'user' as const, content: '我今天不能加班。'}], maxTokens: 1800};
    assert.equal(await llm.chatText(options), '回应');
    const stream = llm.chatStream(options);
    let text = '';
    for await (const delta of stream.deltas) text += delta;
    assert.equal(text, '回应');
    assert.equal(stream.text(), text);
    assert.equal(requests.length, 3);
    assert.deepEqual(requests[1].body?.messages, [{role: 'system', content: options.system}, ...options.messages]);
    assert.equal(requests[1].body?.max_tokens, 1800);
    assert.equal(requests[2].body?.stream, true);
    const abort = new AbortController();
    abort.abort();
    await assert.rejects(llm.chatText({...options, signal: abort.signal}));
    assert.equal(requests.length, 3, 'a cancelled call never reaches the gateway');
  } finally { globalThis.fetch = original; }
});

test('compatible reasoning can be disabled for short tasks while default configurations and other tasks keep their request shape', async () => {
  const original = globalThis.fetch;
  const bodies: Record<string, unknown>[] = [];
  globalThis.fetch = async (_input, init) => {
    bodies.push(JSON.parse(String(init?.body)));
    if (bodies.at(-1)?.stream) return new Response('data: '+JSON.stringify({choices: [{delta: {content: '回应'}}]})+'\n\ndata: [DONE]\n\n', {headers: {'content-type': 'text/event-stream'}});
    return Response.json({choices: [{message: {role: 'assistant', content: '回应'}, finish_reason: 'stop'}]});
  };
  try {
    const config: ByokConfig & {disableThinking: boolean} = {enabled: true, provider: 'openai', baseUrl: 'https://gateway.test/v1', apiKey: 'synthetic-test-key', fastModel: 'test-chat', smartModel: 'test-chat', tokenParam: 'max_tokens', disableThinking: true};
    const options = {system: 'test', messages: [{role: 'user' as const, content: 'test'}], maxTokens: 100};
    const llm = makeByokLLM(config);
    await llm.chatText({...options, thinking: false});
    assert.deepEqual(bodies[0].thinking, {type: 'disabled'});
    await llm.chatText(options);
    assert.equal('thinking' in bodies[1], false, 'tasks that request reasoning remain unchanged');
    await makeByokLLM({...config, disableThinking: false}).chatText({...options, thinking: false});
    assert.equal('thinking' in bodies[2], false, 'official OpenAI keeps its supported request shape');
    const legacy: ByokConfig = {...config};
    delete legacy.disableThinking;
    await makeByokLLM(legacy).chatText({...options, thinking: false});
    assert.equal('thinking' in bodies[3], false, 'older saved configurations remain usable');
    const stream = llm.chatStream({...options, thinking: false});
    let text = '';
    for await (const delta of stream.deltas) text += delta;
    assert.deepEqual(bodies[4].thinking, {type: 'disabled'});
    assert.equal(text, '回应');
    assert.equal(stream.text(), '回应');
  } finally { globalThis.fetch = original; }
});

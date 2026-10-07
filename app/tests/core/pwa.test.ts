import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const script=readFileSync(new URL('../../public/sw.js',import.meta.url),'utf8');
function worker(fetcher:()=>Promise<Response>){
 const handlers=new Map<string,(event:unknown)=>void>(),saved:string[]=[],deleted:string[]=[];
 const cache={addAll:async()=>{},put:async(request:{url:string})=>{saved.push(request.url);},keys:async()=>[],delete:async()=>true};
 runInNewContext(script,{URL,Response,fetch:fetcher,caches:{open:async()=>cache,match:async(path:string)=>path==='/offline.html'?new Response('offline recovery'):undefined,keys:async()=>['unrelated-cache','socialcoach-v1'],delete:async(name:string)=>{deleted.push(name);}},self:{location:{origin:'https://app.test'},clients:{claim:async()=>{}},skipWaiting:()=>{},addEventListener:(name:string,handler:(event:unknown)=>void)=>handlers.set(name,handler)}});
 return {handlers,saved,deleted};
}
test('a failed static response is never kept in the service worker cache',async()=>{
 const w=worker(async()=>new Response('missing',{status:404}));let response:Promise<Response>|undefined;const work:Promise<unknown>[]=[];
 w.handlers.get('fetch')!({request:{method:'GET',url:'https://app.test/_next/static/missing.js',mode:'cors'},respondWith:(p:Promise<Response>)=>{response=p;},waitUntil:(p:Promise<unknown>)=>work.push(p)});
 assert.equal((await response!).status,404);await Promise.all(work);assert.equal(w.saved.length,0);
});
test('offline navigation has an explicit recovery page instead of a browser error',async()=>{
 const w=worker(async()=>{throw new TypeError('offline');});let response:Promise<Response>|undefined;
 w.handlers.get('fetch')!({request:{method:'GET',url:'https://app.test/3d',mode:'navigate'},respondWith:(p:Promise<Response>)=>{response=p;},waitUntil:()=>{}});
 assert.ok(response,'navigation must be handled');assert.equal(await (await response).text(),'offline recovery');
});
test('activation only retires SocialCoach caches',async()=>{
 const w=worker(async()=>new Response('ok'));let work:Promise<unknown>|undefined;
 w.handlers.get('activate')!({waitUntil:(p:Promise<unknown>)=>{work=p;}});await work;
 assert.ok(w.deleted.includes('socialcoach-v1'));assert.ok(!w.deleted.includes('unrelated-cache'));
});

/** Real-model fictional replay. Baseline differs ONLY by the authored direction field. */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {scenarioById} from '../src/data/corpus';
import {FAST_MODEL,hasServerCredential,serverLLM} from '../src/lib/llm';
import {runRoleplay} from '../src/lib/tasks/roleplay';
import {parseRoleplay} from '../src/lib/client-api';
import type {ChatMessage} from '../src/lib/types';
import type {LLM} from '../src/lib/llm-core';
import {textPlayFixtures} from './text-play-fixtures';

async function main(){
 assert(hasServerCredential());
 const root=resolve(process.env.TEXT_PLAY_EVAL_DIR??'/tmp/socialcoach-text-play');
 await mkdir(root,{recursive:true});
 const phase=process.env.TEXT_PLAY_EVAL_PHASE??'current';
 assert(['current','baseline','both'].includes(phase));
 const only=process.env.TEXT_PLAY_EVAL_CASE;
 const paths=textPlayFixtures.flatMap(test=>Object.entries(test.routes).map(([route,lines])=>({...test,route,lines})))
  .filter(test=>!only||only.split(',').includes(test.id)||only.split(',').includes(`${test.id}:${test.route}`));
 assert(paths.length,'Unknown case');
 const records:unknown[]=[],issues:string[]=[];
 for(const label of (['baseline','current'] as const).filter(v=>phase==='both'||phase===v)){
  // Bound independent paths; never parallelize dependent turns of a conversation.
  for(let offset=0;offset<paths.length;offset+=3){
   const results=await Promise.allSettled(paths.slice(offset,offset+3).map(async test=>{
    const original=scenarioById(test.id)!;
    const scenario=label==='baseline'?{...original,simulationDirection:undefined}:original;
    const messages:ChatMessage[]=[{id:'opening',role:'npc',characterId:scenario.opening.characterId,text:scenario.opening.text[test.lang],ts:0}];
    for(let i=0;i<test.lines.length;i++){
     const learner=test.lines[i];messages.push({id:'u'+i,role:'learner',text:learner,ts:i*2+1});
     const start=Date.now();let preview='',modelRaw='',repairs=0,firstVisibleMs:number|undefined;
     const llm:LLM={chatText:opts=>{repairs++;return serverLLM.chatText(opts);},chatStream:opts=>{
      const run=serverLLM.chatStream(opts);return {...run,deltas:(async function*(){for await(const d of run.deltas){modelRaw+=d;yield d;}})()};
     }};
     let raw:string;
     try{raw=await runRoleplay({scenario,learnerCharacterId:'you',messages,lang:test.lang},llm,FAST_MODEL,d=>{if(firstVisibleMs===undefined)firstVisibleMs=Date.now()-start;preview+=d;});}
     catch(error){records.push({label,id:test.id,route:test.route,lang:test.lang,turn:i+1,learner,error:String(error),modelRaw,preview,repairs});throw error;}
     const parsed=parseRoleplay(raw,scenario.characters.filter(c=>c.id!=='you').map(c=>c.id));
     if(preview!==raw||!parsed.meta||!parsed.utterances.length)issues.push(`${label}:${test.id}:${test.route}:${i+1}: output incomplete`);
     records.push({label,id:test.id,route:test.route,lang:test.lang,turn:i+1,learner,meta:parsed.meta,npc:parsed.utterances,repairs,firstVisibleMs,ms:Date.now()-start});
     parsed.utterances.forEach((u,n)=>messages.push({id:'n'+i+'-'+n,role:'npc',characterId:u.characterId,text:u.text,ts:i*2+2,...(n===parsed.utterances.length-1&&parsed.meta?{meta:parsed.meta}:{})}));
     console.log(`${label} ${test.id} ${test.route} ${i+1} ${Date.now()-start}ms`);
    }
   }));
   for(const result of results)if(result.status==='rejected')issues.push(String(result.reason));
   await writeFile(resolve(root,'replay.json'),JSON.stringify({at:new Date().toISOString(),model:FAST_MODEL,phase,samples:records.length,issues,records},null,2)+'\n');
  }
 }
 console.log(JSON.stringify({samples:records.length,issues}));if(issues.length)process.exitCode=1;
}
void main();

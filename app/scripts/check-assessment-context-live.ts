/** Paid paired audit of the same saved reports with full/projected sources. */
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {retrieveKnowledge} from '../src/lib/retrieval';
import {checkAssessment} from '../src/lib/tasks/assessment-check';
import {serverLLM,SMART_MODEL,hasServerCredential} from '../src/lib/llm';
import {systemParts,type LLM} from '../src/lib/llm-core';
import {taskLLM} from '../src/lib/task-runtime';
import type {Session} from '../src/lib/types';

async function main(){
 assert(hasServerCredential()&&process.env.ASSESSMENT_CONTEXT_DIR,'Configure a model and fresh ASSESSMENT_CONTEXT_DIR');
 const out=resolve(process.env.ASSESSMENT_CONTEXT_DIR!);await mkdir(out);
 const cases=['text-zh','text-en','dinner-zh','dinner-en'].filter(id=>!process.env.ASSESSMENT_CONTEXT_CASE||process.env.ASSESSMENT_CONTEXT_CASE.split(',').includes(id));
 assert(cases.length,'Unknown ASSESSMENT_CONTEXT_CASE');
 for(const id of cases){
  const {session:s}:{session:Session}=JSON.parse(await readFile(resolve('../docs/reviews/live-workflow-2026-10-22/baseline',id+'.json'),'utf8'));
  const lang=id.endsWith('zh')?'zh':'en',scenario=s.scenario;
  const kb=retrieveKnowledge({skills:[...scenario.skills,...scenario.relatedSkills??[],...scenario.skills],context:scenario.context,query:scenario.keywords.join(' ')+' '+s.messages.filter(m=>m.role==='learner'||m.role==='npc').map(m=>m.text).join(' '),acquisition:true,performance:true});
  // Alternate the order; this is a small compatibility probe, not a benchmark.
  for(const mode of id.endsWith('zh')?['full','projected']:['projected','full']){
   const calls:unknown[]=[];
   const llm:LLM={chatStream:()=>{throw Error('unused');},chatText:async o=>{
    const body=JSON.parse(o.messages[0].content);if(mode==='full')body.retrievedKnowledge=kb;
    const opts={...o,messages:[{role:'user' as const,content:JSON.stringify(body)}]};
    const start=Date.now();let raw='';let ok=false;
    try{raw=await serverLLM.chatText(opts);ok=true;return raw;}finally{
     calls.push({durationMs:Date.now()-start,ok,inputBytes:Buffer.byteLength([...systemParts(opts.system).map(p=>p.text),...opts.messages.map(m=>m.content)].join('\n')),raw});
    }
   }};
   let result:unknown,error:unknown;
   try{result=await checkAssessment(s.report!,{scenario,lang,learnerCharacterId:s.learnerCharacterId,messages:s.messages,goals:scenario.skills,sceneContext:s.sceneContext},taskLLM(llm,'assess'),SMART_MODEL,undefined,kb);}
   catch(e){error={name:(e as Error).name,message:(e as Error).message};process.exitCode=1;}
   await writeFile(resolve(out,id+'-'+mode+'.json'),JSON.stringify({id,mode,model:SMART_MODEL,calls,result,error},null,2)+'\n');
   console.log(id,mode,error??result);
  }
 }
}
void main();

/** Offline request-size comparison on committed synthetic workflow fixtures. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {retrieveKnowledge} from '../src/lib/retrieval';
import {knowledgeContext} from '../src/lib/knowledge-context';
import {checkAssessment} from '../src/lib/tasks/assessment-check';
import {systemParts,type LLM} from '../src/lib/llm-core';
import type {Session} from '../src/lib/types';

async function main(){
 const rows:{id:string;sourceBytesBefore:number;sourceBytesAfter:number;requestBytesBefore:number;requestBytesAfter:number;savedPercent:number}[]=[];
 for(const id of ['text-zh','text-en','dinner-zh','dinner-en']){
  const {session:s}:{session:Session}=JSON.parse(await readFile(resolve('../docs/reviews/live-workflow-2026-10-22/baseline',id+'.json'),'utf8'));
  const lang=id.endsWith('zh')?'zh':'en',scenario=s.scenario;
  const kb=retrieveKnowledge({skills:[...scenario.skills,...scenario.relatedSkills??[],...scenario.skills],context:scenario.context,query:scenario.keywords.join(' ')+' '+s.messages.filter(m=>m.role==='learner'||m.role==='npc').map(m=>m.text).join(' '),acquisition:true,performance:true});
  const llm:LLM={chatStream:()=>{throw Error('unused');},chatText:async o=>{
   const next=JSON.parse(o.messages[0].content),old={...next,retrievedKnowledge:kb};
   assert.deepEqual(next.retrievedKnowledge,knowledgeContext(kb,lang));
   const system=systemParts(o.system).map(p=>p.text).join('\n')+'\n';
   const before=Buffer.byteLength(system+JSON.stringify(old)),after=Buffer.byteLength(system+JSON.stringify(next));
   assert.ok(after<before);
   rows.push({id,sourceBytesBefore:Buffer.byteLength(JSON.stringify(kb)),sourceBytesAfter:Buffer.byteLength(JSON.stringify(next.retrievedKnowledge)),requestBytesBefore:before,requestBytesAfter:after,savedPercent:Number((100*(before-after)/before).toFixed(1))});
   return JSON.stringify({approved:true,issues:[],alternatives:s.report!.alternatives.map(a=>({original:a.original,intentPreserved:true,factsAtTime:true}))});
  }};
  await checkAssessment(s.report!,{scenario,lang,learnerCharacterId:s.learnerCharacterId,messages:s.messages,goals:scenario.skills,sceneContext:s.sceneContext},llm,'capture',undefined,kb);
 }
 console.log(JSON.stringify(rows,null,2));
}
void main();

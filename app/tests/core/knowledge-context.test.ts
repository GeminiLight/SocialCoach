import assert from 'node:assert/strict';
import {test} from 'node:test';
import {THEORIES,CASES} from '../../src/data/corpus';
import {knowledgeContext} from '../../src/lib/knowledge-context';
import {pick} from '../../src/lib/i18n';
import {checkAssessment} from '../../src/lib/tasks/assessment-check';
import {fixtureSession} from '../../scripts/check-debrief-assistant';
import type {LLM} from '../../src/lib/llm-core';

for(const lang of ['zh','en'] as const){
 test('model source projection preserves every substantive field and attribution: '+lang,()=>{
  const rows=knowledgeContext({theories:THEORIES,cases:CASES},lang);
  assert.equal(rows.length,THEORIES.length+CASES.length);
  for(const [i,k] of THEORIES.entries())assert.deepEqual(rows[i],{kind:'theory',id:k.id,title:pick(k.title,lang),source:k.source,principle:pick(k.principle,lang),howTo:k.howTo.map(v=>pick(v,lang))});
  for(const [i,k] of CASES.entries())assert.deepEqual(rows[THEORIES.length+i],{kind:'case',id:k.id,title:pick(k.title,lang),source:k.source,situation:pick(k.situation,lang),whatHappened:pick(k.whatHappened,lang),takeaway:pick(k.takeaway,lang)});
  assert.ok(Buffer.byteLength(JSON.stringify(rows))<Buffer.byteLength(JSON.stringify({theories:THEORIES,cases:CASES}))*0.7);
 });
}
test('an empty retrieval stays empty; projection does not invent or select sources',()=>{
 assert.deepEqual(knowledgeContext({theories:[],cases:[]},'zh'),[]);
});
test('assessment audit retains full ordered evidence and report while projecting only source metadata',async()=>{
 const session=fixtureSession(),kb={theories:THEORIES.slice(0,2),cases:CASES.slice(0,2)};
 const report=session.report!;
 const llm:LLM={chatStream:()=>{throw Error('unused');},chatText:async o=>{
  const body=JSON.parse(o.messages[0].content);
  assert.deepEqual(body.retrievedKnowledge,knowledgeContext(kb,'zh'));
  assert.deepEqual(body.report,report);
  assert.deepEqual(body.transcript.map((m:{text:string})=>m.text),session.messages.filter(m=>m.role!=='coach').map(m=>m.text));
  return JSON.stringify({approved:true,issues:[],alternatives:report.alternatives.map(a=>({original:a.original,intentPreserved:true,factsAtTime:true}))});
 }};
 await checkAssessment(report,{scenario:session.scenario,learnerCharacterId:session.learnerCharacterId,messages:session.messages,goals:session.scenario.skills,lang:'zh'},llm,'test',undefined,kb);
});
test('a precise knowledge explanation locator preserves the rejection; unknown fields fail closed',async()=>{
 const s=fixtureSession(),report=s.report!;
 const input={scenario:s.scenario,learnerCharacterId:s.learnerCharacterId,messages:s.messages,goals:s.scenario.skills,lang:'zh' as const};
 const check=(field:string):LLM=>({chatStream:()=>{throw Error('unused');},chatText:async()=>JSON.stringify({approved:false,issues:[{field,reason:'Explanation misstates the source.'}],alternatives:report.alternatives.map(a=>({original:a.original,intentPreserved:true,factsAtTime:true}))})});
 const result=await checkAssessment(report,input,check('knowledge.whyThis'),'test');
 assert.equal(result.approved,false);
 assert.deepEqual(result.issues,[{field:'knowledge',reason:'Explanation misstates the source.'}]);
 await assert.rejects(checkAssessment(report,input,check('knowledge.unrecognized'),'test'));
});

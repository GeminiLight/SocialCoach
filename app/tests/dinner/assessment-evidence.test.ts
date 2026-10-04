import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runAssess,sanitizeReport} from '../../src/lib/tasks/assess';
import {checkAssessment} from '../../src/lib/tasks/assessment-check';
import {SCENARIOS} from '../../src/data/corpus';
import type {ChatMessage,Report} from '../../src/lib/types';
import type {ChatOpts,LLM} from '../../src/lib/llm-core';

const scenario=SCENARIOS[0],role=scenario.characters.find(c=>c.playable)!.id,skill=scenario.skills[0];
const quote='大家一起举杯吧，我先敬陈总。';
const messages:ChatMessage[]=[{id:'n',role:'npc',text:'茶也行，喝不喝另说。',ts:1},{id:'l',role:'learner',text:quote,ts:2},{id:'n2',role:'npc',text:'交付范围还没有确认。',ts:3}];
const input={scenario,learnerCharacterId:role,messages,goals:[skill],lang:'zh' as const};
const report:Report={objectiveResults:scenario.objectives.map((_,index)=>({index,status:'unknown',evidence:quote,reason:'No confirmed result for this original aim.'})),outcome:'partial',stars:2,verdictEvidence:quote,verdict:'你参与了举杯，饮品与是否饮用未知。',summary:'先表达敬意，交付范围还未确认。',ratings:[{skill,level:2,evidence:quote,reason:'参与集体互动，没有新增交付承诺。'}],strengths:[],weaknesses:[],alternatives:[],knowledge:{theoryIds:[],caseIds:[],whyThis:''},reflectionQuestions:[],nextStep:'说明愿意确认的交付范围。',deltas:{}};
const stream=(value:string,refused=false)=>({deltas:(async function*(){yield value;})(),text:()=>value,refused:()=>refused});
const isCheck=(o:ChatOpts)=>JSON.stringify(o.system).includes('ASSESSMENT FACT CHECK');

test('a pending game invitation cannot be described as already joining, even when the model approves',async()=>{
 const waiting={...input,messages:[{id:'g1',role:'learner' as const,characterId:role,text:'I would like to join the game.',ts:1},{id:'g2',role:'npc' as const,text:'The game is about to start; you can join us.',ts:2}]};
 const draft={...report,summary:'You accepted the invitation to join the game.',ratings:report.ratings!.map(r=>({...r,reason:'A clear boundary stated right after joining the game.'}))};
 const llm:LLM={chatStream:()=>stream(''),chatText:async()=>JSON.stringify({approved:true,issues:[]})};
 const result=await checkAssessment(draft,waiting,llm,'smart');assert.equal(result.approved,false);assert.ok(result.issues.some(i=>i.field==='ratings'));assert.ok(!result.issues.some(i=>i.field==='summary'));
 const played={...waiting,messages:[...waiting.messages,{id:'g3',role:'learner' as const,characterId:role,text:'I joined the game.',ts:3}]};
 assert.equal((await checkAssessment(draft,played,llm,'smart')).approved,true);
});

test('a malformed semantic check shows the saved-transcript failure without another model retry',async()=>{
 let checks=0,visible=0;
 const llm:LLM={chatStream:()=>stream(JSON.stringify(report)),chatText:async()=>{checks++;return '';}};
 await assert.rejects(runAssess(input,llm,'smart',()=>visible++),/对话已保留/);
 assert.equal(checks,1);assert.equal(visible,0);
});

test('malformed report has one format repair before anything reaches the UI',async()=>{
 const calls:string[]=[],visible:string[]=[];
 const llm:LLM={chatStream:()=>stream('{"ratings":'),chatText:async o=>{calls.push(isCheck(o)?'check':'repair');return JSON.stringify(isCheck(o)?{approved:true,issues:[]}:report);}};
 const result=await runAssess(input,llm,'smart',d=>visible.push(d));
 assert.deepEqual(calls,['repair','check']);assert.equal(result.verdict,report.verdict);assert.deepEqual(visible,[JSON.stringify(result)]);
});

test('format repair cannot manufacture an empty successful assessment or retry indefinitely',async()=>{
 let calls=0,visible=0;
 const llm:LLM={chatStream:()=>stream('not json'),chatText:async()=>{calls++;return '{}';}};
 await assert.rejects(runAssess(input,llm,'smart',()=>visible++));
 assert.equal(calls,1);assert.equal(visible,0);
});

test('a real quote is not enough when a claim attributes the NPC tea proposal to the learner',async()=>{
 const wrong={...report,verdict:'你以茶代酒守住了不饮酒边界。',summary:'全程没有碰酒。'};
 const calls:string[]=[],visible:string[]=[];
 let checks=0;
 const llm:LLM={chatStream:()=>stream(JSON.stringify(wrong)),chatText:async o=>{
  if(isCheck(o)){calls.push('check');return JSON.stringify(++checks===1?{approved:false,issues:[{field:'verdict',reason:'Tea was suggested by the NPC; raising a cup establishes neither tea nor drinking.',quote},{field:'summary',reason:'Consumption was not established.'}]}:{approved:true,issues:[]});}
  calls.push('repair');assert.ok(o.messages.some(m=>m.content.includes('Tea was suggested')));return JSON.stringify(report);
 }};
 const result=await runAssess(input,llm,'smart',d=>visible.push(d));
 assert.deepEqual(calls,['check','repair','check']);assert.equal(result.verdict,report.verdict);
 assert.equal(visible.length,1);assert.ok(!visible[0].includes('全程没有碰酒'));
});

test('an unresolved fact check is a visible failure and earns no unverified report',async()=>{
 let visible=0;
 const llm:LLM={chatStream:()=>stream(JSON.stringify(report)),chatText:async o=>JSON.stringify(isCheck(o)?{approved:false,issues:[{field:'summary',reason:'Unsupported interpretation.',quote}]}:report)};
 await assert.rejects(runAssess(input,llm,'smart',()=>visible++));assert.equal(visible,0);
});

test('refusal, provider failure and cancellation are not format retries',async()=>{
 let calls=0;
 const llm:LLM={chatStream:()=>stream('',true),chatText:async()=>{calls++;throw Error('Unexpected retry');}};
 await assert.rejects(runAssess(input,llm,'smart'));assert.equal(calls,0);
 await assert.rejects(runAssess(input,{...llm,chatStream:()=>{throw Error('Provider failed');}},'smart'),/Provider failed/);assert.equal(calls,0);
 const controller=new AbortController();controller.abort();await assert.rejects(runAssess(input,llm,'smart',undefined,controller.signal));assert.equal(calls,0);
});

test('unknown original aims cannot manufacture success and do not reduce communication ratings',()=>{
 const objectiveResults=scenario.objectives.map((_,index)=>({index,status:'unknown' as const,evidence:quote,reason:'The recorded toast does not establish this aim.'}));
 const result=sanitizeReport({...report,outcome:'success',objectiveResults},scenario,[],[],messages,[skill]);
 assert.equal(result.outcome,'failure');assert.deepEqual(result.objectiveResults,objectiveResults);assert.equal(result.ratings?.[0].level,2);
 const achieved=sanitizeReport({...report,outcome:'failure',objectiveResults:objectiveResults.map((o,index)=>({...o,status:index===0?'met' as const:'unmet' as const}))},scenario,[],[],messages,[skill]);
 assert.equal(achieved.outcome,objectiveResults.length===1?'success':'partial');
});

test('format repair identifies the invalid objective quotation and supplies literal source lines',async()=>{
 const bad='茶也行。喝不喝另说。';
 const wrong={...report,objectiveResults:report.objectiveResults!.map((r,index)=>({...r,...(index===0?{npcEvidence:bad}:{})}))};
 let repaired=false;
 const llm:LLM={chatStream:()=>stream(JSON.stringify(wrong)),chatText:async o=>{
  if(isCheck(o))return JSON.stringify({approved:true,issues:[]});
  const repair=o.messages.at(-1)!.content;
  assert.ok(repair.includes('objectiveResults[0].npcEvidence'),repair);
  assert.ok(repair.includes(bad),repair);
  assert.ok(repair.includes(messages[0].text),repair);
  repaired=true;
  return JSON.stringify({...report,objectiveResults:report.objectiveResults!.map((r,index)=>({...r,...(index===0?{npcEvidence:messages[0].text}:{})}))});
 }};
 const result=await runAssess(input,llm,'smart');
 assert.equal(repaired,true);assert.equal(result.objectiveResults![0].npcEvidence,messages[0].text);
});

test('a paraphrased internal check quotation cannot discard a valid identified error',async()=>{
 let checks=0,repaired=false;
 const wrong={...report,summary:'你喝了茶。'};
 const llm:LLM={chatStream:()=>stream(JSON.stringify(wrong)),chatText:async o=>{
  if(isCheck(o))return JSON.stringify(++checks===1?{approved:false,issues:[{field:'summary',reason:'The summary invents consumption from an NPC proposal.',quote:'The learner drank tea.'}]}:{approved:true,issues:[]});
  repaired=true;assert.ok(o.messages.at(-1)!.content.includes('invents consumption'));return JSON.stringify(report);
 }};
 assert.equal((await runAssess(input,llm,'smart')).summary,report.summary);assert.equal(repaired,true);
});

test('the semantic check sees retrieved knowledge and can request a supported knowledge correction',async()=>{
 let checks=0;
 const llm:LLM={chatStream:()=>stream(JSON.stringify(report)),chatText:async o=>{
  if(isCheck(o)){
   assert.ok(o.messages[0].content.includes('retrievedKnowledge'));
   return JSON.stringify(++checks===1?{approved:false,issues:[{field:'knowledge',reason:'The explanation attributes a book title to the learner.'}]}:{approved:true,issues:[]});
  }
  return JSON.stringify(report);
 }};
 assert.equal((await runAssess(input,llm,'smart')).verdict,report.verdict);assert.equal(checks,2);
});

test('a supported alternative needs no explanation in the internal check, while other false claims still trigger repair',async()=>{
 const wrong={...report,summary:'你没有提供转述措辞。',alternatives:[{original:quote,better:quote,why:'Optional.'}]};
 let checks=0,repaired=false;
 const llm:LLM={chatStream:()=>stream(JSON.stringify(wrong)),chatText:async o=>{
  if(isCheck(o))return JSON.stringify(++checks===1?{approved:false,issues:[{field:'summary',reason:'Earlier words already provided the relay wording.'}],alternatives:[{original:quote,intentPreserved:true,factsAtTime:true}]}:{approved:true,issues:[],alternatives:[{original:quote,intentPreserved:true,factsAtTime:true}]});
  repaired=true;assert.ok(o.messages.at(-1)!.content.includes('already provided'));return JSON.stringify(report);
 }};
 assert.equal((await runAssess(input,llm,'smart')).summary,report.summary);assert.equal(repaired,true);
});

test('an exact NPC quotation with its known speaker label does not need a model format repair',async()=>{
 const npc=scenario.characters.find(c=>c.id!==role)!;
 const draft={...report,objectiveResults:report.objectiveResults!.map((r,index)=>({...r,...(index===0?{npcEvidence:`${npc.name.zh}： ${messages[0].text}`}:{})}))};
 let calls=0;
 const llm:LLM={chatStream:()=>stream(JSON.stringify(draft)),chatText:async o=>{calls++;assert.ok(isCheck(o),'Speaker metadata needs no rewrite of the report');return JSON.stringify({approved:true,issues:[]});}};
 const result=await runAssess(input,llm,'smart');assert.equal(calls,1);assert.equal(result.objectiveResults![0].npcEvidence,messages[0].text);
});

test('format repair names a verdict mistakenly quoting the NPC and supplies learner source lines',async()=>{
 const wrong={...report,verdictEvidence:messages[0].text};
 let repaired=false;
 const llm:LLM={chatStream:()=>stream(JSON.stringify(wrong)),chatText:async o=>{
  if(isCheck(o))return JSON.stringify({approved:true,issues:[]});
  const request=o.messages.at(-1)!.content;
  assert.ok(request.includes('verdictEvidence'),request);
  assert.ok(request.includes('learner'),request);
  assert.ok(request.includes(quote),request);
  repaired=true;return JSON.stringify(report);
 }};
 assert.equal((await runAssess(input,llm,'smart')).verdictEvidence,quote);assert.equal(repaired,true);
});

test('semantic correction preserves validated unrelated fields even if a model rewrites their quotations',async()=>{
 const wrong={...report,summary:'用户已经喝茶。'};
 let repairs=0,checks=0;
 const llm:LLM={chatStream:()=>stream('malformed'),chatText:async o=>{
  if(isCheck(o))return JSON.stringify(++checks===1?{approved:false,issues:[{field:'summary',reason:'Tea consumption is unsupported.'}]}:{approved:true,issues:[]});
  repairs++;
  return JSON.stringify(repairs===1?wrong:{...report,verdictEvidence:messages[0].text,objectiveResults:[]});
 }};
 const result=await runAssess(input,llm,'smart');
 assert.equal(result.summary,report.summary);assert.equal(result.verdictEvidence,quote);
 assert.deepEqual(result.objectiveResults,report.objectiveResults);assert.equal(repairs,2);assert.equal(checks,2);
});

test('a second distinct semantic issue can be repaired within an explicit two-revision ceiling',async()=>{
 let checks=0,repairs=0;
 const llm:LLM={chatStream:()=>stream(JSON.stringify(report)),chatText:async o=>{
  if(isCheck(o))return JSON.stringify(++checks===1?{approved:false,issues:[{field:'summary',reason:'The summary overstates agreement.'}]}:checks===2?{approved:false,issues:[{field:'knowledge',reason:'The source explanation invents a completed action.'}]}:{approved:true,issues:[]});
  repairs++;return JSON.stringify(repairs===1?{summary:report.summary}:{knowledge:report.knowledge});
 }};
 const result=await runAssess(input,llm,'smart');
 assert.equal(checks,3);assert.equal(repairs,2);assert.equal(result.verdictEvidence,quote);
 let rejectedChecks=0,rejectedRepairs=0;
 const unresolved:LLM={chatStream:llm.chatStream,chatText:async o=>{if(isCheck(o)){rejectedChecks++;return JSON.stringify({approved:false,issues:[{field:'summary',reason:'Still unsupported.'}]});}rejectedRepairs++;return JSON.stringify({summary:report.summary});}};
 await assert.rejects(runAssess(input,unresolved,'smart'));
 assert.equal(rejectedChecks,3);assert.equal(rejectedRepairs,2);
});

test('quotation marks used as formatting need no model repair when the entire inner quote is literal',async()=>{
 const npc=scenario.characters.find(c=>c.id!==role)!;
 const wrapped={...report,verdictEvidence:`「${quote}」`,ratings:report.ratings!.map(r=>({...r,evidence:`“${r.evidence}”`})),objectiveResults:report.objectiveResults!.map((r,index)=>({...r,evidence:`「${r.evidence}」`,...(index===0?{npcEvidence:`${npc.name.zh}：「${messages[0].text}」`}:{})}))};
 let checks=0;
 const llm:LLM={chatStream:()=>stream(JSON.stringify(wrapped)),chatText:async o=>{assert.ok(isCheck(o),'Formatting wrappers must not spend a generation repair');checks++;return JSON.stringify({approved:true,issues:[]});}};
 const result=await runAssess(input,llm,'smart');assert.equal(checks,1);assert.equal(result.verdictEvidence,quote);assert.equal(result.ratings![0].evidence,quote);assert.equal(result.objectiveResults![0].npcEvidence,messages[0].text);
});

test('wrapping an altered or joined quote cannot make it verified',async()=>{
 let repairs=0;
 const altered={...report,verdictEvidence:'「大家一起敬陈总，这杯是茶。」'};
 const llm:LLM={chatStream:()=>stream(JSON.stringify(altered)),chatText:async o=>{assert.ok(!isCheck(o));repairs++;return JSON.stringify(altered);}};
 await assert.rejects(runAssess(input,llm,'smart'));assert.equal(repairs,1);
});

test('the single format repair receives every invalid required quotation, not only the first one',async()=>{
 const wrong={...report,verdictEvidence:messages[0].text,objectiveResults:report.objectiveResults!.map((r,index)=>({...r,...(index===0?{evidence:'joined quotation',npcEvidence:'changed NPC quotation'}:{})}))};
 const llm:LLM={chatStream:()=>stream(JSON.stringify(wrong)),chatText:async o=>{
  if(isCheck(o))return JSON.stringify({approved:true,issues:[]});
  const reason=o.messages.at(-1)!.content;
  for(const field of ['verdictEvidence','objectiveResults[0].evidence','objectiveResults[0].npcEvidence'])assert.ok(reason.includes(field),reason);
  return JSON.stringify(report);
 }};
 assert.equal((await runAssess(input,llm,'smart')).verdictEvidence,quote);
});

test('a checker approval cannot validate altered words explicitly attributed to the learner',async()=>{
 const wrong={...report,knowledge:{theoryIds:[],caseIds:[],whyThis:'你说「大家一起敬陈总，这杯是茶。」体现了坚持不喝。'}};
 const llm:LLM={chatStream:()=>stream(''),chatText:async()=>JSON.stringify({approved:true,issues:[]})};
 const result=await checkAssessment(wrong,input,llm,'smart');
 assert.equal(result.approved,false);assert.ok(result.issues.some(issue=>issue.field==='knowledge'));
 const conditional={...report,reflectionQuestions:['如果你说「这杯我改成茶」，接下来会怎么谈交付？']};
 assert.equal((await checkAssessment(conditional,input,llm,'smart')).approved,true);
});

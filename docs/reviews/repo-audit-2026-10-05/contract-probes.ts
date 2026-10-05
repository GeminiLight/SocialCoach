// Synthetic fault probes only; no real model requests or user records.
import { runPattern } from '../../../app/src/lib/tasks/pattern';
import { runRehearse } from '../../../app/src/lib/tasks/rehearse';
import { runReflect } from '../../../app/src/lib/tasks/reflect';
import { sanitizeReport } from '../../../app/src/lib/tasks/assess';
import { buildSession } from '../../../app/src/lib/session-utils';
import { roleplayOutput } from '../../../app/src/lib/roleplay-output';
import { SCENARIOS } from '../../../app/src/data/corpus';
import type { LLM } from '../../../app/src/lib/llm-core';
const stub=(payload:unknown):LLM=>({chatText:async()=>JSON.stringify(payload),chatStream:()=>({deltas:(async function*(){yield typeof payload==='string'?payload:JSON.stringify(payload);})(),text:()=>typeof payload==='string'?payload:JSON.stringify(payload),refused:()=>false})});
async function main(){
 const quote='我现在不能答应这个要求，需要先核实。';
 const sessions=[{title:'A',at:1,gaveGroundOn:[],turns:1,weaknesses:[{behavior:'x',evidence:quote,skill:'communication',deficit:'performance'}]},{title:'B',at:2,gaveGroundOn:[],turns:1,weaknesses:[]}];
 const patternPayload={found:true,pattern:'反复退让',why:'两场证据',nextStep:'x',evidence:[{title:'A',quote},{title:'B',quote}]};
 const alias=await runPattern({sessions,lang:'zh',goals:['communication']},stub(patternPayload),'fake');
 const extended=await runPattern({sessions,lang:'zh',goals:['communication']},stub({...patternPayload,evidence:[{title:'A',quote:quote+'所以我同意无条件加班。'},{title:'B',quote:quote+'所以我同意无条件加班。'}]}),'fake');
 console.log(JSON.stringify({test:'pattern',sameSessionUnderTwoTitles:alias.found,inventedQuoteSuffixAccepted:extended.found}));
 const repeated=await runPattern({sessions:[sessions[0],{...sessions[0],at:2}],lang:'zh',goals:['communication']},stub({...patternPayload,evidence:[{title:'A',quote},{title:'A',quote}]}),'fake');
 console.log(JSON.stringify({test:'patternRepeatedScenario',twoActualSessionsSameTitleDetected:repeated.found}));
 const result=await runRehearse({description:'明天我要拒绝主管让我周末加班的要求。',lang:'zh'},stub({skills:['communication'],characters:[]}), 'fake');
 let sessionCreationError='';try{buildSession(result.scenario,'rehearse','zh');}catch(e){sessionCreationError=(e as Error).message;}
 console.log(JSON.stringify({test:'generatedScenario',taskReturnedSuccess:!!result.scenario,npcCount:result.scenario.characters.filter(c=>c.id!=='you').length,hasObjectives:Array.isArray(result.scenario.objectives),sessionCreationError}));
 const scene=SCENARIOS.find(s=>s.skills.includes('communication'))!;
 const learnerId=scene.characters.find(c=>c.playable)!.id;
 const npc=scene.characters.find(c=>c.id!==learnerId)!;
 const accepted=roleplayOutput(scene,learnerId,'zh').complete(JSON.stringify({meta:{objectives:scene.objectives.map(()=>true),ended:false,stance:100,revealed:true,note:''},utterances:[{characterId:npc.id,text:'我还没有同意，也没有说出私下原因。'}]}));
 console.log(JSON.stringify({test:'simulationMeta',unearnedObjectivesAndDisclosureAccepted:accepted.includes('"revealed":true'),npcDidNotAgree:accepted.includes('还没有同意')}));
 const reflect=await runReflect({scenario:scene,question:'你当时怎么想？',answer:quote,lang:'zh'},stub('你总是先讨好别人，所以才没有把自己的要求说清楚。'),'fake');
 console.log(JSON.stringify({test:'reflection',unquotedJudgmentAccepted:reflect.includes('你总是先讨好')}));
 const entries=new Map<string,string>();let denied=false;
 const storage={getItem:(key:string)=>entries.get(key)??null,setItem:(key:string,value:string)=>{if(denied)throw new DOMException('Quota','QuotaExceededError');entries.set(key,value);},removeItem:(key:string)=>entries.delete(key)};
 Object.defineProperty(globalThis,'window',{value:globalThis,configurable:true});
 Object.defineProperty(globalThis,'localStorage',{value:storage,configurable:true});
 Object.defineProperty(globalThis,'sessionStorage',{value:storage,configurable:true});
 const {useApp}=await import('../../../app/src/store/useApp');
 const report=sanitizeReport({ratings:[{skill:'communication',level:1,evidence:quote,reason:'表达不够有效'}],verdictEvidence:quote,verdict:'x',deltas:{communication:0.5}},scene,[],[],[{id:'l',role:'learner',text:quote,ts:0}],['communication']);
 useApp.setState({sessions:[],proficiency:{communication:2.5}});
 for(let i=0;i<5;i++){const s={...buildSession(scene,'arena','zh'),id:'p'+i,status:'ended' as const};useApp.getState().addSession(s);useApp.getState().applyReport(s.id,report);}
 console.log(JSON.stringify({test:'proficiency',repeatedLevel:report.ratings?.[0].level,delta:report.deltas.communication,afterFiveSameLowRatings:useApp.getState().proficiency.communication}));
 const s={...buildSession(scene,'arena','zh'),id:'quota',status:'active' as const};useApp.setState({sessions:[s]});
 const before=entries.get('socialcoach.v1');denied=true;
 let thrown=false;try{useApp.getState().appendMessage('quota',{id:'new',role:'learner',text:quote,ts:0});}catch{thrown=true;}
 console.log(JSON.stringify({test:'quota',thrown,memoryContainsNewMessage:useApp.getState().sessions[0].messages.length===1,diskUnchanged:entries.get('socialcoach.v1')===before,storageIssue:useApp.getState().storageIssue}));
 if(process.argv.includes('--bad-schema')){
  denied=false;entries.set('socialcoach.v1',JSON.stringify({state:{profile:null,sessions:null},version:0}));
  await useApp.persist.rehydrate();
 }
}
void main();

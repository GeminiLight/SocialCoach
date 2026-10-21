/** Opt-in, paid real-model acceptance. Run with node --env-file=.env.local --import tsx.
 * LIVE_WORKFLOW_DIR preserves every completed stage and raw content-only model call.
 * LIVE_WORKFLOW_CASE can select comma-separated case IDs. Never used in offline CI.
 */
import assert from 'node:assert/strict';
import {access,mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {scenarioById} from '../src/data/corpus';
import {FAST_MODEL,SMART_MODEL,hasServerCredential,serverLLM} from '../src/lib/llm';
import type {LLM} from '../src/lib/llm-core';
import {taskLLM,type ModelTask} from '../src/lib/task-runtime';
import {buildSession} from '../src/lib/session-utils';
import type {Session} from '../src/lib/types';
import {parseRoleplay} from '../src/lib/client-api';
import {runSchedule} from '../src/lib/tasks/schedule';
import {runRoleplay} from '../src/lib/tasks/roleplay';
import {runAssess} from '../src/lib/tasks/assess';
import {runReflect} from '../src/lib/tasks/reflect';
import {runDebriefChat} from '../src/lib/tasks/debrief-chat';
import {buildDebriefInput} from '../src/lib/debrief-chat';
import {runDinner,parseDinnerInput} from '../src/features/dinner/lib/director';
import {buildDinnerReview,captureDinnerContent} from '../src/features/dinner/lib/review';
import {scenarios} from '../src/features/dinner/lib/content';
import {opening,SaveSchema,type Message} from '../src/features/dinner/lib/engine';
import {storyScenario,variantFor} from '../src/features/dinner/lib/story';
import {createWorld,roomContext} from '../src/features/dinner/lib/room';
import {textPlayFixtures} from './text-play-fixtures';

const cases=[
 {id:'text-zh',lang:'zh',scenario:'office-quick-favor',lines:[...textPlayFixtures.find(c=>c.id==='office-quick-favor')!.routes.boundary,'如果只列出问题，你会怎样交接？这不是确认我已经核实了数据。','我还想继续聊。下次你会怎样说明预计工作量，而不是都说五分钟？']},
 {id:'text-en',lang:'en',scenario:'partner-location-pressure',lines:[...textPlayFixtures.find(c=>c.id==='partner-location-pressure')!.routes.boundary,'I could discuss sharing for a particular trip, but I have not agreed to do it. What would the limit be?','I have changed my mind about sharing. I can update you about a delay to an agreed plan. How would we handle remaining disagreement?']},
 {id:'dinner-zh',lang:'zh',scene:'family',variant:'family-privacy',target:'mom',lines:['妈妈，工作变动还没确定。我会自己跟大姨说，工资不要替我转述。已经发过去的消息，你会怎么补充说明？','我知道你想关心我。我可以自己回复大姨，但没有答应告诉她工资。你发的原话是什么？','我不是家庭新闻发布会，哈哈。刚才玩笑可能有点冲，抱歉；不要替我转述的边界不变。','如果你愿意补充说明，请说工作还没确定、细节由我本人决定。不用替我答应回复时间。','我还想聊：你能接受以后转述之前先问我吗？如果你不接受，我们也可以保留分歧。','谢谢你愿意讨论。现在我们只是商量怎么说，消息还没有实际发出，对吗？']},
 {id:'dinner-en',lang:'en',scene:'office',variant:'office-overtime',target:'he',lines:['I can discuss doing the final review if the data and layout are ready. I cannot take all three tasks. Who owns each part?','I have not agreed to the deadline. What data are still unchecked, and what was actually requested?','I am not a three-person department, though that joke might sound dismissive. Sorry for the tone. My capacity limit remains.','I can offer a final review after the checks; I cannot guarantee 18:30 before we know when they finish. What would you propose?','Let us keep talking. Who would tell the manager if those conditions are not met? That is a question, not my acceptance of the job.','We have discussed a plan, but the data have not actually been checked during this conversation. Can we leave the deadline conditional?']},
] as const;

async function main(){
 assert(hasServerCredential(),'A real server model credential is required');
 const root=resolve(process.env.LIVE_WORKFLOW_DIR??'/tmp/socialcoach-full-workflow-live');
 await mkdir(root,{recursive:true});
 const selected=cases.filter(c=>!process.env.LIVE_WORKFLOW_CASE||process.env.LIVE_WORKFLOW_CASE.split(',').includes(c.id));
 assert(selected.length,'Unknown workflow case');
 if(process.env.LIVE_WORKFLOW_COACHING_ONLY==='1')assert(process.env.LIVE_WORKFLOW_REPLAY_DIR,'Coaching-only mode needs a replay directory');
 if(process.env.LIVE_WORKFLOW_REPLAY_DIR)assert.notEqual(root,resolve(process.env.LIVE_WORKFLOW_REPLAY_DIR),'Never overwrite replay evidence');
 for(const c of selected){
  const exists=await access(resolve(root,`${c.id}.json`)).then(()=>true,()=>false);
  assert(!exists,`${c.id} already exists; choose a new output directory to retain failed attempts`);
 }
 const results=[];
 // Two independent conversations at most; dependent turns always run sequentially.
 for(let offset=0;offset<selected.length;offset+=2)results.push(...await Promise.allSettled(selected.slice(offset,offset+2).map(async c=>{
  let stage='start',session:Session|undefined;
  const calls:{stage:string;model?:string;raw:string;ok:boolean;ms:number}[]=[],steps:unknown[]=[];
  const checkpoint=async(error?:string)=>writeFile(resolve(root,`${c.id}.json`),JSON.stringify({at:new Date().toISOString(),id:c.id,lang:c.lang,models:{fast:FAST_MODEL,smart:SMART_MODEL},stage,error,calls,steps,session},null,2)+'\n');
  const observed:LLM={
   async chatText(o){const record={stage,model:o.model,raw:'',ok:false,ms:0},start=Date.now();calls.push(record);try{record.raw=await serverLLM.chatText(o);record.ok=true;return record.raw;}finally{record.ms=Date.now()-start;await checkpoint();}},
   chatStream(o){const run=serverLLM.chatStream(o),record={stage,model:o.model,raw:'',ok:false,ms:0},start=Date.now();calls.push(record);return {...run,deltas:(async function*(){try{for await(const d of run.deltas){record.raw+=d;yield d;}record.ok=true;}finally{record.ms=Date.now()-start;await checkpoint();}})()};},
  };
  const llm=(task:ModelTask)=>taskLLM(observed,task,undefined,undefined,c.lang);
  const done=async(value:unknown)=>{steps.push({stage,value});await checkpoint();console.log(`${c.id} ${stage} complete`);};
  try{
   if(process.env.LIVE_WORKFLOW_REPLAY_DIR){
    const saved=JSON.parse(await readFile(resolve(process.env.LIVE_WORKFLOW_REPLAY_DIR,`${c.id}.json`),'utf8'));
    assert(saved.session?.messages?.length,'Replay needs a saved conversation');
    session=saved.session as Session;session.reflections=[];session.debriefChat=[];
   }else if('scenario' in c){
    const scenario=scenarioById(c.scenario)!;stage='schedule';
    const scheduled=await runSchedule({scenarioId:scenario.id,profile:{name:'Test learner',bio:'',goals:scenario.skills,contexts:[scenario.context],lang:c.lang,createdAt:Date.now()},proficiency:{},history:[],lang:c.lang},llm('schedule'),FAST_MODEL);
    session=buildSession(scheduled.scenario,'arena',c.lang,scheduled);
    session.messages=[{id:'opening',role:'npc',characterId:scenario.opening.characterId,text:scenario.opening.text[c.lang],ts:Date.now()}];await done(scheduled);
    for(const [i,text] of c.lines.entries()){
     stage=`turn-${i+1}`;session.messages.push({id:`u${i}`,role:'learner',text,ts:Date.now()});
     let visible='';const raw=await runRoleplay({scenario,learnerCharacterId:session.learnerCharacterId,messages:session.messages,lang:c.lang,turnLimit:12},llm('roleplay'),FAST_MODEL,d=>{visible+=d;});
     assert.equal(visible,raw);const parsed=parseRoleplay(raw,scenario.characters.filter(ch=>ch.id!==session!.learnerCharacterId).map(ch=>ch.id));assert(parsed.meta&&parsed.utterances.length);
     parsed.utterances.forEach((u,j)=>session!.messages.push({id:`n${i}-${j}`,role:'npc',characterId:u.characterId,text:u.text,ts:Date.now(),...(j===parsed.utterances.length-1?{meta:parsed.meta!}:{})}));await done(parsed);
    }
   }else{
    const scene=storyScenario(scenarios.find(s=>s.id===c.scene)!,variantFor(c.scene,c.variant)),room=roomContext(createWorld(scene));
    const contentSnapshot=captureDinnerContent(c.scene,c.variant,12,1),messages:Message[]=[opening(scene,c.lang,c.variant)];
    for(const [i,text] of c.lines.entries()){
     stage=`turn-${i+1}`;
     const input=parseDinnerInput({contentSnapshot,briefVersion:1,scenarioId:c.scene,variantId:c.variant,targetId:c.target,lang:c.lang,text,history:messages,room,maxTurns:12});
     // Match the HTTP route's tighter 30-second deadline, including repairs.
     const signal=AbortSignal.timeout(30000);
     const reply=await runDinner(input,taskLLM(observed,'dinner',signal,undefined,c.lang),FAST_MODEL,signal);
     messages.push({role:'user',text,targetId:c.target,room},{role:'npc',...reply,mode:'model'});
     session=buildDinnerReview(SaveSchema.parse({version:1,contentSnapshot,briefVersion:1,scenarioId:c.scene,variantId:c.variant,lang:c.lang,maxTurns:12,started:true,complete:true,draft:'',messages}),c.id);await done(reply);
    }
   }
   assert(session);session.status='ended';stage=process.env.LIVE_WORKFLOW_COACHING_ONLY==='1'?'assess-reused':'assess';
   if(process.env.LIVE_WORKFLOW_COACHING_ONLY!=='1')session.report=await runAssess({scenario:session.scenario,learnerCharacterId:session.learnerCharacterId,messages:session.messages,lang:c.lang,goals:session.scenario.skills,sceneContext:session.sceneContext},llm('assess'),SMART_MODEL);
   assert(session.report,'Coaching-only replay needs an existing report');
   session.status='assessed';await done(session.report);
   stage='reflect';const answer=c.lang==='zh'?'我担心拒绝会伤关系，所以刚才用了玩笑；但不想让道歉变成同意。':'I worried refusal would hurt the relationship, so I tried a joke. I do not want my apology to become consent.';
   const question=session.report.reflectionQuestions[0];assert(question);
   const coachReply=await runReflect({scenario:session.scenario,learnerCharacterId:session.learnerCharacterId,lang:c.lang,question,answer,messages:session.messages,summary:session.report.summary},llm('reflect'),FAST_MODEL);
   session.reflections.push({question,answer,coachReply});await done(coachReply);
   const questions=c.lang==='zh'?['我最后到底答应了什么？请区分提议、条件和已完成的事。','我不想扩大承诺。请保留我的拒绝，给一句更自然的说法。']:['What did I actually agree to? Separate proposals, conditions, and completed actions.','I do not want to expand my commitment. Keep my refusal and suggest a more natural way to say it.'];
   for(const [i,question] of questions.entries()){
    stage=`debrief-${i+1}`;const reply=await runDebriefChat(buildDebriefInput(session,question,c.lang),llm('debrief-chat'),FAST_MODEL);
    assert(session.messages.some(m=>m.role==='learner'&&m.text.includes(reply.evidence)));session.debriefChat??=[];session.debriefChat.push({id:`d${i}`,question,reply,at:Date.now()});await done(reply);
   }
   stage='complete';await checkpoint();
  }catch(error){await checkpoint(String(error));console.error(`${c.id} ${stage}: ${String(error)}`);throw error;}
 })));
 const failed=results.filter(r=>r.status==='rejected').length;
 console.log(JSON.stringify({cases:results.length,failed,artifacts:root}));if(failed)process.exitCode=1;
}
void main();

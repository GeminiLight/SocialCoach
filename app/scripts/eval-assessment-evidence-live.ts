/** Opt-in, synthetic semantic calibration. Never reads the user feedback document. */
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {feedbackFixtures} from './feedback-fixtures';
import {scenarios} from '../src/features/dinner/lib/content';
import {SaveSchema,opening} from '../src/features/dinner/lib/engine';
import {buildDinnerReview} from '../src/features/dinner/lib/review';
import {checkAssessment} from '../src/lib/tasks/assessment-check';
import {hasServerCredential,serverLLM,SMART_MODEL} from '../src/lib/llm';
import type {Report} from '../src/lib/types';
import type {LLM} from '../src/lib/llm-core';

function sample(id:string){
 const f=feedbackFixtures.find(f=>f.id===id)!,scene=scenarios.find(s=>s.id===f.scene)!;
 const session=buildDinnerReview(SaveSchema.parse({version:1,scenarioId:f.scene,variantId:f.variant,lang:'zh',messages:[opening(scene,'zh',f.variant),...f.records.flatMap(r=>[{role:'user',text:r.text},{role:'npc',...r.reply}])],started:true,complete:true,draft:''}),id);
 const quote=f.records[0].text;
 const family=id==='resolved-boundary',drank=id==='explicit-drinking';
 const report:Report={scoringVersion:2,ratings:[{skill:'communication',level:2,evidence:quote,reason:family?'你分别说明了三项拒绝，并提供转述指令。':'你直接表达了自己的敬酒动作，交付条件还未说明。'}],stars:2,outcome:family?'success':'failure',objectiveResults:session.scenario.objectives.map((_,index)=>({index,status:family?'met':index===0&&!drank?'unknown':'unmet',evidence:quote,reason:family?'已经明确表达拒绝和决定权。':index===0?(drank?'本人明确选择并完成喝酒。':'举杯不确立饮品或是否饮用。'):'截至记录末尾交付条件尚未讲明。'})),verdictEvidence:quote,verdict:family?'拒绝与转述边界表达清楚；尚不能确认实际转达。':drank?'你明确选择喝酒，交付条件还未说清。':'你参与举杯，饮品及是否入口未确认，交付条件尚未说清。',summary:'',strengths:[],weaknesses:[],alternatives:[],knowledge:{theoryIds:[],caseIds:[],whyThis:''},reflectionQuestions:[],nextStep:'',deltas:{}};
 return {session,report,quote};
}
async function main(){
 assert.ok(hasServerCredential(),'No model credential configured');
 const arg=process.argv.indexOf('--output'),out=arg>=0?process.argv[arg+1]:undefined;assert.ok(out,'An explicit local output folder is required');await mkdir(out,{recursive:true});
 const family=sample('resolved-boundary'),toast=sample('ambiguous-toast'),drink=sample('explicit-drinking');
 const checkingLLM:LLM=process.env.ASSESS_CHECK_EVAL_EFFORT==='low'?{...serverLLM,chatText:opts=>serverLLM.chatText({...opts,effort:'low'})}:serverLLM;
 const cases=[
  {id:'clear-refusal',sample:family,want:true,patch:{}},
  {id:'toast-unknown',sample:toast,want:true,patch:{}},
  {id:'chosen-drinking',sample:drink,want:true,patch:{}},
  {id:'answered-relay',sample:family,want:false,patch:{summary:'你没有给出转述口径，最后只能依靠爸爸替你决定。'}},
  {id:'future-as-completed',sample:family,want:false,patch:{verdict:'家人已经把原话转达，介绍人已经收到并接受了你的拒绝。'}},
  {id:'settled-choice',sample:family,want:false,patch:{reflectionQuestions:['你还没决定是否允许转述，下一次会默认允许，还是要求先问你？']}},
  {id:'invented-tea',sample:toast,want:false,patch:{verdict:'你全程以茶代酒，坚持没有喝酒。'}},
  {id:'invented-authority',sample:toast,want:false,patch:{alternatives:[{original:toast.quote,better:'这杯敬您。新报表周三一定不进，我可以说定。',why:'未确认的范围可直接排除。'}]}},
  {id:'old-aim-penalty',sample:drink,want:false,patch:{ratings:[{skill:'resolving-conflicts' as const,level:0 as const,evidence:drink.quote,reason:'你主动改变了不喝酒的想法，所以没有守住边界，沟通能力不合格。'}]}},
  {id:'changed-intent-alternative',sample:drink,want:false,patch:{alternatives:[{original:drink.quote,better:'陈总，我不能喝，这杯改成茶。',why:'用不喝酒的边界替代你已决定喝酒的意愿。'}]}},
 ];
 const results:unknown[]=[];let next=0;
 await Promise.all(Array.from({length:2},async()=>{for(;;){const i=next++;if(i>=cases.length)return;const c=cases[i],start=Date.now();try{
  const s=c.sample.session,result=await checkAssessment({...c.sample.report,...c.patch},{scenario:s.scenario,learnerCharacterId:'you',messages:s.messages,goals:s.scenario.skills,lang:'zh',sceneContext:s.sceneContext},checkingLLM,SMART_MODEL,AbortSignal.timeout(90000));
  const value={id:c.id,want:c.want,ms:Date.now()-start,ok:result.approved===c.want,result};results.push(value);console.log(JSON.stringify(value));
 }catch(error){const value={id:c.id,ok:false,error:String(error),ms:Date.now()-start};results.push(value);console.log(JSON.stringify(value));}}}));
 await writeFile(join(out,'semantic-calibration.json'),JSON.stringify(results,null,2));
 assert.ok(results.every(r=>(r as {ok:boolean}).ok),'Inspect failed positive/negative semantic calibrations');
}
void main();

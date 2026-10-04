/** Live semantic sample. All transcripts are synthetic. Save outputs locally for human review.
 * Run with the configured model environment and --output <local folder>. */
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {feedbackFixtures} from './feedback-fixtures';
import {scenarios} from '../src/features/dinner/lib/content';
import {SaveSchema,opening} from '../src/features/dinner/lib/engine';
import {buildDinnerReview} from '../src/features/dinner/lib/review';
import {runAssess} from '../src/lib/tasks/assess';
import {hasServerCredential,serverLLM,SMART_MODEL} from '../src/lib/llm';
import type {LLM} from '../src/lib/llm-core';

async function main(){
 assert.ok(hasServerCredential(),'No model credential configured');
 const arg=process.argv.indexOf('--output'),out=arg>=0?process.argv[arg+1]:undefined;
 assert.ok(out,'An explicit local output folder is required');await mkdir(out,{recursive:true});
 const configuredEffort=process.env.ASSESS_CHECK_EVAL_EFFORT;
 assert.ok(!configuredEffort||configuredEffort==='low'||configuredEffort==='medium','Invalid calibration effort');
 const checkEffort=configuredEffort==='low'?'low' as const:configuredEffort==='medium'?'medium' as const:undefined;
 const results=[];
 const onlyArg=process.argv.indexOf('--only'),only=onlyArg>=0?process.argv[onlyArg+1]:undefined;
 for(const fixture of feedbackFixtures.filter(f=>!only||f.id===only)){
  const scene=scenarios.find(s=>s.id===fixture.scene)!;
  const save=SaveSchema.parse({version:1,scenarioId:fixture.scene,variantId:fixture.variant,lang:'zh',messages:[opening(scene,'zh',fixture.variant),...fixture.records.flatMap(r=>[{role:'user',text:r.text},{role:'npc',...r.reply}])],started:true,complete:true,draft:''});
  const session=buildDinnerReview(save,fixture.id);
  const calls:{kind:string;ms:number}[]=[],raw:{kind:string;text:string}[]=[];
  const measured:LLM={chatStream:opts=>{const run=serverLLM.chatStream(opts);return {...run,text:()=>{const text=run.text();raw.push({kind:'draft',text});return text;}};},chatText:async opts=>{const start=Date.now(),kind=JSON.stringify(opts.system).includes('ASSESSMENT FACT CHECK')?'fact-check':'repair';try{const text=await serverLLM.chatText(kind==='fact-check'&&checkEffort?{...opts,effort:checkEffort}:opts);raw.push({kind,text});return text;}finally{calls.push({kind,ms:Date.now()-start});}}};
  const start=Date.now();
  try{
   const report=await runAssess({scenario:session.scenario,learnerCharacterId:'you',messages:session.messages,goals:session.scenario.skills,lang:'zh',sceneContext:session.sceneContext},measured,SMART_MODEL);
   await writeFile(join(out,`${fixture.id}.json`),JSON.stringify({id:fixture.id,ms:Date.now()-start,calls,report,raw},null,2));
   results.push({id:fixture.id,ok:true,ms:Date.now()-start,calls});
   console.log(JSON.stringify(results.at(-1)));
  }catch(error){results.push({id:fixture.id,ok:false,ms:Date.now()-start,calls,error:error instanceof Error?error.message:String(error)});await writeFile(join(out,`${fixture.id}-failure.json`),JSON.stringify({...results.at(-1),raw},null,2));console.log(JSON.stringify(results.at(-1)));}
 }
 await writeFile(join(out,'results.json'),JSON.stringify(results,null,2));
 assert.ok(results.every(r=>r.ok),'Some reports could not be reliably generated; inspect local evidence');
}
void main();

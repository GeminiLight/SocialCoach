/** Opt-in paid comparison on fixed fictional transcripts. Never run by CI.
 * PROMPT_COST_DIR must be a fresh directory. Preserve both successful and failed
 * calls; byte counts are prompt size, not provider token usage or currency.
 */
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {FAST_MODEL,serverLLM,hasServerCredential} from '../src/lib/llm';
import {systemParts,type LLM} from '../src/lib/llm-core';
import {taskLLM} from '../src/lib/task-runtime';
import {buildDebriefInput} from '../src/lib/debrief-chat';
import {runDebriefChat,debriefKnowledge} from '../src/lib/tasks/debrief-chat';
import {runReflect} from '../src/lib/tasks/reflect';
import {checkDebriefReply} from '../src/lib/tasks/debrief-check';
import {pick} from '../src/lib/i18n';
import type {Session} from '../src/lib/types';

async function main(){
 assert(hasServerCredential(),'Configure a real model first');
 assert(process.env.PROMPT_COST_DIR,'Choose a fresh PROMPT_COST_DIR');
 const out=resolve(process.env.PROMPT_COST_DIR!);
 await mkdir(out); // exclusive: never replace earlier evidence
 const fixtures=resolve('../docs/reviews/live-workflow-2026-10-22');
 const load=async(file:string)=>JSON.parse(await readFile(resolve(fixtures,file),'utf8'));
 const sessions:Record<string,Session>={};
 for(const id of ['text-zh','text-en','dinner-zh','dinner-en'])sessions[id]=(await load('baseline/'+id+'.json')).session;
 const cases=[
  ...Object.keys(sessions).map(id=>({id,reflection:false})),
  {id:'text-zh',reflection:true},{id:'text-en',reflection:true},
 ];
 const selected=cases.filter(c=>!process.env.PROMPT_COST_CASE||process.env.PROMPT_COST_CASE.split(',').includes(c.id+(c.reflection?'-reflect':'')));
 assert(selected.length,'Unknown PROMPT_COST_CASE');
 for(const c of selected){
  const session=sessions[c.id],lang=c.id.endsWith('zh')?'zh':'en';
  const calls:unknown[]=[];const started=Date.now();
  const llm:LLM={chatStream:()=>{throw Error('No draft streaming');},chatText:async o=>{
   const start=Date.now();let raw='';let ok=false;
   try{raw=await serverLLM.chatText(o);ok=true;return raw;}finally{
    calls.push({durationMs:Date.now()-start,ok,inputBytes:Buffer.byteLength([...systemParts(o.system).map(p=>p.text),...o.messages.map(m=>m.content)].join('\n')),systemBytes:Buffer.byteLength(systemParts(o.system).map(p=>p.text).join('\n')),maxOutput:o.maxTokens,raw});
   }
  }};
  let result:unknown,error:unknown;
  try{
   if(c.reflection){const r=session.reflections[0];assert(r);
    result=await runReflect({scenario:session.scenario,learnerCharacterId:session.learnerCharacterId,messages:session.messages,summary:session.report!.summary,question:r.question,answer:r.answer,lang},taskLLM(llm,'reflect'),FAST_MODEL);
   }else{
    const question=lang==='zh'?'这段对话中，我实际答应了什么、哪些只是提议、哪些尚未完成？请只说明事实。':'What did I actually agree to, what remained proposals, and what has not been done? Please give only the facts.';
    result=await runDebriefChat(buildDebriefInput({...session,debriefChat:[]},question,lang),taskLLM(llm,'debrief-chat'),FAST_MODEL);
   }
  }catch(e){error={name:(e as Error).name,message:(e as Error).message};process.exitCode=1;}
  const name=c.id+(c.reflection?'-reflect':'');
  await writeFile(resolve(out,name+'.json'),JSON.stringify({id:name,model:FAST_MODEL,durationMs:Date.now()-started,calls,result,error},null,2)+'\n');
  console.log(name,error?'FAILED':'complete',calls.length+' calls');
 }
 const negatives=await load('socialcoach-live-negative-checks.json');
 const owner=await load('ownership-regression.json');
 negatives.push({id:'later-ownership',input:owner.input,badReply:owner.reply});
 const finalProposal=JSON.parse(await readFile(resolve('../docs/reviews/prompt-cost-2026-10-22/unaccepted-final-proposal.json'),'utf8'));
 negatives.push({id:finalProposal.id,input:buildDebriefInput({...sessions['text-en'],debriefChat:[]},'What did I actually agree to, what remained proposals, and what has not been done? Please give only the facts.','en'),badReply:finalProposal.reply});
 for(const n of negatives){
  const kb=debriefKnowledge(n.input),lang=n.input.lang;
  const knowledge=[...kb.theories.map(k=>({kind:'theory',id:k.id,title:pick(k.title,lang),source:k.source,principle:pick(k.principle,lang),howTo:k.howTo.map(v=>pick(v,lang))})),...kb.cases.map(k=>({kind:'case',id:k.id,title:pick(k.title,lang),source:k.source,situation:pick(k.situation,lang),whatHappened:pick(k.whatHappened,lang),takeaway:pick(k.takeaway,lang)}))];
  let check:unknown,error:unknown;
  try{check=await checkDebriefReply(n.input,n.badReply,knowledge,taskLLM(serverLLM,'debrief-chat'),FAST_MODEL);if((check as {approved:boolean}).approved)process.exitCode=1;}catch(e){error={name:(e as Error).name,message:(e as Error).message};process.exitCode=1;}
  await writeFile(resolve(out,'negative-'+n.id+'.json'),JSON.stringify({id:n.id,model:FAST_MODEL,check,error},null,2)+'\n');
  console.log('negative',n.id,check);
 }
}
void main();

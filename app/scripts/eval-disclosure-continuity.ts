/** Real-model replay of authored fiction, never private learner records.
 * Run in app/ with the existing server model; output is evidence for manual review. */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {scenarioById} from '../src/data/corpus';
import {FAST_MODEL,hasServerCredential,serverLLM} from '../src/lib/llm';
import type {ChatOpts,LLM} from '../src/lib/llm-core';
import {runRoleplay} from '../src/lib/tasks/roleplay';
import {parseRoleplay} from '../src/lib/client-api';
import type {ChatMessage} from '../src/lib/types';
import type {Lang} from '../src/data/taxonomy';

const tests:{id:string;name?:string;lang:Lang;prior?:ChatMessage[];lines:string[]}[]=[
 {id:'office-quick-favor',lang:'zh',lines:[
  '我自己的报告16:30要交。我最多只讨论一页，还没答应帮忙时间。你听到的承诺是什么？',
  '你给我看一下老板原始反馈吧。到底要求改的是排版还是论证？',
  '既然原话是论证问题，我只讨论第三页，不替你改完六页。你自己准备怎么处理剩余内容？',
 ]},
 {id:'office-quick-favor',lang:'en',lines:[
  'My report is due at 16:30. I can only discuss one page, and have not agreed on a help time. What have you heard me promise?',
  'Can you show me the original feedback from the boss? Did they ask for formatting or a change in reasoning?',
  'That feedback concerns reasoning. I can discuss page three, not redo all six. How will you handle the remaining pages?',
 ]},
 {id:'parent-unannounced-visit',lang:'zh',lines:[
  '刚才语气急了，抱歉。但十分钟后考试开始，期间我不能下楼。你能先答我，下次来之前能不能问一下？',
  '你这次突然来，具体是在担心我什么？我想听清楚，不代表能在考试时接待。',
  '我听到了你担心我遇到困难。我可以考试结束后联系，但现在不能下楼，也没答应让你上楼。你愿意怎么等？',
 ]},
 {id:'partner-location-pressure',lang:'en',lines:[
  'I hear you are worried, but I have not agreed to constant tracking. Can you tell me what limit you think I have stated?',
  'Which specific situation worries you most? What are you afraid will happen?',
  'Missing an agreed meeting and not reporting every movement are different. For an actual plan, we could agree on an update if delayed. What would still worry you?',
 ]},
 {id:'class-chat-screenshot',lang:'zh',lines:[
  '刚才语气急了，可以缓一点。但不包办最后修改不等于不合作。程凡，你愿意先更正群里那句解释吗？',
  '程凡，你具体担心最后修改怎样分到你头上？先说你的担心，不代表我接下全部修改。',
  '我听清了你的担心。沈星，先别替我接活，现在还有哪些人没分到任务？',
 ]},
 {id:'office-quick-favor',name:'online-recap-reproduction',lang:'zh',prior:[
  {id:'u1',role:'learner',text:'我自己的报告16:30要交。我最多只看一页，不替你重做。',ts:1},
  {id:'n1',role:'npc',characterId:'tang',text:'要不你交完报告后帮我看第三页？',ts:2},
 ],lines:[
  '我没有答应交完报告后帮忙。你听到的承诺是什么？',
  '你给我看一下老板原始反馈吧。到底要求改的是排版还是论证？',
  '我知道原话了，但还没有执行检查或改稿。你现在还需要核实哪些问题？',
 ]},
];

// Only replace the two changed prompt passages. Both versions use the same
// task, model, format checks and help-time protection; no second old module.
function previousDirection(opts:ChatOpts):ChatOpts{
 const previous=(text:string)=>text
  .replaceAll('hidden (private; obey its specific disclosure condition)','hidden (reveal only when earned)')
  .replaceAll('FIXED FACTS AND UNKNOWNS (simulation knowledge, not automatically public; private facts still obey their disclosure conditions):','FIXED FACTS AND UNKNOWNS:')
  .replace(/^- A character's explicit disclosure condition[^\n]+/mu,'- "hidden" facts are revealed only when the learner asks a good question, shows empathy, or creates safety — never volunteer them early.');
 return {...opts,system:Array.isArray(opts.system)?opts.system.map(block=>({...block,text:previous(block.text)})):previous(opts.system)};
}

async function main(){
 assert(hasServerCredential());
 const root=resolve(process.env.DISCLOSURE_EVAL_DIR??'/tmp/socialcoach-disclosure-continuity');
 await mkdir(root,{recursive:true});
 const records:unknown[]=[],issues:string[]=[];
 const phase=process.env.DISCLOSURE_EVAL_PHASE;
 assert(!phase||phase==='current'||phase==='previous');
 const only=process.env.DISCLOSURE_EVAL_CASE;
 const selected=tests.filter(test=>!only||test.id===only||test.name===only);
 assert(selected.length,'Unknown replay case');
 for(const label of (['previous','current'] as const).filter(label=>!phase||phase===label)){
  const results=await Promise.allSettled(selected.map(async test=>{
   const scenario=scenarioById(test.id)!;
   const messages:ChatMessage[]=[{id:'opening',role:'npc',characterId:scenario.opening.characterId,text:scenario.opening.text[test.lang],ts:0},...(test.prior??[])];
   for(let turn=1;turn<=test.lines.length;turn++){
    const learner=test.lines[turn-1];messages.push({id:'u'+turn,role:'learner',text:learner,ts:turn*2});
    let repairs=0,preview='',modelRaw='';const start=Date.now();
    const llm:LLM={
     chatStream:opts=>{const run=serverLLM.chatStream(label==='previous'?previousDirection(opts):opts);return {...run,deltas:(async function*(){for await(const delta of run.deltas){modelRaw+=delta;yield delta;}})()};},
     chatText:opts=>{repairs++;return serverLLM.chatText(label==='previous'?previousDirection(opts):opts);},
    };
    let raw:string;
    try{raw=await runRoleplay({scenario,learnerCharacterId:'you',lang:test.lang,messages},llm,FAST_MODEL,d=>preview+=d);}
    catch(error){records.push({label,id:test.id,case:test.name??test.id,lang:test.lang,turn,learner,error:String(error),modelRaw,preview,repairs});throw error;}
    const parsed=parseRoleplay(raw,scenario.characters.filter(c=>c.id!=='you').map(c=>c.id));
    if(preview!==raw||!parsed.meta||!parsed.utterances.length)issues.push(`${label}:${test.id}:${test.lang}:${turn}: incomplete output`);
    records.push({label,id:test.id,case:test.name??test.id,lang:test.lang,turn,learner,meta:parsed.meta,npc:parsed.utterances,repairs,ms:Date.now()-start});
    parsed.utterances.forEach((u,i)=>messages.push({id:'n'+turn+'-'+i,role:'npc',characterId:u.characterId,text:u.text,ts:turn*2+1,...(i===parsed.utterances.length-1&&parsed.meta?{meta:parsed.meta}:{})}));
    console.log(`${label} ${test.id} ${test.lang} turn ${turn} ${Date.now()-start}ms`);
   }
  }));
  for(const result of results)if(result.status==='rejected')issues.push(String(result.reason));
 }
 await writeFile(resolve(root,'replay.json'),JSON.stringify({at:new Date().toISOString(),model:FAST_MODEL,samples:records.length,issues,records},null,2)+'\n');
 console.log(JSON.stringify({samples:records.length,issues}));if(issues.length)process.exitCode=1;
}
void main();

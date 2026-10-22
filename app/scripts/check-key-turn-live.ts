/** Bounded, fictional model probes. Requires explicit live-model authorization. */
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {SCENARIOS} from '../src/data/corpus';
import {buildSession} from '../src/lib/session-utils';
import {roleplayModel,runRoleplay} from '../src/lib/tasks/roleplay';
import {runAssess} from '../src/lib/tasks/assess';
import {parseRoleplay} from '../src/lib/client-api';
import {taskLLM} from '../src/lib/task-runtime';
import {serverLLM,FAST_MODEL,SMART_MODEL,hasServerCredential} from '../src/lib/llm';
import type {ChatMessage} from '../src/lib/types';

const cases=[
 {id:'offer-zh',lang:'zh' as const,lines:['我可以先看一页，帮你列出需要修改的点，不直接改稿。你最想先看哪页？']},
 {id:'refusal-zh',lang:'zh' as const,lines:['我自己的报告16:30截止，今天不能帮你改这六页。你可以先问问别人。']},
 {id:'question-zh',lang:'zh' as const,lines:['你说的改一下，是改格式还是内容？老板原话怎么说的？']},
 {id:'joke-zh',lang:'zh' as const,lines:['五分钟改六页，我这键盘怕是要冒烟。先说说最要紧的是哪一页？']},
 {id:'repair-zh',lang:'zh' as const,lines:['行，我先帮你改吧。','我刚才答应得太快了，我16:30要交自己的报告。我只能帮你看一页、列出问题，不负责改稿，也没有答应之后继续。','不改稿，只列一页的问题。剩下的还是你自己负责，这样的帮忙你需要吗？']},
 {id:'continue-en',lang:'en' as const,lines:[
  'I have my own report due at 4:30. What exactly needs changing, and what did your boss say?',
  'I can look at the third page and list questions. I cannot rewrite it or take on the other pages.',
  'I am offering a review, not agreeing to edit anything after 4:30. Does that limited help work for you?',
  'If you need all six pages rewritten, you will need another person. I can still list questions for one page if that helps.',
 ]},
];
async function main(){
 assert(hasServerCredential()&&process.env.KEY_TURN_LIVE_DIR,'Configure a model and fresh KEY_TURN_LIVE_DIR');
 const out=resolve(process.env.KEY_TURN_LIVE_DIR!);await mkdir(out,{recursive:false});
 const scenario=SCENARIOS.find(s=>s.id==='office-quick-favor')!;
 const retry=process.env.KEY_TURN_REVIEW_SOURCE?JSON.parse(await readFile(process.env.KEY_TURN_REVIEW_SOURCE,'utf8')) as {id:string;messages:ChatMessage[]}:undefined;
 for(const c of cases.filter(c=>(!retry||retry.id===c.id)&&(!process.env.KEY_TURN_CASE||process.env.KEY_TURN_CASE.split(',').includes(c.id)))){
  const session=buildSession(scenario,'arena',c.lang),calls:unknown[]=[],messages:ChatMessage[]=retry?.messages??[{id:'opening',role:'npc',characterId:'tang',text:scenario.opening.text[c.lang],ts:1}];
  const start=Date.now();let report:unknown,error:unknown;
  try{
   for(const [i,line] of (retry?[]:c.lines).entries()){
    messages.push({id:`learner-${i}`,role:'learner',text:line,ts:Date.now()});
    const input={practiceMode:'key-turn' as const,scenario,learnerCharacterId:session.learnerCharacterId,messages,lang:c.lang};
    const raw=await runRoleplay(input,taskLLM(serverLLM,'roleplay',undefined,e=>calls.push(e),c.lang),roleplayModel(input,FAST_MODEL,SMART_MODEL));
    const result=parseRoleplay(raw,['tang']);assert(!result.error&&result.utterances.length,'complete valid NPC response');
    messages.push(...result.utterances.map((u,j)=>({id:`npc-${i}-${j}`,role:'npc' as const,characterId:u.characterId,text:u.text,ts:Date.now(),meta:result.meta??undefined})));
   }
   if(['repair-zh','continue-en'].includes(c.id))report=await runAssess({practiceMode:'key-turn',scenario,learnerCharacterId:session.learnerCharacterId,messages,lang:c.lang,goals:['communication']},taskLLM(serverLLM,'assess',undefined,e=>calls.push(e),c.lang),SMART_MODEL);
  }catch(e){error={name:(e as Error).name,message:(e as Error).message};process.exitCode=1;}
  await writeFile(resolve(out,c.id+'.json'),JSON.stringify({id:c.id,lang:c.lang,reviewOnly:!!retry,models:{roleplay:SMART_MODEL,smart:SMART_MODEL,configuredFast:FAST_MODEL},durationMs:Date.now()-start,calls,messages,report,error},null,2)+'\n');
  console.log(JSON.stringify({id:c.id,ok:!error,exchanges:messages.filter(m=>m.role==='learner').length,calls:calls.length,durationMs:Date.now()-start,error}));
 }
}
void main();

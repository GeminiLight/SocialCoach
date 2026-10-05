/** Opt-in, bounded synthetic before/after replay. No private archives are read.
 * node --env-file=.env.local --import tsx scripts/check-npc-craft-live.ts baseline|candidate|final
 * Original fictional fixtures: wiki/specs/spec-npc-craft.md. */
import {mkdir,writeFile} from 'node:fs/promises';
import {serverLLM,FAST_MODEL,hasServerCredential} from '../src/lib/llm';
import {taskLLM} from '../src/lib/task-runtime';
import type {LLM} from '../src/lib/llm-core';
import {runDinner,parseDinnerInput} from '../src/features/dinner/lib/director';
import {scenarios,type Lang} from '../src/features/dinner/lib/content';
import {opening,type Message} from '../src/features/dinner/lib/engine';
import {variants,type VariantId} from '../src/features/dinner/lib/story';
import {runRoleplay} from '../src/lib/tasks/roleplay';
import {SCENARIOS} from '../src/data/corpus';
import {parseRoleplay} from '../src/lib/client-api';
import type {ChatMessage} from '../src/lib/types';

type Fixture={id:string;variant:VariantId;target:string;lang:Lang;prior?:[string,string,string];text:string;expected:string};
const fixtures:Fixture[]=[
 {id:'chen-joke',variant:'work-toast',target:'chen',lang:'zh',text:'陈总，我开车来的，茶也能把谢意敬到位，酒留给车钥匙吧。',expected:'Notice the joke without agreeing to alcohol; protect face in Chen’s own voice, no random new facts.'},
 {id:'aunt-refusal',variant:'family-introduction',target:'aunt',lang:'zh',prior:['大姨，我不相亲，也不看照片。','aunt','行，今天不看了。我还得给介绍的人一个说法。'],text:'大姨，您就说我不接受介绍，别说我只是最近忙。这话您愿意原样转达吗？',expected:'Keep the refusal, respond to the reporting wording; no renewed photo pressure or blanket approval.'},
 {id:'mom-repair',variant:'family-privacy',target:'mom',lang:'zh',prior:['妈，你这样让我很生气！','mom','你这么凶，我还不是怕你不跟家里说话。'],text:'妈，刚才语气重了，对不起。工作消息以后先问我再转发，可以吗？',expected:'Respond as a hurt mother, repair tone gradually; apology is not permission or an instant emotional reset.'},
 {id:'dad-voice',variant:'family-introduction',target:'dad',lang:'zh',text:'爸，我不相亲，但也不想一桌人吵起来。你想怎么处理？',expected:'A brief personal position from Dad, not a therapist or an automatic ruling for all relatives.'},
 {id:'kai-uncertainty',variant:'school-credit',target:'kai',lang:'zh',text:'阿凯，咱俩的代码部分写清楚就行，你真核对过提交记录吗？',expected:'Sound like a cautious teammate, keep unchecked records unknown and no invented percentages.'},
 {id:'ning-floor',variant:'office-interruption',target:'ning',lang:'zh',prior:['宁姐，先让我讲一分钟，再判断。','ning','好，一分钟。别再绕背景。'],text:'宁姐，我要提的风险是工单权限没确认，先查访问，再试两名客服。您担心哪一部分？',expected:'Do not restart the interruption; engage the concrete risk with Ning’s brisk voice, retain access uncertainty.'},
 {id:'fang-privacy-en',variant:'elevator-privacy',target:'fang',lang:'en',prior:['I’m not discussing HR here. Work planning is a separate question.','fang','Then tell me what work information you can actually share.'],text:'Fang, I can discuss my current work, but that does not confirm I am leaving. What needs planning?',expected:'Do not treat refusal as resignation or invent staffing deadlines; engage the planning concern.'},
 {id:'yue-own-limit-en',variant:'school-workload',target:'yue',lang:'en',text:'Yue, I am not taking all three jobs. Which part would you personally consider?',expected:'A teammate’s own conditional offer or limit, without inventing availability or accepting for the team.'},
];

async function main(){
 const stage=process.argv[2];if(!['baseline','candidate','final'].includes(stage))throw Error('Choose baseline, candidate or final explicitly');
 if(!hasServerCredential())throw Error('No configured provider');
 const results:unknown[]=[];let next=0,failures=0;
 async function worker(){for(;;){const index=next++;if(index>=fixtures.length+2)return;
  let calls=0,inputBytes=0,lastText='',visible='';let lastStream:ReturnType<LLM['chatStream']>|undefined;const start=performance.now();
  const measured:LLM={chatText:async o=>{calls++;inputBytes+=new TextEncoder().encode(JSON.stringify({system:o.system,messages:o.messages})).length;lastText=await serverLLM.chatText(o);return lastText;},chatStream:o=>{calls++;inputBytes+=new TextEncoder().encode(JSON.stringify({system:o.system,messages:o.messages})).length;lastStream=serverLLM.chatStream(o);return lastStream;}};
  try{if(index<fixtures.length){
   const fixture=fixtures[index],variant=variants.find(v=>v.id===fixture.variant)!,scene=scenarios.find(s=>s.id===variant.scene)!;
   const history:Message[]=[opening(scene,fixture.lang,variant.id)];
   if(fixture.prior){const [text,speakerId,reply]=fixture.prior;history.push({role:'user',text},{role:'npc',speakerId,text:reply,reactions:scene.characters.map(c=>({characterId:c.id,emotion:c.id===speakerId?'annoyed':'neutral',gesture:'idle'}))});}
   const input=parseDinnerInput({scenarioId:scene.id,variantId:variant.id,briefVersion:1,targetId:fixture.target,lang:fixture.lang,maxTurns:12,text:fixture.text,history});
   const output=await runDinner(input,taskLLM(measured,'dinner',AbortSignal.timeout(35000),undefined,fixture.lang),FAST_MODEL);
   results.push({id:fixture.id,kind:'3d',expected:fixture.expected,input,output,calls,inputBytes,durationMs:Math.round(performance.now()-start)});
  }else{
   const lang:Lang=index===fixtures.length?'zh':'en',scenario=SCENARIOS.find(s=>s.id==='declining-extra-hours')!,learnerCharacterId=scenario.characters.find(c=>c.playable)!.id;
   const messages:ChatMessage[]=[{id:'opening',role:'npc',characterId:scenario.opening.characterId,text:scenario.opening.text[lang],ts:1},{id:'player',role:'learner',text:lang==='zh'?'今晚是父亲生日，我不能留下。不是不管项目，我可以明早先看问题。':'It’s my father’s birthday tonight. I cannot stay. I can discuss checking the problem tomorrow morning; that is not a promise to finish it.',ts:2}];
   const input={scenario,learnerCharacterId,messages,lang};
   const raw=await runRoleplay(input,taskLLM(measured,'roleplay',AbortSignal.timeout(35000),undefined,lang),FAST_MODEL,d=>{visible+=d;});
   const output=parseRoleplay(raw,scenario.characters.filter(c=>c.id!==learnerCharacterId).map(c=>c.id));
   if(output.error||!output.utterances.length)throw Error('Invalid text reply');
   results.push({id:`text-boundary-${lang}`,kind:'text',expected:'A boss’s own concern, no instant agreement, no invented task or accepted morning time, conversational phrasing.',input,output,calls,inputBytes,durationMs:Math.round(performance.now()-start)});
  }}catch(error){failures++;results.push({id:index<fixtures.length?fixtures[index].id:`text-boundary-${index===fixtures.length?'zh':'en'}`,error:error instanceof Error?error.message:String(error),modelRaw:lastStream?.text()??lastText,visible,calls,inputBytes,durationMs:Math.round(performance.now()-start)});}
 }}
 await Promise.all([worker(),worker()]);
 results.sort((a,b)=>String((a as {id:string}).id).localeCompare(String((b as {id:string}).id)));
 const dir='../docs/reviews/npc-craft-2026-10-06';await mkdir(dir,{recursive:true});
 await writeFile(`${dir}/${stage}.json`,JSON.stringify({stage,model:FAST_MODEL,fixtures:fixtures.length+2,failures,results},null,2)+'\n');
 console.log(JSON.stringify({stage,fixtures:fixtures.length+2,failures,calls:results.reduce<number>((n,r)=>n+(r as {calls:number}).calls,0),out:`${dir}/${stage}.json`}));
 if(failures)process.exitCode=1;
}
main().catch(error=>{console.error(error instanceof Error?error.message:String(error));process.exitCode=1;});

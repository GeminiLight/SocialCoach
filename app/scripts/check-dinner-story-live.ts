/** Opt-in, synthetic dialogue only. Run with --env-file=.env.local --import tsx. */
import type { LLM } from '../src/lib/llm-core';
import { writeFile } from 'node:fs/promises';
import { FAST_MODEL, serverLLM, hasServerCredential } from '../src/lib/llm';
import { runDinner } from '../src/features/dinner/lib/director';
import { scenarios } from '../src/features/dinner/lib/content';
import { opening, type Message } from '../src/features/dinner/lib/engine';
import { variantFor } from '../src/features/dinner/lib/story';
import { createDrama, syncDrama, settleForSpeech, dinnerContext } from '../src/features/dinner/lib/drama';
import { createWorld, roomContext } from '../src/features/dinner/lib/room';

let lastRaw='';
const trackedLLM:LLM={chatText:async o=>{lastRaw=await serverLLM.chatText(o);return lastRaw;},chatStream:o=>serverLLM.chatStream(o)};
const fixtures={
 work:[
  '陈总，我今晚开车，不喝酒。我可以用茶感谢林姐。',
  '林姐，谢谢您这次续约。关于周三上线，您现在最需要确认哪一项？',
  '林姐，我先确认一下：新增报表不在原范围，两项测试也还没过，对吗？',
  '小周，请你说明测试现在的情况。不确定的就说不确定，不用替我保证。',
  '陈总，我不能保证周三全量上线。我提议原范围先验收，报表另排。',
  '林姐，如果原功能通过验收，报表下一版再做，您能接受吗？',
  '小周，明早十点前，你能给出测试结果和还没解决的问题吗？',
  '陈总，测试没过就不算具备上线条件。这个风险由谁向客户说明？',
  '林姐，我担心您把明早确认听成明早保证成功，我刚才没有承诺测试一定过。',
  '陈总，刚才语气有点急，抱歉。但不能保证的部分，我还是不能答应。',
  '林姐，请您说一下目前哪些谈定了，哪些还没有。',
  '陈总，今天先到这里。明早拿结果再确认日期，今晚不把周三写成无条件保证。',
 ],
 family:[
  '大姨，我理解您关心我，但这次我不考虑相亲。',
  '妈妈，我不看照片也不加联系方式，这不是只拒绝明天见面。',
  '爸爸，你刚才听到我答应任何见面了吗？',
  '大姨，请跟介绍人说我没有这个打算，不要说我只是最近忙。',
  '妈妈，您最担心的是什么？可以说，但别把担心变成替我答应。',
  '妈妈，我愿意告诉您我最近过得怎样，但暂时不谈婚恋安排。',
  '大姨，关于刚才那件事，您准备怎么回复介绍人？',
  '爸爸，如果饭后又有人拿照片来，我想请您提醒一句刚才已经说过不考虑。',
  '妈妈，我刚才说可以聊近况，不是同意您把内容转给亲戚。',
  '妈妈，我会主动分享愿意说的事，转述之前请再问我一次。',
  '大姨，我们能不能把今天谈好的边界说清楚，不再换一种说法来约见面？',
  '爸爸，今天先吃饭。不相亲这件事我没有改主意，也不替谁作保证。',
 ],
 school:[
  '许学长，汇报很重要，但代码和设计不能都只叫执行。',
  '小月，你希望怎样写设计贡献？请直接说具体的内容。',
  '阿凯，代码记录能核对哪些贡献？没有查过的数字先不要报。',
  '许学长，我建议写：你负责汇报联络，小月负责设计，我和阿凯负责核心代码。',
  '许学长，您可以保留带队身份，但不要让读者以为代码和设计都是您做的。',
  '小月，发文案之前，你愿意确认自己的那一部分吗？',
  '阿凯，代码部分什么时候能核对完？你只承诺自己能完成的。',
  '许学长，确认之前先不发朋友圈，您愿意等我们一起核对吗？',
  '许学长，我刚才不是要拿掉您的贡献。我担心的是别人看不到代码和设计。',
  '小月，假如还有人不同意文案，我们怎么处理，才不变成别人替你签字？',
  '许学长，请说明现在谁改文案、谁确认、什么时候才能发布。',
  '许学长，我们先按已经明确答应的步骤做。没确认的部分，不当作全队都同意。',
 ],
};

async function main(){
 if(!hasServerCredential())throw Error('No configured provider');
 const selected=process.argv[2];const results:unknown[]=[];
 for(const scene of scenarios.filter(s=>!selected||s.id===selected)){
  const variant=variantFor(scene.id),history:Message[]=[opening(scene,'zh',variant.id)];
  const drama=createDrama(),world=createWorld(scene);syncDrama(drama,scene,0,true,false);
  for(const [i,text] of fixtures[scene.id].entries()){
   const observed=dinnerContext(drama);
   try{
    const result=await runDinner({scenarioId:scene.id,variantId:variant.id,maxTurns:12,lang:'zh',text,history,room:roomContext(world),dinner:observed},trackedLLM,FAST_MODEL,AbortSignal.timeout(30_000));
    history.push({role:'user',text,dinner:observed},{role:'npc',...result,mode:'model'});
    settleForSpeech(drama);syncDrama(drama,scene,i+1,true,false,{requestedEvent:result.story?.event,openingEvent:variant.openingEvent??null});
    console.log(`${scene.id} ${i+1}/12 ${result.speakerId}: ${result.text}`);
   }catch(error){results.push({scene:scene.id,turn:i+1,error:error instanceof Error?error.message:String(error),lastRaw,history});await writeFile(`/tmp/socialcoach-story-live-${selected??'all'}.json`,JSON.stringify(results,null,2));throw error;}
  }
  results.push({scene:scene.id,history});
 }
 await writeFile(`/tmp/socialcoach-story-live-${selected??'all'}.json`,JSON.stringify(results,null,2));
 console.log('Synthetic long-dialogue validation completed. Read the transcript for semantic judgment.');
}
main().catch(e=>{console.error(e instanceof Error?e.message:e);process.exitCode=1;});

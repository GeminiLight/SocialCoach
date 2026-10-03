/** Explicit synthetic QA. No real personal or workplace information is sent. */
import {writeFile} from 'node:fs/promises';
import {FAST_MODEL,serverLLM,hasServerCredential} from '../src/lib/llm';
import {runDinner} from '../src/features/dinner/lib/director';
import {opening,type Message} from '../src/features/dinner/lib/engine';
import {scenarios} from '../src/features/dinner/lib/content';
import {variants,type VariantId} from '../src/features/dinner/lib/story';
import {createWorld,roomContext} from '../src/features/dinner/lib/room';
import {createDrama,syncDrama,settleForSpeech,dinnerContext} from '../src/features/dinner/lib/drama';

const cases:Partial<Record<VariantId,{zh:string[];en:string[]}>>={
 'elevator-privacy':{zh:[
  '方经理，谈话内容我不在走廊分享，离职是您的猜测，不是我确认的事。',
  '方经理，您需要确认的是工作安排，还是谈话细节？',
  '乔宁，你听过我跟 HR 的谈话吗？没听过就不要替我解释。',
  '程悦，你刚才听到我确认要离职了吗？',
  '方经理，工作安排如果有变化，我明天十点正式告诉您；不需要猜谈话。',
  '方经理，我只答应明天十点确认工作安排，没有答应分享私下谈话。',
  '方经理，如果您现在向别人转述，会怎样准确说我的意思？',
  '乔宁，部门工作可以继续对接，个人谈话不要传给其他人。',
  '方经理，刚才语气急了，抱歉，但这个信息边界不变。',
  '程悦，我走到旁边也不是私聊，在场的人仍听得见，对吗？',
  '方经理，请说清我实际答应了什么，还有什么没确认。',
  '方经理，今天先到这里。明天十点确认工作安排，不要转成我已经离职。',
 ],en:["Fang, I am not sharing the HR conversation here. Leaving is your guess.","Qiao, did you hear any of my private conversation?","Fang, I will confirm work arrangements tomorrow at ten, not the private details.","Fang, what exactly will you report? I have not said I am leaving."]},
 'elevator-blame':{zh:[
  '方经理，账号打不开是事实，但原因还没有查，不能先写我交接疏漏。',
  '乔宁，你交接了哪些材料？日志和权限是否已经核对？',
  '方经理，您现在有什么证据证明是我没核对？',
  '程悦，你看到的是会议结束，还是看过故障原因？',
  '方经理，我建议报告先写现象和待核对项，不写没有证据的责任归属。',
  '乔宁，你能确认自己经手的材料吗？不要替其他人保证。',
  '方经理，我可以明天十点给初步核对结果，不保证那时一定查明原因。',
  '方经理，初步结果和确认原因是两件事，您准备怎么向上说？',
  '乔宁，如果日志还没拿到，哪些信息只能标未知？',
  '方经理，刚才语气急了，但不是认错。我仍不接受未经核实的归因。',
  '方经理，目前谁答应了哪一步？哪些还只是提议？',
  '方经理，先按确认的现象汇报，明天十点看初步结果，不写我已认错。',
 ],en:["Fang, the account failure is a fact, but my fault is not established.","Qiao, have you checked the logs and permissions?","Fang, I can give preliminary findings tomorrow at ten; I cannot promise a confirmed cause.","Fang, report the symptom and uncertainty. What have I actually agreed to?"]},
 'office-overtime':{zh:[
  '何主管，数据、排版、检查是三件事，不能一句顺手就都算我答应。',
  '何主管，今晚必须发哪些内容，哪些可以下一版再补？',
  '宁姐，您自己的排版需要多少时间？先不要替我答应。',
  '瑞瑞，数据来源是否已核对？没查过就先标未知。',
  '何主管，我只能接最后检查，数据和排版需要本人确认，我不替他们答应。',
  '宁姐，您是否愿意接排版？如果不愿意也请直接说，不用客气。',
  '瑞瑞，您能在什么时间给出已核对与未核对的项目？',
  '何主管，如果六点半之前数据没确认，我不把未核对材料作为最终稿发出。',
  '何主管，我愿意做检查，不等于保证三项全部完成。',
  '宁姐，刚才您说的时间是建议，还是已经确定能做到？',
  '何主管，现在谁已经答应哪项，还有哪些空着？',
  '何主管，今晚按已经确认的范围交付，没确认的内容注明，不把风险省掉。',
 ],en:["He, data, layout and final review are three tasks. I have not accepted all of them.","Rui, which data sources have actually been checked?","Ning, please confirm your own availability. I can take final review only.","He, what is agreed and what remains unassigned? My review is not a promise that all three are done."]},
 'office-interruption':{zh:[
  '宁姐，我还没讲到关键风险，请给我一分钟讲完，再决定用哪份方案。',
  '何主管，我提议先听风险，再选方案。您能给我这段明确的时间吗？',
  '宁姐，我不是否定您的方案，只是还没有把我的关键点讲完。',
  '我担心数据来源还没核对，直接按现在的数字做决定会有问题。',
  '瑞瑞，来源是否已核对？不确定就说不确定，别替我保证。',
  '宁姐，这就是我要补充的风险。您具体不同意哪个部分？',
  '何主管，我建议先标出未经核对的数据，待核对后再决定。',
  '何主管，这是我的建议，不是您已经同意的决定，您现在的立场是什么？',
  '宁姐，我抬手只是请求发言，没有替全组接受您的方案。',
  '瑞瑞，您能确认自己的核对范围和下一次反馈时间吗？',
  '何主管，哪些观点听完了，哪项正式决定了？不要把沉默算同意。',
  '何主管，今天先按已确认的下一步走，没有确认的方案仍然待决定。',
 ],en:["Ning, give me one minute for the key risk before choosing a proposal.","My concern is unchecked data sources. This is the point I had not finished.","Rui, have those sources actually been checked? Do not promise for me.","He, my suggestion is not your decision. What is decided and what remains open?"]},
};
async function main(){
 if(!hasServerCredential())throw Error('No configured provider');
 const results:unknown[]=[];
 for(const v of variants.filter(v=>cases[v.id]&&(!process.argv[2]||v.id===process.argv[2])))for(const lang of ['zh','en'] as const){
  const s=scenarios.find(s=>s.id===v.scene)!,history:Message[]=[opening(s,lang,v.id)],world=createWorld(s),drama=createDrama();syncDrama(drama,s,0,true,false,{openingEvent:v.openingEvent});
  for(const [i,text] of cases[v.id]![lang].entries()){
   const room=roomContext(world),dinner=dinnerContext(drama);const result=await runDinner({scenarioId:s.id,variantId:v.id,maxTurns:12,lang,text,history,room,dinner},serverLLM,FAST_MODEL,AbortSignal.timeout(30_000));
   history.push({role:'user',text,room,dinner},{role:'npc',...result,mode:'model'});settleForSpeech(drama);console.log(`${v.id}/${lang} ${i+1}: ${result.text}`);
  }
  results.push({variant:v.id,lang,history});await writeFile(`/tmp/socialcoach-places-live-${process.argv[2]??'all'}.json`,JSON.stringify(results,null,2));
 }
 console.log('Synthetic responses complete. Review semantic continuity in the saved transcript.');
}
main().catch(e=>{console.error(e instanceof Error?e.message:e);process.exitCode=1;});

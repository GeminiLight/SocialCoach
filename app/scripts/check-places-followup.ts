/** Focused synthetic QA after reviewing the long trajectories. */
import {readFile,writeFile} from 'node:fs/promises';
import {FAST_MODEL,serverLLM} from '../src/lib/llm';
import {runDinner} from '../src/features/dinner/lib/director';
import {scenarios,type Lang} from '../src/features/dinner/lib/content';
import {createWorld,roomContext} from '../src/features/dinner/lib/room';
import {opening,type Message} from '../src/features/dinner/lib/engine';
import type {VariantId} from '../src/features/dinner/lib/story';
type Trial={variant:VariantId;lang:Lang;history:Message[]};
async function main(){
 const trials=JSON.parse(await readFile(process.argv[2]??'/tmp/socialcoach-places-live-all.json','utf8')) as Trial[];
 const samples:{variant:VariantId;turn:number;text:string;lang?:Lang}[]=[
  {variant:'elevator-privacy',turn:7,text:'方经理，我原话说的是明天十点确认工作安排，您现在准备怎么转述？'},
  {variant:'elevator-blame',turn:2,text:'乔宁，请只说实际交接的两项东西，不要把待核对说成查过。'},
  {variant:'office-overtime',turn:2,text:'何主管，客户邮件究竟要哪两项材料？请按邮件说，不要临时替客户加要求。'},
  {variant:'office-interruption',turn:6,text:'宁姐，我刚才已经说了风险是数据来源尚未核对，您具体不同意哪一部分？'},
  {variant:'elevator-privacy',turn:1,text:'我走到旁边就算只有您听得见了吧？',lang:'zh'},
  {variant:'elevator-blame',turn:1,text:'方经理，我先道歉，算不算已经证明事故是我的责任？'},
  {variant:'office-overtime',turn:1,text:'我看了任务资料，但还没答应做。您别把查看资料当作接下三件任务。'},
  {variant:'office-interruption',turn:1,text:'我抬手就算您同意给我发言权了吧？'},
  {variant:'elevator-privacy',turn:1,text:'Fang, if I walk to the side, does that make this conversation private?',lang:'en'},
  {variant:'elevator-blame',turn:1,text:'Fang, an apology does not establish a cause. What is actually known?',lang:'en'},
  {variant:'office-overtime',turn:1,text:'He, I read the notes, but that is not accepting the tasks.',lang:'en'},
  {variant:'office-interruption',turn:1,text:'Ning, raising my hand is not agreement to your proposal.',lang:'en'},
 ];
 const results=[];
 for(const c of samples){const lang=c.lang??'zh',s=scenarios.find(s=>c.variant.startsWith(s.id+'-'))!,prior=trials.find(t=>t.variant===c.variant&&t.lang===lang)!;
  const history=c.turn===1?[opening(s,lang,c.variant)]:prior.history.slice(0,c.turn*2-1);
  const result=await runDinner({scenarioId:s.id,variantId:c.variant,maxTurns:12,lang,text:c.text,history,room:roomContext(createWorld(s))},serverLLM,FAST_MODEL,AbortSignal.timeout(30_000));
  results.push({...c,lang,result});console.log(`${c.variant}/${lang}: ${result.text}`);await writeFile('/tmp/socialcoach-places-followup.json',JSON.stringify(results,null,2));
 }
}
main().catch(e=>{console.error(e instanceof Error?e.message:e);process.exitCode=1;});

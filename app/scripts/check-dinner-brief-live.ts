/** Opt-in synthetic dialogue; uses the same provider as the deployed dinner task. */
import { writeFile } from 'node:fs/promises';
import { FAST_MODEL, serverLLM, hasServerCredential } from '../src/lib/llm';
import { runDinner } from '../src/features/dinner/lib/director';
import { opening, type Message } from '../src/features/dinner/lib/engine';
import { scenarios, type Lang } from '../src/features/dinner/lib/content';

const questions={
 work:{zh:'小周，两项测试如果明早还没通过，我们能怎样汇报？别替别人保证。',en:'Zhou, if both tests still fail tomorrow, what can we report without promising for anyone else?'},
 family:{zh:'妈妈，看照片不等于答应见面。您准备怎样跟大姨说清楚？',en:'Mom, looking at a photo does not mean agreeing to meet. What will you tell Aunt?'},
 school:{zh:'许学长，文案谁来改、谁来核对？没确认的部分不能当作大家都同意。',en:'Xu, who edits and checks the caption? Unconfirmed wording is not everyone’s agreement.'},
 elevator:{zh:'方经理，您没有听过 HR 谈话，凭什么说是在谈离职？',en:'Fang, you heard no HR conversation. Why claim I am leaving?'},office:{zh:'何主管，三项还没分工，您希望先确认哪一项？',en:'He, the three tasks are unassigned. Which should we confirm first?'},
};

async function main(){
 if(!hasServerCredential())throw Error('No configured provider');
 const results=[];
 for(const scene of scenarios.filter(s=>!process.argv[2]||s.id===process.argv[2]))for(const lang of ['zh','en'] as Lang[]){
  const history:Message[]=[opening(scene,lang)];
  const text=questions[scene.id][lang];
  const result=await runDinner({scenarioId:scene.id,lang,text,history},serverLLM,FAST_MODEL,AbortSignal.timeout(30_000));
  const row={scene:scene.id,lang,user:text,reply:result.text,characters:[...result.text].length,words:result.text.trim().split(/\s+/u).length};
  results.push(row);console.log(JSON.stringify(row));
 }
 await writeFile(`/tmp/socialcoach-dinner-brief-live-${process.argv[2]??'all'}.json`,JSON.stringify(results,null,2));
}
main().catch(error=>{console.error(error instanceof Error?error.message:error);process.exitCode=1;});

import {writeFile} from 'node:fs/promises';
import {serverLLM,FAST_MODEL,SMART_MODEL} from '../src/lib/llm';
import {runDinner} from '../src/features/dinner/lib/director';
import {buildDinnerReview} from '../src/features/dinner/lib/review';
import {scenarios} from '../src/features/dinner/lib/content';
import {opening,SaveSchema} from '../src/features/dinner/lib/engine';
import {storyScenario,variantFor} from '../src/features/dinner/lib/story';
import {createWorld,roomContext} from '../src/features/dinner/lib/room';
import {runAssess} from '../src/lib/tasks/assess';
import {buildDebriefInput} from '../src/lib/debrief-chat';
import {runDebriefChat} from '../src/lib/tasks/debrief-chat';

async function main(){
  const cases=[
    {scene:'family',variant:'family-privacy',lang:'zh',text:'妈妈，工作变动还没确定。我会自己跟大姨说，工资不要替我转述。已经发过去的消息，你会怎么补充说明？',question:'我这样说会不会显得太硬？如果走近妈妈，其他人还听得见吗？'},
    {scene:'office',variant:'office-overtime',lang:'en',text:'I can do the final review if the data and layout are ready. I cannot take all three tasks. Could we confirm who owns each part before promising 18:30?',question:'How could I make my boundary sound more natural without agreeing to all three tasks?'},
  ] as const;
  await Promise.all(cases.map(async c=>{
    const scene=storyScenario(scenarios.find(s=>s.id===c.scene)!,variantFor(c.scene,c.variant));
    const first=opening(scene,c.lang,c.variant),room=roomContext(createWorld(scene));
    const reply=await runDinner({scenarioId:c.scene,variantId:c.variant,lang:c.lang,text:c.text,history:[first],room,maxTurns:12},serverLLM,FAST_MODEL,AbortSignal.timeout(35000));
    const save=SaveSchema.parse({version:1,scenarioId:c.scene,variantId:c.variant,lang:c.lang,maxTurns:12,started:true,complete:true,draft:'',messages:[first,{role:'user',text:c.text,targetId:c.scene==='family'?'mom':'he',room},{role:'npc',...reply}]});
    const session=buildDinnerReview(save,crypto.randomUUID());
    const start=performance.now();
    session.report=await runAssess({scenario:session.scenario,learnerCharacterId:'you',messages:session.messages,lang:c.lang,goals:session.scenario.skills,sceneContext:session.sceneContext},serverLLM,SMART_MODEL,undefined,AbortSignal.timeout(150000));
    const reportMs=Math.round(performance.now()-start);
    const assistant=await runDebriefChat(buildDebriefInput(session,c.question,c.lang),serverLLM,FAST_MODEL);
    const result={scene:c.scene,lang:c.lang,reportMs,session,assistant};
    await writeFile(`/tmp/socialcoach-3d-debrief-${c.lang}.json`,JSON.stringify(result,null,2));
    console.log(JSON.stringify({scene:c.scene,lang:c.lang,reportMs,ratings:session.report.ratings?.length,notes:session.report.sceneNotes?.length,verdict:session.report.verdict,assistantEvidence:assistant.evidence}));
  }));
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Live debrief failed');process.exitCode=1;});

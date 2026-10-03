import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {serverLLM,FAST_MODEL} from '../src/lib/llm';
import {runDinner,type DinnerInput} from '../src/features/dinner/lib/director';
import {scenarios} from '../src/features/dinner/lib/content';
import {opening} from '../src/features/dinner/lib/engine';
import {createWorld,roomContext} from '../src/features/dinner/lib/room';
import type {LLM} from '../src/lib/llm-core';

// Optional baseline file: extract the previous director beside its own imports.
async function main(){
  const baseline=process.argv[2]?(await import(pathToFileURL(process.argv[2]).href)).runDinner as typeof runDinner:undefined;
  const records=[];
  const cases=[
    {scene:'work',variant:'work-toast',text:'陈总，我今天开车，不能喝酒。周三交付还需要先确认哪些条件？'},
    {scene:'family',variant:'family-introduction',text:'妈妈，我明确不想相亲。你当着亲戚的面会怎么转达我的决定？'},
    {scene:'office',variant:'office-overtime',text:'何主管，这三项都确认要做吗？数据和排版各由谁确认？'},
  ];
  for(const [i,c] of cases.entries()){
    if(process.argv[4]&&c.scene!==process.argv[4])continue;
    const scene=scenarios.find(s=>s.id===c.scene)!;
    const input={scenarioId:scene.id,variantId:c.variant,lang:'zh',maxTurns:12,text:c.text,history:[opening(scene,'zh',c.variant as DinnerInput['variantId'])],room:roomContext(createWorld(scene))};
    const runs=baseline?(i%2?[['after',runDinner],['before',baseline]]:[['before',baseline],['after',runDinner]]):[['after',runDinner]];
    for(const [name,task] of runs){
      let calls=0,inputChars=0,outputChars=0;
      const tracked:LLM={...serverLLM,chatText:async o=>{calls++;inputChars+=JSON.stringify(o.system).length+JSON.stringify(o.messages).length;const result=await serverLLM.chatText(o);outputChars+=result.length;return result;}};
      const start=performance.now();
      const reply=await (task as typeof runDinner)(input,tracked,FAST_MODEL,AbortSignal.timeout(30_000));
      records.push({version:name,scene:c.scene,ms:Math.round(performance.now()-start),calls,inputChars,outputChars,text:reply.text,cue:reply.cue,interjection:reply.interjection});
      console.log(JSON.stringify(records.at(-1)));
      await writeFile(process.argv[3]??'/tmp/socialcoach-dinner-model-perf.json',JSON.stringify(records,null,2));
    }
  }
  await writeFile(process.argv[3]??'/tmp/socialcoach-dinner-model-perf.json',JSON.stringify(records,null,2));
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Benchmark failed');process.exitCode=1;});

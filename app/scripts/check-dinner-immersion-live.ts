/** Real endpoint, synthetic player input. 30 calls/run; no rate-limit bypass. Review semantics manually. */
import {writeFile} from 'node:fs/promises';
import {scenarios} from '../src/features/dinner/lib/content';
import {opening,type Message,type Reply} from '../src/features/dinner/lib/engine';
import {variantFor,storyScenario} from '../src/features/dinner/lib/story';
import {createWorld,roomContext} from '../src/features/dinner/lib/room';
const cases=[
 {id:'work-toast',scene:'work',lines:['我开车来的，酒肯定不能喝。我用茶敬您。','林姐，您眼下最担心哪个交付问题？','小周，你说清楚还有哪两项测试没过。','陈总，我可以明早拿复测结果来，不能今晚先保证周三一定上线。','如果新增报表也要周三做，旧范围里您愿意往后放哪一项？']},
 {id:'work-deadline',scene:'work',lines:['你替我答应了还来问我？有两个问题没修好，肯定不能直接上。','刚才我语气急了。但上线前得把失败测试处理完，小周你说说影响。','林姐，报表先不上，原来的范围先测完，您接受吗？','我没答应延期到哪天。明天十点先和小周复测，再一起定日期。','陈总，您愿意先跟客户说明这两个风险，还是仍然要我现在保证？']},
 {id:'family-introduction',scene:'family',lines:['大姨，我今天不看照片，也没答应见面。您不用替我定时间。','妈妈，我不想相亲。不代表我不让你关心我。','爸爸，你听见我答应见面了吗？','别把没回答当成同意。我可以饭后和妈妈聊近况，但不聊相亲。','大姨，如果对方问起，您会怎么回复？']},
 {id:'family-privacy',scene:'family',lines:['妈妈，你没问我就把工作变动告诉大姨了？我不想在饭桌上讲工资。','我不是怕你关心，我是说转述之前先问我。','大姨，问细一点当然可以，但我可以选择不回答。','妈妈，已经发出去那条，你能先说明我不想继续被追问吗？','你刚说愿意问我，那以后什么信息能发给谁，我们怎么确认？']},
 {id:'school-credit',scene:'school',lines:['许学长，带队和完成代码不是一件事。文案里要写清我们各自做了什么。','小月，你的设计部分，你希望怎样写？','阿凯，你能核对我和你的代码贡献吗？不用报比例。','许学长，你负责汇报，小月做设计，我和阿凯做代码。先把这句发给我们核对再公开，行吗？','我还没有同意拍照，也没有确认发布。现在大家能先看实际文案吗？']},
 {id:'school-workload',scene:'school',lines:['学长，要不奖杯也给我，我一个人扛三份活总得有点奖赏吧。','说正经的，我能接演示，海报和答辩我不接。','小月，海报你现在有没有时间做？可以拒绝，我不替你答应。','阿凯，你能接演示测试的哪一部分？','许学长，现在只确认了我做演示。没人答应的工作，别就这么算安排好了。']},
] as const;
async function main(){
 const endpoint=process.argv[2]??'http://localhost:3000';
 const label=(process.argv[3]??'live').replace(/[^a-z0-9_-]/gi,'-');
 type Turn={player:string;status:number;ms:number;reply:Reply & {error?:string}};
 const out:{variant:string;turns:Turn[]}[]=[];
 const run=async(c:typeof cases[number])=>{
  const base=scenarios.find(s=>s.id===c.scene)!,scene=storyScenario(base,variantFor(c.scene,c.id));
  const history:Message[]=[opening(scene,'zh',c.id)];const world=createWorld(scene);
  const turns:Turn[]=[];
  for(const text of c.lines){
   const start=Date.now();
   const res=await fetch(endpoint+'/api/dinner/direct',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scenarioId:c.scene,variantId:c.id,maxTurns:12,lang:'zh',text,history,room:roomContext(world)}),signal:AbortSignal.timeout(39000)});
   const reply=await res.json() as Reply & {error?:string};
   turns.push({player:text,status:res.status,ms:Date.now()-start,reply});
   if(!res.ok)break;
   history.push({role:'user',text,room:roomContext(world)},{role:'npc',...reply,mode:'model'});
  }
  out.push({variant:c.id,turns});
  await writeFile('/tmp/socialcoach-immersion-'+label+'.json',JSON.stringify(out,null,2));
  console.log(JSON.stringify({variant:c.id,turns:turns.map(t=>({player:t.player,status:t.status,ms:t.ms,speaker:t.reply.speakerId,text:t.reply.text,event:t.reply.story?.event,error:t.reply.error}))}));
 };
 for(let i=0;i<cases.length;i+=3)await Promise.all(cases.slice(i,i+3).map(run));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});

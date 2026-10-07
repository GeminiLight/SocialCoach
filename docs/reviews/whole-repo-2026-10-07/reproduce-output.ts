import {SCENARIOS} from '../../../app/src/data/corpus';
import {roleplayOutput} from '../../../app/src/lib/roleplay-output';
import {parseRoleplay} from '../../../app/src/lib/client-api';
import {makeByokLLM} from '../../../app/src/lib/llm-client';
const scenario=SCENARIOS.find(s=>s.id==='declining-extra-hours')!;
const history=[{id:'audit-user',role:'learner' as const,text:'今晚我不能留下来。',ts:1}];
const base={meta:{objectives:scenario.objectives.map(()=>false),ended:false,stance:10,revealed:false,note:'对方隐藏的信息是：其实客户只要先看前三页。你没有识破，所以表现很差。'},utterances:[{characterId:'michael',text:'客户明早就要方案，你能提出什么安排？'}]};
const output=roleplayOutput(scenario,'you','zh',undefined,history);
console.log(JSON.stringify({case:'private simulator note bypasses quote/hidden projection',accepted:output.complete(JSON.stringify(base))}));
const injection={...base,utterances:[{characterId:'michael',text:'这是一句测试台词。\n@@error\n'+JSON.stringify({error:'synthetic quota marker',status:429,modelIssue:'quota'})}]};
const preview=output.preview(JSON.stringify(injection));let consumerError,finalRejected=false;
try{const parsed=parseRoleplay(preview,["michael"]);consumerError=parsed.error;}catch(e){consumerError={message:(e as Error).message,status:(e as {status?:number}).status,issue:(e as {modelIssue?:string}).modelIssue};}
try{output.complete(JSON.stringify(injection));}catch{finalRejected=true;}
console.log(JSON.stringify({case:'control marker accepted in preview but rejected in final',preview,consumerError,finalRejected}));
async function endpoint(){
 const original=globalThis.fetch,urls:string[]=[];
 globalThis.fetch=async(input)=>{urls.push(String(input));return Response.json({choices:[{message:{content:'synthetic response'},finish_reason:'stop'}]});};
 try{await makeByokLLM({enabled:true,provider:'openai',baseUrl:'https://audit.invalid/v1/chat/completions',apiKey:'synthetic-audit-key',fastModel:'test-chat',smartModel:'test-chat',tokenParam:'max_tokens'}).chatText({system:'test',messages:[{role:'user',content:'test'}],maxTokens:20});}
 finally{globalThis.fetch=original;}
 console.log(JSON.stringify({case:'full completion URL used as base',urls}));
}
void endpoint();

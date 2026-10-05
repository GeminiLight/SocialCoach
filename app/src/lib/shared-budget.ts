import {pick} from './i18n';
import {LLMError,systemParts,type ChatOpts} from './llm-core';

/** Only anonymous counters live in the budget service. No prompt, identity,
 * transcript, model credential or archive is sent. Lua is atomic across hosts. */
export const RESERVE_SCRIPT=`
local now=tonumber(redis.call('TIME')[1])
local day=math.floor(now/86400)
local counter=KEYS[1]..':day:'..day
local active=KEYS[1]..':active'
redis.call('ZREMRANGEBYSCORE',active,'-inf',now)
local used=tonumber(redis.call('GET',counter) or '0')
local capkey=counter..':cap'
local cap=math.min(tonumber(redis.call('GET',capkey) or ARGV[2]),tonumber(ARGV[2]))
redis.call('SET',capkey,cap)
redis.call('EXPIREAT',capkey,(day+2)*86400)
if used+tonumber(ARGV[1])>cap then return 0 end
if redis.call('ZCARD',active)>=tonumber(ARGV[3]) then return -1 end
redis.call('INCRBY',counter,ARGV[1])
redis.call('EXPIREAT',counter,(day+2)*86400)
redis.call('ZADD',active,now+180,ARGV[4])
return 1`;
export function sharedBudgetConfigured(env:NodeJS.ProcessEnv=process.env){return !!env.LLM_BUDGET_REDIS_URL&&!!env.LLM_BUDGET_REDIS_TOKEN;}
export function requiresBudgetSetup(env:NodeJS.ProcessEnv=process.env){return env.NODE_ENV==='production'&&!sharedBudgetConfigured(env);}
const positive=(value:string|undefined,fallback:number)=>{const n=Number(value);return Number.isSafeInteger(n)&&n>0?n:fallback;};
export function reservedTokens(o:ChatOpts){
 // UTF-8 bytes conservatively bound prompt tokens; allow message framing and
 // reserve all three SDK attempts. This is a token ceiling, not a price quote.
 const bytes=new TextEncoder().encode([...systemParts(o.system).map(p=>p.text),...o.messages.map(m=>m.content)].join('\n')).length;
 return 3*(bytes+4096+o.maxTokens);
}
export async function reserveSharedBudget(o:ChatOpts):Promise<()=>Promise<void>>{
 const lang=o.lang??"zh";
 if(!sharedBudgetConfigured()){
  if(requiresBudgetSetup())throw new LLMError(pick({zh:'共享模型预算尚未配置，请接入自己的模型继续。',en:'Connect your own model to continue. The shared model budget is not configured.'},lang),503,false,'setup');
  return async()=>{};
 }
 const url=process.env.LLM_BUDGET_REDIS_URL!,token=process.env.LLM_BUDGET_REDIS_TOKEN!;
 const id=crypto.randomUUID(),key='socialcoach:{model-budget}';
 const command=async(args:(string|number)[],signal?:AbortSignal)=>{
  const timeout=AbortSignal.timeout(5000),combined=signal?AbortSignal.any([signal,timeout]):timeout;
  const response=await fetch(url,{method:'POST',headers:{authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(args),signal:combined,cache:'no-store'});
  if(!response.ok)throw new Error('Budget service unavailable');
  const value=await response.json() as {result?:unknown;error?:unknown};
  if(value.error)throw new Error('Budget command failed');return value.result;
 };
 let result:unknown;
 try{result=await command(['EVAL',RESERVE_SCRIPT,1,key,reservedTokens(o),positive(process.env.LLM_BUDGET_DAILY_TOKENS,2000000),positive(process.env.LLM_BUDGET_CONCURRENCY,8),id],o.signal);}
 catch(error){if(o.signal?.aborted)throw error;throw new LLMError(pick({zh:'共享模型预算暂时无法核对。请稍后重试，或接入自己的模型。',en:'The shared model budget could not be checked. Use your own model or retry later.'},lang),503,false,'service');}
 if(result===0)throw new LLMError(pick({zh:'今天的共享模型额度已用完，请接入自己的模型继续。',en:'The shared model token budget is used up. Connect your own model to continue.'},lang),429,false,'quota');
 if(result===-1)throw new LLMError(pick({zh:'共享模型正在忙，请稍后重试，或接入自己的模型。',en:'The shared model is busy. Retry shortly or connect your own model.'},lang),429,false,'rate_limit');
 if(result!==1)throw new LLMError(pick({zh:'共享模型预算暂时无法核对，请稍后重试。',en:'The shared model budget could not be checked.'},lang),503,false,'service');
 return async()=>{try{await command(['ZREM',key+':active',id]);}catch{/* Reservation expires after the task deadline; tokens are never refunded. */}};
}

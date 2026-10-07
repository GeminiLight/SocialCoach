import {pick} from './i18n';
import {LLMError,systemParts,type ChatOpts} from './llm-core';
import type {ModelCheck} from './model-status';
export const DEFAULT_SHARED_DAILY_TOKENS=100000000;

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
local policykey=KEYS[1]..':daily-limit'
redis.call('SET',policykey,ARGV[2],'NX')
local cap=tonumber(redis.call('GET',policykey))
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
const READ_BUDGET_SCRIPT=`
local now=tonumber(redis.call('TIME')[1])
local day=math.floor(now/86400)
local counter=KEYS[1]..':day:'..day
local cap=tonumber(redis.call('GET',KEYS[1]..':daily-limit') or ARGV[1])
return {tonumber(redis.call('GET',counter) or '0'),cap,redis.call('ZCOUNT',KEYS[1]..':active','('..now,'+inf'),(day+1)*86400,now}`;
async function budgetCommand(args:(string|number)[],signal?:AbortSignal){
 const timeout=AbortSignal.timeout(5000),combined=signal?AbortSignal.any([signal,timeout]):timeout;
 const response=await fetch(process.env.LLM_BUDGET_REDIS_URL!,{method:'POST',headers:{authorization:`Bearer ${process.env.LLM_BUDGET_REDIS_TOKEN!}`,'Content-Type':'application/json'},body:JSON.stringify(args),signal:combined,cache:'no-store'});
 if(!response.ok)throw new Error('Budget service unavailable');
 const value=await response.json() as {result?:unknown;error?:unknown};
 if(value.error)throw new Error('Budget command failed');return value.result;
}
/** Free read of the pool, not a completion probe or reservation. Availability
 * means some request can fit; the exact task context is checked on reservation. */
export async function sharedBudgetHealth():Promise<ModelCheck|undefined>{
 if(!sharedBudgetConfigured())return undefined;
 try{
  const result=await budgetCommand(['EVAL',READ_BUDGET_SCRIPT,1,'socialcoach:{model-budget}',positive(process.env.LLM_BUDGET_DAILY_TOKENS,DEFAULT_SHARED_DAILY_TOKENS)]);
  if(!Array.isArray(result)||result.length!==5||!result.every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0))throw new Error('Invalid budget snapshot');
  const [used,cap,active,reset]=result as number[],budgetRemaining=Math.max(0,cap-used),resetAt=reset*1000;
  const snapshot={resetAt,budgetRemaining,budgetLimit:cap};
  // Every permitted request has at least one output token and this framing.
  if(budgetRemaining<3*(4096+1))return {state:'unavailable',issue:'shared_quota',...snapshot};
  if(active>=positive(process.env.LLM_BUDGET_CONCURRENCY,8))return {state:'unavailable',issue:'shared_busy',...snapshot};
  return {state:'available',...snapshot};
 }catch{return {state:'unavailable',issue:'service'};}
}
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
 const id=crypto.randomUUID(),key='socialcoach:{model-budget}';
 let result:unknown;
 try{result=await budgetCommand(['EVAL',RESERVE_SCRIPT,1,key,reservedTokens(o),positive(process.env.LLM_BUDGET_DAILY_TOKENS,DEFAULT_SHARED_DAILY_TOKENS),positive(process.env.LLM_BUDGET_CONCURRENCY,8),id],o.signal);}
 catch(error){if(o.signal?.aborted)throw error;throw new LLMError(pick({zh:'共享模型预算暂时无法核对。请稍后重试，或接入自己的模型。',en:'The shared model budget could not be checked. Use your own model or retry later.'},lang),503,false,'service');}
 if(result===0)throw Object.assign(new LLMError(pick({zh:'今天的共享池余量不足以处理这次任务，请在日额度更新后重试，或接入自己的模型。',en:'This task exceeds the remaining shared daily budget. Retry after renewal or connect your own model.'},lang),429,false,'shared_quota'),{retryAt:(Math.floor(Date.now()/86400000)+1)*86400000});
 if(result===-1)throw new LLMError(pick({zh:'共享模型正在忙，请稍后重试，或接入自己的模型。',en:'The shared model is busy. Retry shortly or connect your own model.'},lang),429,false,'shared_busy');
 if(result!==1)throw new LLMError(pick({zh:'共享模型预算暂时无法核对，请稍后重试。',en:'The shared model budget could not be checked.'},lang),503,false,'service');
 return async()=>{try{await budgetCommand(['ZREM',key+':active',id]);}catch{/* Reservation expires after the task deadline; tokens are never refunded. */}};
}

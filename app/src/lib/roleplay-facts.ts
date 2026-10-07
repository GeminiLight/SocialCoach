import type { ChatMessage } from './types';

type Speech = { characterId:string; text:string };
export type SpeechGuard = (utterances:Speech[]) => string|undefined;

const afterReport = /(?:报告.{0,8}(?:交完|提交)(?:之后|以后|后)|(?:交完|提交).{0,8}报告(?:之后|以后|后)|交完(?:之后|以后|后)|报告(?:之后|后)|16:30(?:之后|后)|(?:after|once)[^.!?\n]{0,35}(?:report|16:30|4:30))/i;

/** Narrow evidence guard for a reproduced mistake, not a general consent classifier.
 * Source: office-quick-favor.simulationFacts and the scene-craft replay. */
export function roleplaySpeechGuard(scenarioId:string,messages:ChatMessage[]):SpeechGuard|undefined {
 if(scenarioId==='declining-extra-hours'){
  const known=messages.filter(m=>m.role==='learner').map(m=>m.text.toLowerCase());
  return utterances=>{
   for(const {text} of utterances){
    // Check the factual part before a following question ("who covers it?").
    // Manager preferences remain distinct from an established client demand.
    for(const part of text.match(/[^，,。！？.!?\n;；]+[，,。！？.!?;；]?/gu)??[]){
     if(/[？?]\s*$/u.test(part)||/(?:如果|假如|要是|若|不是|不代表|并非|没(?:有)?要求|不能说)|\b(?:if|whether|not|(?:does|did|is|are|has|have)n['’]t)\b/iu.test(part))continue;
     const clientDemand=/(?:客户.{0,40}(?:点名|要求|指定|要|必须)|\bclient\b.{0,70}\b(?:asked|requests?|requested|demands?|demanded|requires?|required|wants?|wanted|needs?|needed|told|insists?|insisted)\b)/iu.test(part);
     const full=/(?:整份|整套|全套|所有|全部|整个)|\b(?:full|entire|whole|all)\b/iu.test(part);
     const rewrite=/(?:重做|重写|从头.{0,5}(?:做|改)|重新.{0,5}(?:做|写|改))|\b(?:redo|redone|rewrite|rewritten|rebuild|overhaul)\b/iu.test(part);
     const fact=part.trim().replace(/[，,。！？.!?;；]$/u,'').toLowerCase();
     if(clientDemand&&full&&rewrite&&!known.some(line=>line.includes(fact)))return 'The opening establishes a section-three redo and a client review at nine tomorrow. It does not establish a client demand to redo the entire deck. Keep the manager’s own broader preferences separate; do not attribute an invented scope to the client or reveal private facts early.';
    }
    for(const clause of text.match(/[^。！？.!?\n;；]+[。！？.!?]?/gu)??[]){
    // Questions and conditional handoff proposals keep availability unknown.
    if(/[？?]\s*$/u.test(clause)||/(?:如果|要是|假如|若|要不|建议|提议|不如|先问|先确认|需要确认)|\b(?:if|whether|ask|check|could|might|propose)\b/iu.test(clause))continue;
    const fact=clause.trim().replace(/[。！？.!?]$/u,'').toLowerCase();
    const established=known.some(line=>line.includes(fact));
    if(!established&&(/\bthird (?:night|day) (?:running|in a row)\b|连续三(?:天|晚)|第三(?:天|晚)/iu.test(clause)||/(?:剩下|其余|其他).{0,25}(?:下周|下个周)|\b(?:remaining|rest|other)\b.{0,35}\bnext week\b/iu.test(clause)))return 'The scenario records the third overtime request this month, not consecutive late deliveries. The remaining review date is unknown. Do not invent either timeline; keep proposals conditional.';
    if(!/\bLily\b/iu.test(clause))continue;
    const claimed=/Lily.{0,35}(?:今天|今晚|明早|明天|加班|有空).{0,30}(?:加班|有空|能(?:看|做|接)|可以(?:看|做|接)|负责)/iu.test(clause)||/\bLily\s+(?:is\s+(?:not\s+)?(?:working|available)|will\s+(?:work|take|handle|review)|can\s+(?:take|handle|review)|has\s+(?:agreed|time))\b/iu.test(clause);
    if(claimed&&!established)return "Lily's availability and work schedule have not been confirmed. Ask or propose a conditional handoff; do not invent her hours, agreement or ability to take the remaining work.";
    }
   }
  };
 }
 if(scenarioId!=='office-quick-favor')return undefined;
 let offered=false,beforeOffered=false;
 for(const m of messages){
  if(m.role!=='learner')continue; // NPC suggestions never establish the player's availability.
  const text=m.text;
  if(/(?:撤回|收回|取消|不再帮|反悔|withdraw|cancel)/i.test(text)&&/帮|讨论|看|help|review|discuss/i.test(text)){offered=false;beforeOffered=false;continue;}
  const before=/我(?:可以|能|愿意|会)?(?:在)?16:30(?:前|之前)(?:可以|能|愿意|会)?(?:帮|看|聊|讨论|列)|16:30(?:前|之前)我(?:可以|能|愿意|会)?(?:帮|看|聊|讨论|列)/.test(text);
  if(before)beforeOffered=!/如果|要是|假如|只要|不保证|有空(?:的话|再|才)|你说|你以为|你认为|[？?]/.test(text);
  if(!afterReport.test(text))continue;
  if(/如果|要是|假如|只要|前提|不保证|看情况|有空(?:的话|再|才)|\bif\b|provided|subject to|might|\bmay\b|\bcould\b/i.test(text)){offered=false;continue;}
  if(/(?:你说|你以为|你认为|是不是)[^。！？\n]{0,35}(?:我|I)|(?:交完|报告后|16:30后)[^。！？\n]{0,25}[？?]/i.test(text)){offered=false;continue;}
  const denied=/(?:不|没|未|别)[^，,。.!?！？\n]{0,12}(?:交完|报告后|16:30后|之后)|(?:交完(?:之后|后)|报告后|16:30后)[^，,。.!?！？\n]{0,12}(?:不帮|不看|不能|不会|不愿|没答应)|(?:not (?:agreeing|promising|available)|I (?:won't|will not|can't|cannot))[^.!?\n]{0,55}(?:after|report)/i.test(text);
  if(denied){offered=false;continue;}
  if(/(?:我(?:能|可以|愿意|会)|我[^，,。.!?！？\n]{0,20}(?:帮|讨论|看一页|列问题)|\bI (?:can|will|could|am available))/i.test(text))offered=true;
 }
 if(offered&&beforeOffered)return undefined;
 return utterances=>{
  for(const {text} of utterances){
   for(const clause of text.split(/[。！？.!?\n]/u)){
   const beforeClaim=/你(?:可以|会|能|在)?16:30(?:前|之前)(?:只|最多|先|会|可以|能)?(?:帮|看|聊|讨论|列)/.test(clause)&&/听到|听明白|复述|承诺|答应|约好|说好|定了/.test(text);
   const claim=/(?:你[^。！？\n]{0,65}(?:交完(?:之后|以后|后)|报告(?:之后|后))[^。！？\n]{0,15}(?:帮|聊|看|列|讨论)|交完之后只(?:帮|聊|看|列|讨论)|你[^。！？\n]{0,35}报告[，,、\s]*(?:完了|之后|以后)[^。！？\n]{0,15}(?:帮|聊|看|列|讨论)|(?:after|once)[^.!?\n]{0,35}(?:report|16:30|4:30)[^.!?\n]{0,50}\byou(?:'ll| will| can)?\s+(?:help|look|review|discuss)|\byou(?:'ll| will| can)?[^.!?\n]{0,55}(?:help|look|review|discuss)[^.!?\n]{0,40}(?:after|once)[^.!?\n]{0,25}(?:report|16:30|4:30))/i.test(clause);
   if((!claim||offered)&&(!beforeClaim||beforeOffered))continue;
   // Explicit proposals, questions and denials aren't accepted arrangements.
   if(/要不|提议|建议|能不能|愿意吗|可不可以|如果|假如|你.{0,35}(?:能|可以|愿意).{0,25}吗|could you|can you|would you|what if|I propose|if you/i.test(clause))continue;
   if(/没有答应|没答应|并不等于|不是说|不代表|没有约定|不需要|不必|无需|不用|not agreed|not a promise|haven't agreed|don't have to|do not have to|not required/i.test(clause))continue;
   return 'The learner has not offered this help time. Their own 16:30 deadline is not a help appointment. Keep the help time unknown or explicitly propose it; do not recap it as agreed.';
   }
  }
  return undefined;
 };
}

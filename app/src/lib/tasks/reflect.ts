import type {LLM} from '@/lib/llm-core';
import {runDebriefChat} from './debrief-chat';
import {pick} from '@/lib/i18n';
import {THEORIES,CASES} from '@/data/corpus';
import type {ReflectInput} from './types';

/** No unverified draft is streamed. The submitted answer is primary self-report,
 * not proof of a recurring trait or of an NPC's private emotion. */
export async function runReflect(input:ReflectInput,llm:LLM,model:string,onDelta?:(d:string)=>void,signal?:AbortSignal):Promise<string>{
 const {scenario,lang,answer}=input;
 const learner=input.learnerCharacterId??scenario.characters.find(c=>c.playable)!.id;
 const reply=await runDebriefChat({
  lang,practice:{title:pick(scenario.title,lang),background:pick(scenario.background,lang),roles:scenario.characters.map(c=>({name:pick(c.name,lang),role:pick(c.role,lang),learner:c.id===learner}))},
  transcript:[...(input.messages??[]).filter(m=>m.role==='learner'||m.role==='npc').map(m=>({role:m.role as 'learner'|'npc',name:pick(scenario.characters.find(c=>c.id===(m.role==='learner'?learner:m.characterId))?.name??{zh:'对方',en:'Other person'},lang),text:m.text})),{role:'learner',name:'Learner reflection',text:answer}],
  report:{verdict:'',summary:input.summary??'',nextStep:'',strengths:[],weaknesses:[],alternatives:[],knowledge:{theoryIds:[],caseIds:[]}},history:[],
  question:pick({zh:`请针对我的反思简短回应，用 2–4 句话澄清一个具体观察或追问。反思问题：${input.question}。我的回答是自述，不要把它当成已经发生的行为或性格诊断。`,en:`Respond briefly to my reflection in 2–4 sentences, with one specific clarification or follow-up. Reflection question: ${input.question}. My answer is self-report, not proof of an observed behavior or a personality diagnosis.`},lang),
 },llm,model,signal,[answer]);
 const sources=reply.sources.map(source=>{const item=(source.kind==='theory'?THEORIES:CASES).find(k=>k.id===source.id)!;return `${pick(item.title,lang)} — ${item.source.book}, ${item.source.author}`;});
 const text=[`“${reply.evidence}”`,reply.answer,...sources].filter(Boolean).join('\n\n');
 signal?.throwIfAborted();onDelta?.(text);return text;
}

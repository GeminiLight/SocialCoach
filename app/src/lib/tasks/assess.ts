import { extractJSON, LLMError, type LLM, type ChatOpts } from "@/lib/llm-core";
import { assessSystem, pick, silenceMarker, transcriptBlock } from "@/lib/prompts";
import { retrieveKnowledge } from "@/lib/retrieval";
import type { Case, Scenario, Theory } from "@/data/corpus/types";
import { goalOutcome, hasQuote } from "@/lib/practice-policy";
import type { ChatMessage, Report } from "@/lib/types";
import { SKILLS, type Lang, type SkillId } from "@/data/taxonomy";
import type { AssessInput } from "./types";
import {validateSceneContext,sanitizeSceneNotes,SCENE_ASSESS_POLICY,type SceneContext} from '../scene-context';
import {ReportSchema} from '../archive';
import {checkAssessment} from './assessment-check';

const skillIds = new Set(SKILLS.map((s) => s.id));

/** Clamp and validate whatever the model returned so the client can trust every field. */
const list = <T,>(v: T[] | undefined): T[] => Array.isArray(v) ? v : [];
const str = (v: unknown): string => typeof v === "string" ? v.trim() : "";
const unrated = { zh: "这次对话还没有足够的原话证据支持评价。", en: "This conversation does not yet provide enough quoted evidence for an assessment." };

export function sanitizeReport(raw: Partial<Report>, scenario: Scenario, theories: Theory[], cases: Case[], messages: ChatMessage[] = [], goals: SkillId[] = [], lang: Lang = "zh", objectiveDone: boolean[] = [], sceneContext?:SceneContext): Report {
  const spoken = messages.filter((m) => m.role === "learner").map((m) => m.text);
  const npcSpoken=messages.filter(m=>m.role==='npc').map(m=>m.text);
  const evidence = [...spoken, ...messages.filter((m) => m.role === "event" && m.kind === "silence").map((m) => silenceMarker(m.seconds ?? 0, lang))];
  const practiced = [...scenario.skills, ...(scenario.relatedSkills ?? [])];
  const targeted = goals.filter((k) => practiced.includes(k));
  const ratingSkills = new Set(targeted.length ? targeted : scenario.skills);
  const seen = new Set<string>();
  const ratings = list(raw.ratings).filter((r) => {
    if (!r || !ratingSkills.has(r.skill) || seen.has(r.skill) || !Number.isInteger(r.level) || r.level < 0 || r.level > 3 || !hasQuote(r.evidence, spoken) || !str(r.reason)) return false;
    seen.add(r.skill);
    return true;
  });
  const stars = (ratings.length ? Math.round(ratings.reduce((sum, r) => sum + r.level, 0) / ratings.length) : 0) as Report["stars"];
  const clean = <T extends { skill: string; evidence: string; behavior: string }>(arr: T[] | undefined) => list(arr).filter((x) => x && skillIds.has(x.skill as SkillId) && practiced.includes(x.skill as SkillId) && str(x.behavior) && hasQuote(x.evidence, evidence));
  const strengths = clean(raw.strengths);
  const weaknesses = clean(raw.weaknesses).filter((w) => w.deficit === "acquisition" || w.deficit === "performance");
  const tIds = new Set(theories.map((t) => t.id));
  const cIds = new Set(cases.map((c) => c.id));
  const knowledge = {
    theoryIds: list(raw.knowledge?.theoryIds).filter((id) => tIds.has(id)).slice(0, 2),
    caseIds: list(raw.knowledge?.caseIds).filter((id) => cIds.has(id)).slice(0, 2),
    whyThis: str(raw.knowledge?.whyThis),
  };
  const deltas: Report["deltas"] = {};
  const results=list(raw.objectiveResults);
  const objectiveResults=results.length===scenario.objectives.length&&results.every((r,i)=>r&&r.index===i&&['met','unmet','unknown'].includes(r.status)&&hasQuote(r.evidence,spoken)&&str(r.reason)&&(!r.npcEvidence||hasQuote(r.npcEvidence,npcSpoken)))?results:undefined;
  const outcome = objectiveResults?goalOutcome(objectiveResults.map(r=>r.status==='met')):raw.outcome === "success" || raw.outcome === "partial" || raw.outcome === "failure" ? raw.outcome : goalOutcome(objectiveDone);
  const verdictEvidence = hasQuote(raw.verdictEvidence, spoken) ? raw.verdictEvidence : undefined;
  return {
    ...(sceneContext?{sceneNotes:sanitizeSceneNotes(raw.sceneNotes,sceneContext)}:{}),
    ...(objectiveResults?{objectiveResults}:{}),
    scoringVersion: 2, ratings, stars, outcome, verdictEvidence,
    verdict: verdictEvidence ? str(raw.verdict) : pick(unrated, lang),
    summary: verdictEvidence ? str(raw.summary) : "",
    strengths, weaknesses,
    alternatives: list(raw.alternatives).filter((a) => a && hasQuote(a.original, spoken) && str(a.better) && str(a.why)),
    knowledge,
    reflectionQuestions: [...new Set(list(raw.reflectionQuestions).filter((q) => str(q)))].slice(0, 3),
    nextStep: str(raw.nextStep), deltas,
  };
}

/**
 * Diagnose the conversation. Validate evidence before exposing any report text.
 * The transport still supports @@final; raw, unverified assessments never flash in the UI.
 */
export async function runAssess(input: AssessInput, llm: LLM, smartModel: string, onDelta?: (d: string) => void, signal?:AbortSignal): Promise<Report> {
  signal?.throwIfAborted();
  const { scenario, learnerCharacterId, messages, goals, lang } = input;
  let sceneContext:SceneContext|undefined;
  try{sceneContext=validateSceneContext(input.sceneContext,messages);}catch{throw new LLMError(pick({zh:'现场记录与原话不一致，请重新打开复盘。',en:'The scene record does not match the transcript. Please reopen the debrief.'},lang),400);}
  const name = input.learnerName || pick(scenario.characters.find((c) => c.id === learnerCharacterId)!.name, lang);
  const transcript = transcriptBlock(messages, scenario, lang, name);
  const learnerText = messages.filter(m=>m.role === "learner"||m.role === "npc").map(m=>m.text).join(" ");

  const kb = retrieveKnowledge({
    skills: [...scenario.skills, ...(scenario.relatedSkills ?? []), ...goals],
    context: scenario.context,
    query: `${scenario.keywords.join(" ")} ${learnerText}`,
    acquisition: true,
    performance: true,
  });

  const request:ChatOpts = {
    signal,
    model: smartModel,
    maxTokens: 7000,
    effort: "low",
    system: [{ text: assessSystem(scenario, learnerCharacterId, lang, kb.theories, kb.cases, goals)+(sceneContext?`\n\n3D OBSERVATION POLICY: ${SCENE_ASSESS_POLICY}`:''), cache: true }],
    messages: [
      {
        role: "user" as const,
        content: `TRANSCRIPT:\n${transcript}\n\nSimulation engine's objective tracking: ${sceneContext?'not tracked in this 3D practice; judge the actual dialogue without assuming failure':JSON.stringify(input.objectiveDone ?? [])}; engine outcome: ${input.outcome ?? "n/a"} (verify against the transcript; you may disagree).${sceneContext?`\n\nPUBLIC SCENE OBSERVATIONS:\n${JSON.stringify(sceneContext)}`:''}\n\nProduce the assessment JSON. First rate communication against the learner's CURRENT expressed intent, then assess separate initial aims. Write ratings, objectiveResults, outcome, verdictEvidence, verdict, summary, strengths, weaknesses, alternatives, knowledge, reflectionQuestions, nextStep, deltas${sceneContext?', sceneNotes':''}. Judge communication independently of the engine outcome.`,
      },
    ],
  };
  const run = llm.chatStream(request);
  for await (const delta of run.deltas) { void delta; signal?.throwIfAborted(); }
  signal?.throwIfAborted();
  if (run.refused()) throw new Error("The model declined this request.");
  const unavailable=()=>new LLMError(pick({zh:'这次复盘还没能可靠地核对原话。对话已保留，请重试。',en:'This debrief could not reliably verify the conversation. Your transcript is saved; please retry.'},lang),502,true);
  const parse=(text:string)=>{
    const raw=extractJSON<Partial<Report>>(text);
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Report must be an object');
    const learnerLines=messages.filter(m=>m.role==='learner').map(m=>m.text),npcLines=messages.filter(m=>m.role==='npc').map(m=>m.text);
    const literal=(value:string|undefined,lines:string[])=>{
      if(typeof value!=='string')return value;
      const body=value.trim(),pairs:Record<string,string>={'「':'」','“':'”','‘':'’','«':'»','"':'"'};
      if(hasQuote(value,lines))return value;
      if(pairs[body[0]]===body.at(-1)&&hasQuote(body.slice(1,-1),lines))return body.slice(1,-1).trim();
      return value;
    };
    // Strip only conventional formatting around an independently verified
    // literal body. Altered wording, joined fragments and speakers still fail.
    raw.verdictEvidence=literal(raw.verdictEvidence,learnerLines);
    for(const item of [...list(raw.ratings),...list(raw.strengths),...list(raw.weaknesses)])if(item&&typeof item==='object')item.evidence=literal(item.evidence,learnerLines)!;
    for(const item of list(raw.alternatives))if(item&&typeof item==='object')item.original=literal(item.original,learnerLines)!;
    const quoteErrors:string[]=[];
    if(!hasQuote(raw.verdictEvidence,learnerLines))quoteErrors.push(`verdictEvidence must be a contiguous literal learner quotation, not NPC dialogue: ${JSON.stringify(raw.verdictEvidence)}. Learner source lines: ${JSON.stringify(learnerLines.length<=8?learnerLines:[...learnerLines.slice(0,3),...learnerLines.slice(-5)])}`);
    if(!Array.isArray(raw.objectiveResults)||raw.objectiveResults.length!==scenario.objectives.length)throw new Error(`objectiveResults must have ${scenario.objectives.length} items, in initial objective order.`);
    for(const [index,result] of raw.objectiveResults.entries()){
      if(!result||result.index!==index||!['met','unmet','unknown'].includes(result.status)||!str(result.reason))throw new Error(`objectiveResults[${index}] needs its index, status and a reason.`);
      for(const [field,lines] of [['evidence',learnerLines],['npcEvidence',npcLines]] as const){
        let quote=result[field];if(field==='npcEvidence'&&!quote)continue;
        quote=result[field]=literal(quote,lines)!;
        if(field==='npcEvidence'&&typeof quote==='string'){
          // Some providers copy the transcript's speaker metadata as well as
          // the line. Remove only a known NPC label, then require the exact
          // contiguous quotation as before. No punctuation/fuzzy repair.
          const label=quote.match(/^([^:：\n]+)[:：]\s*([\s\S]*)$/);
          const body=label?literal(label[2],lines):undefined;
          if(!hasQuote(quote,lines)&&label&&scenario.characters.some(c=>c.id!==learnerCharacterId&&[c.id,c.name.zh,c.name.en].includes(label[1].trim()))&&hasQuote(body,lines))quote=result.npcEvidence=body.trim();
        }
        if(!hasQuote(quote,lines))quoteErrors.push(`objectiveResults[${index}].${field} is not a contiguous literal quote: ${JSON.stringify(quote)}. Do not join fragments or alter punctuation. Source lines: ${JSON.stringify(lines.length<=8?lines:[...lines.slice(0,3),...lines.slice(-5)])}`);
      }
    }
    if(quoteErrors.length)throw new Error(quoteErrors.join('\n'));
    const report=sanitizeReport(raw,scenario,kb.theories,kb.cases,messages,goals,lang,input.objectiveDone,sceneContext);
    // A blank object or an entirely fabricated quote is not a completed review.
    if(!report.verdictEvidence||!report.verdict||!report.ratings?.length||!report.objectiveResults)throw new Error('The report needs actual learner quotations, one communication rating and one evidence-backed status for each original objective');
    if(!ReportSchema.safeParse(report).success)throw new Error("The report contains incomplete or invalid fields.");
    return report;
  };
  let text=run.text(),report:Report,formatRepairUsed=false;
  const repair=async(reason:string,fields?:string[])=>{
    signal?.throwIfAborted();
    const fixed=await llm.chatText({...request,...(fields?{maxTokens:4000,thinking:false}:{}),messages:[...request.messages,{role:'assistant' as const,content:text},{role:'user' as const,content:`Revise the draft for the SAME transcript. ${reason}\n${fields?`Return a JSON object containing corrections ONLY to these top-level fields: ${fields.join(', ')}. Other fields are already validated and will be preserved by the application. Do not rewrite verdictEvidence or objective quotations unless the listed field itself needs correction.`:'Return a complete assessment JSON.'} Preserve fields already supported by evidence. Remove optional criticism or alternatives when their premise is unsupported; do not invent another flaw to replace it. Do not add facts, change the learner's intent, or inflate scores to avoid a criticism. Do not write numeric transcript indexes in the report.`}]});
    signal?.throwIfAborted();return fixed;
  };
  const formatReason=(error:unknown)=>`FORMAT REPAIR: ${error instanceof Error?error.message:'The draft is not a complete report.'} Return valid JSON with all required fields and copy quotations literally from the supplied transcript. Optional npcEvidence may be omitted when NPC agreement is not needed; do not manufacture agreement.`;
  try{report=parse(text);}catch(error){
    formatRepairUsed=true;
    text=await repair(formatReason(error));
    try{report=parse(text);}catch{throw unavailable();}
  }
  // Check meaning, not only quotation existence. Only the accepted report is emitted.
  const semanticRevisions=2;
  for(let attempt=0;attempt<=semanticRevisions;attempt++){
    let check;
    try{check=await checkAssessment(report,{...input,sceneContext},llm,smartModel,signal,{theories:kb.theories,cases:kb.cases});}catch(error){
      // Provider failures and cancellation retain their original type/status.
      if(signal?.aborted||error instanceof LLMError)throw error;
      throw unavailable();
    }
    if(check.approved){onDelta?.(JSON.stringify(report));return report;}
    if(attempt===semanticRevisions)throw unavailable();
    const fields:string[]=[...new Set(check.issues.map(issue=>issue.field))];
    // Only re-generate the fields whose interpretation failed. Recopying the
    // whole accepted draft can corrupt unrelated, already verified quotations.
    if(fields.includes('objectiveResults'))fields.push('verdict','summary');
    if(fields.includes('ratings'))fields.push('deltas');
    const correctedFields=[...new Set(fields)];
    const base=report;
    const mergeCorrection=(correction:string)=>{
      const patch=extractJSON<Partial<Report>>(correction);
      if(!patch||typeof patch!=='object'||Array.isArray(patch))throw new Error('Evidence correction must be a JSON object');
      return JSON.stringify({...base,...Object.fromEntries(correctedFields.filter(field=>Object.hasOwn(patch,field)).map(field=>[field,patch[field as keyof Report]]))});
    };
    text=await repair(`EVIDENCE REPAIR: an independent review found these unsupported interpretations:\n${JSON.stringify(check.issues)}\nRecheck the full transcript, not just each cited line. Keep fair criticism and separate original goal attainment from communication quality.`,correctedFields);
    const correction=text;
    try{text=mergeCorrection(correction);}catch{/* The existing format budget handles malformed correction JSON below. */}
    try{report=parse(text);}catch(error){
      if(formatRepairUsed)throw unavailable();
      formatRepairUsed=true;
      text=await repair(formatReason(error)+' Retain the evidence corrections.');
      try{report=parse(mergeCorrection(text));}catch{throw unavailable();}
    }
  }
  throw unavailable();
}

import {z} from 'zod';
import {ScenarioSchema,SkillSchema,ContextSchema,AdaptationSchema} from './runtime-contracts';
import {SceneContextSchema} from './scene-context';

const text=z.string(),strings=z.array(text),num=z.number().finite();
export const ProficiencySchema=z.partialRecord(SkillSchema,num.min(1).max(5));
export const ProfileSchema=z.object({name:text,bio:text,goals:z.array(SkillSchema),contexts:z.array(ContextSchema),lang:z.enum(['zh','en']),createdAt:num});
const evidence=z.object({behavior:text,evidence:text,skill:SkillSchema});
export const ReportSchema=z.object({
 scoringVersion:z.literal(2).optional(),ratings:z.array(z.object({skill:SkillSchema,level:z.number().int().min(0).max(3),evidence:text,reason:text})).optional(),
 stars:z.number().int().min(0).max(3),outcome:z.enum(['success','partial','failure']),verdictEvidence:text.optional(),verdict:text,summary:text,
 strengths:z.array(evidence),weaknesses:z.array(evidence.extend({deficit:z.enum(['acquisition','performance']),whyItMatters:text})),
 alternatives:z.array(z.object({original:text,better:text,why:text})),knowledge:z.object({theoryIds:strings,caseIds:strings,whyThis:text}),reflectionQuestions:strings,nextStep:text,deltas:z.partialRecord(SkillSchema,num),
 objectiveResults:z.array(z.object({index:z.number().int().nonnegative(),status:z.enum(['met','unmet','unknown']),evidence:text,npcEvidence:text.optional(),reason:text})).optional(),
 sceneNotes:z.array(z.object({evidence:text,observationId:text,note:text})).optional(),
});
const closure=z.object({kind:z.enum(['agreement','boundary','deferred','withdrawal']),learnerQuote:text.optional(),npcQuote:text});
export const MetaSchema=z.object({objectiveEvidence:z.array(z.object({index:z.number().int().nonnegative(),learnerQuote:text,npcQuote:text.optional()})).optional(),objectives:z.array(z.boolean()),ended:z.boolean(),closure:closure.optional(),outcome:z.enum(['success','partial','failure']).nullable().optional(),note:text.optional(),stance:num.min(0).max(100).optional(),revealed:z.boolean().optional(),disclosures:z.array(z.object({characterId:text,quote:text})).optional()});
export const MessageSchema=z.object({id:text.min(1),role:z.enum(['learner','npc','coach','event']),characterId:text.optional(),text,ts:num,kind:z.enum(['hint','silence']).optional(),seconds:num.optional(),meta:MetaSchema.optional()});
const reply=z.object({evidence:text,answer:text,example:text,sources:z.array(z.object({kind:z.enum(['theory','case']),id:text}))});
const SessionSchema=z.object({
 id:text.min(1),scenario:ScenarioSchema,learnerCharacterId:text,messages:z.array(MessageSchema),objectiveDone:z.array(z.boolean()),status:z.enum(['briefing','active','ended','assessed']),startedAt:num,endedAt:num.optional(),reflections:z.array(z.object({question:text,answer:text,coachReply:text.optional(),revision:text.optional()})),origin:z.enum(['scheduled','arena','rehearse']),
 adaptation:AdaptationSchema.extend({briefing:text,objectives:strings,focus:text}).optional(),prescription:z.object({query:text,core_constraints:z.object({target_skills:z.array(SkillSchema),contexts:strings.optional()}),optional_constraints:z.object({related_skills:z.array(SkillSchema).optional(),relationship_types:strings.optional(),difficulty:z.number().int().min(1).max(3).optional()}).optional(),rationale:text}).optional(),
 retrieval:z.object({relaxed:strings,candidates:num,chosen:text,roleFit:z.object({characterId:text,fit:z.enum(['compatible','uncertain']),reason:text}).optional()}).optional(),
 sceneContext:SceneContextSchema.optional(),report:ReportSchema.optional(),outcome:z.enum(['success','partial','failure']).optional(),outcomeNote:text.optional(),closure:closure.optional(),turnLimit:num.optional(),continuedFrom:text.optional(),stanceTrail:z.array(num).optional(),revealedAtTurn:num.optional(),revealSeen:z.boolean().optional(),timed:z.boolean().optional(),debriefChat:z.array(z.object({id:text,question:text,reply,at:num})).optional(),
 disclosures:z.array(z.object({characterId:text,messageId:text,quote:text,turn:num})).optional(),
}).superRefine((s,ctx)=>{if(!s.scenario.characters.some(c=>c.id===s.learnerCharacterId))ctx.addIssue({code:'custom',path:['learnerCharacterId'],message:'Learner must belong to the saved cast'});});
export const ArchiveSchema=z.object({
 profile:ProfileSchema.nullable().default(null),onboardingLang:z.enum(['zh','en']).optional(),proficiency:ProficiencySchema.default({}),sessions:z.array(SessionSchema).default([]),customScenarios:z.array(ScenarioSchema).default([]),bookmarks:strings.default([]),practiceDays:strings.default([]),todaySessionId:text.nullable().default(null),todayDate:text.nullable().default(null),
 settings:z.object({tts:z.boolean(),voiceEngine:z.enum(['natural','system']).optional(),theme:z.enum(['system','light','dark']).optional(),voiceNoticeSeen:z.boolean().optional(),avatarSeed:num.optional(),avatarPortrait:text.optional(),avatarImage:text.optional(),timed:z.boolean().optional(),patience:z.union([z.literal(10),z.literal(15),z.literal(20)]).optional(),telemetry:z.boolean().optional()}).default({tts:true}),
 // Old cached conclusions lack verified identity pointers. Recompute, never
 // erase the practice transcripts on which they were based.
 patternInsight:z.object({result:z.object({found:z.boolean(),pattern:text,why:text,evidence:z.array(z.object({sessionId:text,messageId:text,title:text,quote:text})),skill:SkillSchema.optional(),nextStep:text}),from:strings,at:num}).nullable().catch(null).default(null),
}).superRefine((s,ctx)=>{if(new Set(s.sessions.map(x=>x.id)).size!==s.sessions.length)ctx.addIssue({code:'custom',path:['sessions'],message:'Duplicate session IDs'});});
export function parseArchive(value:unknown){
 const result=ArchiveSchema.safeParse(value);
 if(!result.success)throw new SyntaxError('The saved archive structure is invalid');
 return result.data;
}
// Reject unknown future envelope versions without modifying the bytes.
export function checkArchiveEnvelope(raw:string){
 const envelope=z.object({version:z.literal(0).optional(),state:ArchiveSchema}).safeParse(JSON.parse(raw));
 if(!envelope.success)throw new SyntaxError('The archive version or structure is invalid');
 return envelope.data;
}

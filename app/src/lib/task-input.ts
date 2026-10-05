import {pick} from './i18n';
import {z} from 'zod';
import {ScenarioSchema,SkillSchema} from './runtime-contracts';
import {MessageSchema,ProfileSchema,ProficiencySchema} from './archive';
import {SceneContextSchema} from './scene-context';
import {LLMError} from './llm-core';
import {RehearsalDescriptionSchema} from './rehearsal-input';
const short=z.string().max(2000),lang=z.enum(['zh','en']);
const turn=z.object({scenario:ScenarioSchema,learnerCharacterId:z.string().max(100),messages:z.array(MessageSchema).max(300),lang,learnerName:z.string().max(200).optional(),turnLimit:z.number().int().min(1).max(200).optional()}).superRefine((v,ctx)=>{
 if(!v.scenario.characters.some(c=>c.id===v.learnerCharacterId&&c.playable))ctx.addIssue({code:'custom',path:['learnerCharacterId'],message:'An allowed playable character is required'});
 if(v.messages.reduce((n,m)=>n+m.text.length,0)>100000||v.messages.some(m=>m.text.length>12000))ctx.addIssue({code:'custom',path:['messages'],message:'Transcript is too long'});
 if(v.messages.some(m=>m.role==='npc'&&m.characterId&&(!v.scenario.characters.some(c=>c.id===m.characterId)||m.characterId===v.learnerCharacterId)))ctx.addIssue({code:'custom',path:['messages'],message:'NPC speaker must belong to the other cast'});
});
const history=z.object({sessionId:z.string().optional(),practiceId:z.string().optional(),scenarioId:z.string(),title:short,skills:z.array(z.string()),context:z.string(),outcome:z.string().optional(),stars:z.number().min(0).max(3).optional(),scoringVersion:z.literal(2).optional(),at:z.number().finite(),diagnosis:z.array(z.object({skill:SkillSchema,level:z.number().int().min(0).max(3),evidence:short,deficit:z.enum(['acquisition','performance']).optional()})).max(10).optional(),nextStep:short.optional(),reflections:z.array(z.object({question:short,answer:short})).max(3).optional()});
export const TaskInputSchemas={
 roleplay:turn,hint:turn,
 assess:turn.safeExtend({goals:z.array(SkillSchema).max(34),objectiveDone:z.array(z.boolean()).max(10).optional(),outcome:z.string().max(100).optional(),sceneContext:SceneContextSchema.optional()}),
 schedule:z.object({profile:ProfileSchema,proficiency:ProficiencySchema,history:z.array(history).max(12),lang,scenarioId:z.string().max(100).optional(),scenario:ScenarioSchema.optional()}),
 rehearse:z.object({description:RehearsalDescriptionSchema,lang,profile:ProfileSchema.pick({name:true,bio:true,goals:true}).partial().optional()}),
 reflect:z.object({learnerCharacterId:z.string().max(100).optional(),responseFormat:z.literal("json").optional(),scenario:ScenarioSchema,question:z.string().min(1).max(1000),answer:z.string().trim().min(1).max(4000),lang,summary:z.string().max(8000).optional(),messages:z.array(MessageSchema).max(300).optional()}).refine(v=>!v.learnerCharacterId||v.scenario.characters.some(c=>c.id===v.learnerCharacterId&&c.playable),"An allowed learner is required"),
 pattern:z.object({lang,goals:z.array(SkillSchema),sessions:z.array(z.object({sessionId:z.string().min(1).max(100),practiceId:z.string().max(100).optional(),title:short,at:z.number(),outcome:short.optional(),verdict:short.optional(),gaveGroundOn:z.array(z.number()).max(200),turns:z.number().int().nonnegative(),weaknesses:z.array(z.object({messageId:z.string().min(1).max(100),behavior:short,evidence:short,skill:z.string(),deficit:z.string()})).max(10)})).max(20)}),
};
export function taskInput<T>(schema:z.ZodType<T>,raw:unknown):T{
 const parsed=schema.safeParse(raw);
 if(!parsed.success)throw new LLMError(pick({zh:'提交的练习资料不完整或过长，本地记录已保留。请检查后重试。',en:'The practice context is invalid or too long. Your local record is retained. Check it and retry.'},(raw as {lang?:unknown})?.lang==='en'?'en':'zh'),400);
 return parsed.data;
}
export const MAX_TASK_BODY=192000;
/** Read incrementally; neither a missing length nor chunked uploads bypass the cap. */
export async function readTaskBody<T>(req:Request,schema:z.ZodType<T>):Promise<T>{
 const lang=req.headers.get('accept-language')?.startsWith('en')?'en':'zh';
 const tooLong=pick({zh:'本次练习资料过长，本地记录已保留。',en:'The practice context is too long. Your local record is retained.'},lang);
 if(Number(req.headers.get('content-length'))>MAX_TASK_BODY)throw new LLMError(tooLong,413);
 const reader=req.body?.getReader();if(!reader)throw new LLMError(pick({zh:'缺少提交资料，请重试。',en:'Missing request data. Please retry.'},lang),400);
 const chunks:Uint8Array[]=[];let length=0;
 try{for(;;){req.signal.throwIfAborted();const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>MAX_TASK_BODY){await reader.cancel();throw new LLMError(tooLong,413);}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(length);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 let raw:unknown;try{raw=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new LLMError(pick({zh:'提交资料无法读取，请重试。',en:'The submitted data could not be read. Please retry.'},lang),400);}
 if(raw&&typeof raw==='object')raw={...raw,lang:(raw as {lang?:unknown}).lang==='en'?'en':'zh'};
 return taskInput(schema,raw);
}

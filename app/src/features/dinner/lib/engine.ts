import { z } from 'zod';
import {DramaSaveSchema,DinnerContextSchema,validDinnerContext,dinnerEvents,type DinnerContext} from './drama';
import { RoomContextSchema, RoomSaveSchema, validRoomCast, PLAYER_HOME, SEATS, distance, walkable, type RoomContext } from './room';
import { l, pick, scenarios, type Lang, type Scenario } from './content';

import { continueScript, type ScriptContext } from './dialogue';
import { DEFAULT_DINNER_TURNS, MAX_DINNER_TURNS, DinnerLengthSchema, VariantIdSchema, StoryBeatSchema, isSceneVariant, sceneTopics, variantFor, type StoryBeat } from './story';

export const ReactionSchema = z.object({ characterId: z.string().max(30), emotion: z.enum(['neutral', 'pressing', 'annoyed', 'thinking', 'supportive']), gesture: z.enum(['idle', 'toast', 'lean', 'fold', 'nod']) });
export const ReplySchema = z.object({ speakerId: z.string().max(30), text: z.string().min(1).max(650), cue: z.string().min(1).max(250), reactions: z.array(ReactionSchema).min(3).max(3), story:StoryBeatSchema.optional(),replyTo:z.string().min(1).max(120).optional() });
export type Reply = z.infer<typeof ReplySchema>;
export const HeardSchema=z.object({speakerId:z.string().max(30),text:z.string().min(1).max(650),cue:z.string().max(250).optional()});
export type Message = { role: 'npc' | 'user'; text: string; speakerId?: string; cue?: string; mode?: 'script' | 'model'; reactions?: Reply['reactions']; room?:RoomContext; dinner?:DinnerContext; targetId?:string; heard?:z.infer<typeof HeardSchema>; story?:StoryBeat };
export const MessageSchema = z.object({ role: z.enum(['npc', 'user']), text: z.string().min(1).max(2000), speakerId: z.string().optional(), cue: z.string().optional(), mode: z.enum(['script', 'model']).optional(), reactions: z.array(ReactionSchema).optional(), room:RoomContextSchema.optional(),dinner:DinnerContextSchema.optional(),targetId:z.string().max(30).optional(),heard:HeardSchema.optional(),story:StoryBeatSchema.optional() });
export const SaveSchema = z.object({ version: z.literal(1), maxTurns:DinnerLengthSchema.default(DEFAULT_DINNER_TURNS), variantId:VariantIdSchema.optional(), targetId:z.string().max(30).optional(), scenarioId: z.enum(['work', 'family', 'school']), messages: z.array(MessageSchema).max(MAX_DINNER_TURNS*2+1), started: z.boolean(), complete: z.boolean(), lang: z.enum(['zh', 'en']), draft: z.string().max(500),view:z.enum(['first','third']).optional(),room:RoomSaveSchema.optional(),dinner:DramaSaveSchema.optional() }).superRefine((save, ctx) => {
  const ids = scenarios.find(s => s.id === save.scenarioId)!.characters.map(c => c.id);
  if(save.variantId&&!isSceneVariant(save.scenarioId,save.variantId))ctx.addIssue({code:'custom',message:'Invalid story variant'});
  if(save.messages.filter(m=>m.role==='user').length>save.maxTurns)ctx.addIssue({code:'custom',message:'Turn budget exceeded'});
  if((save.targetId&&!ids.includes(save.targetId))||save.messages.some(m=>m.targetId&&!ids.includes(m.targetId)))ctx.addIssue({code:'custom',message:'Invalid addressee'});
  if(save.messages.some(m=>m.story&&(!sceneTopics[save.scenarioId].includes(m.story.topic)||(m.story.event&&!variantFor(save.scenarioId,save.variantId).events.includes(m.story.event)))))ctx.addIssue({code:'custom',message:'Invalid story beat'});
  if (!save.messages.length || save.messages.length % 2 !== 1 || save.messages.some((m, i) => m.role !== (i % 2 ? 'user' : 'npc') || (m.role === 'npc' && !ids.includes(m.speakerId ?? '')))) ctx.addIssue({ code: 'custom', message: 'Invalid conversation order' });
  if(save.room&&(new Set(save.room.npcs.map(n=>n.id)).size!==3||save.room.npcs.some(n=>!ids.includes(n.id))))ctx.addIssue({code:'custom',message:'Invalid room cast'});
  if(save.room){const {player,npcs}=save.room;if(player.seated?distance(player,PLAYER_HOME)>.02:!walkable(player,0))ctx.addIssue({code:'custom',message:'Invalid player position'});for(const n of npcs){const index=ids.indexOf(n.id);if(index>=0&&(n.seated?distance(n,SEATS[index])>.02:!walkable(n,index+1)))ctx.addIssue({code:'custom',message:'Invalid NPC position'});}}
  if(save.room?.attention?.characterId&&!ids.includes(save.room.attention.characterId))ctx.addIssue({code:'custom',message:'Invalid attention target'});
  if(save.dinner&&[...save.dinner.seen,...save.dinner.records.map(r=>r.eventId),...(save.dinner.active?[save.dinner.active]:[])].some(id=>dinnerEvents.find(e=>e.id===id)!.scene!==save.scenarioId||!variantFor(save.scenarioId,save.variantId).events.includes(id)))ctx.addIssue({code:'custom',message:'Invalid dinner scene'});
  if(save.messages.some((m,i)=>m.dinner&&(!validDinnerContext(m.dinner,save.scenarioId)||m.dinner.previous.some(r=>r.turn>Math.floor(i/2)))))ctx.addIssue({code:'custom',message:'Invalid dinner evidence'});
  if(save.dinner&&save.dinner.records.some(r=>r.turn>save.messages.filter(m=>m.role==='user').length||r.turn<dinnerEvents.find(e=>e.id===r.eventId)!.turn))ctx.addIssue({code:'custom',message:'Invalid action timing'});
  if(save.messages.some(m=>m.heard&&!ids.includes(m.heard.speakerId)))ctx.addIssue({code:'custom',message:'Invalid heard speaker'});
  if(save.messages.some(m=>m.room&&!validRoomCast(m.room,ids)))ctx.addIssue({code:'custom',message:'Invalid spatial evidence'});
  if (save.messages.some(m => m.reactions&&(m.reactions.length!==3||new Set(m.reactions.map(r=>r.characterId)).size!==3||m.reactions.some(r => !ids.includes(r.characterId))))) ctx.addIssue({ code: 'custom', message: 'Invalid character reaction' });
}).transform(save=>({...save,complete:save.complete||save.messages.filter(m=>m.role==='user').length>=save.maxTurns}));
export type Save = z.infer<typeof SaveSchema>;

export function opening(scenario: Scenario, lang: Lang, variantId?: z.infer<typeof VariantIdSchema>): Message {
  const variant=variantFor(scenario.id,variantId);
  const event=dinnerEvents.find(e=>e.id===variant.openingEvent);
  return { role: 'npc', speakerId: scenario.characters[variant.speaker].id, text: pick(variant.opening, lang), cue: pick(event?.cue??scenario.openingCue,lang), mode: 'script', story:{topic:variant.topic}, reactions: scenario.characters.map((c, i) => ({ characterId: c.id, emotion: i === variant.speaker ? 'pressing' : 'neutral', gesture: event?.kind==='toast'&&i===0?'toast':'idle' })) };
}

export type Intent = 'boundary' | 'bridge' | 'yield' | 'attack' | 'unclear';
export function detectIntent(text: string): Intent {
  if (/闭嘴|滚|有病|凭什么|算什么|放屁|shut up|idiot|stupid/i.test(text)) return 'attack';
  if (/那我喝茶|我喝茶|我用茶|以茶代酒|i[’']?ll drink tea/i.test(text)) return 'bridge';
  if (/那我喝(?!茶)|我喝了(?!茶)|干了|听你|听您|都行|随便你|好吧|fine,? i[’']?ll|i[’']?ll drink|whatever you say/i.test(text)) return 'yield';
  if (/用茶|喝茶|以茶|代酒|私下|饭后|之后聊|一起|写进|总结|交付|项目|测试|排期|需求|上线|每个人|tea|privately|after dinner|write.up|everyone|delivery|project|testing|schedule|requirements|launch|contribution|code and design/i.test(text)) return 'bridge';
  if (/不喝|不想|不接受|不同意|不答应|自己决定|我的生活|两回事|我写|不用|不能|不要|不会|不愿|don[’']?t|won[’']?t|do not|will not|cannot|not agreeing|my life|my decision|different things|i wrote|want to decide|decide for myself|decide when/i.test(text)) return 'boundary';
  return 'unclear';
}

export function scriptedReply(scenario: Scenario, text: string, turn: number, lang: Lang, room?:RoomContext,dinner?:DinnerContext,context:ScriptContext={}): Reply {
  return continueScript(scenario,text,turn,lang,room,dinner,context);
}

export function validateReply(data: unknown, scenario: Scenario): Reply {
  const reply = ReplySchema.parse(data);
  const ids = scenario.characters.map(c => c.id);
  if (!ids.includes(reply.speakerId) || new Set(reply.reactions.map(r => r.characterId)).size !== 3 || reply.reactions.some(r => !ids.includes(r.characterId))) throw new Error('Invalid character');
  if(reply.story&&!sceneTopics[scenario.id].includes(reply.story.topic))throw new Error('Invalid story topic');
  if(reply.story?.event&&dinnerEvents.find(e=>e.id===reply.story!.event)?.scene!==scenario.id)throw new Error('Invalid story event');
  return reply;
}

/** Describe the animation we actually render, never a generated offscreen action. */
export function renderedCue(reply:Reply,scenario:Scenario,lang:Lang):string {
  const name=scenario.characters.find(c=>c.id===reply.speakerId)!.name;
  const gesture=reply.reactions.find(r=>r.characterId===reply.speakerId)!.gesture;
  const cues={idle:l(`${name.zh}看向你。`,`${name.en} looks at you.`),toast:l(`${name.zh}举起杯子。`,`${name.en} raises a cup.`),lean:l(`${name.zh}朝你倾身。`,`${name.en} leans toward you.`),fold:l(`${name.zh}抱起手臂。`,`${name.en} folds their arms.`),nod:l(`${name.zh}点了点头。`,`${name.en} nods.`)};
  return pick(cues[gesture],lang);
}

export function extractJSON(text: string): unknown {
  const clean = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('No JSON object');
  return JSON.parse(clean.slice(start, end + 1));
}

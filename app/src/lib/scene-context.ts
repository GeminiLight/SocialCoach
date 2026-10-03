import {z} from 'zod';
import type {ChatMessage} from './types';
import {hasQuote} from './practice-policy';

/** Public observations, attached to the exact spoken turn. Never camera or inferred emotion. */
export const SceneContextSchema=z.object({
  kind:z.literal('3d'),
  practiceId:z.string().uuid().optional(),
  sceneId:z.enum(['work','family','school','elevator','office']),
  openingId:z.string().min(1).max(80),
  actions:z.array(z.object({id:z.string().min(1).max(80),afterTurn:z.number().int().min(0).max(24),action:z.string().min(1).max(500)})).max(24).optional(),
  observations:z.array(z.object({
    id:z.string().min(1).max(80),turn:z.number().int().min(1).max(24),
    learnerQuote:z.string().min(1).max(2000),
    facts:z.array(z.string().min(1).max(500)).min(1).max(8),
  })).max(24),
});
export type SceneContext=z.infer<typeof SceneContextSchema>;
export type SceneNote={evidence:string;observationId:string;note:string};

export function validateSceneContext(value:unknown,messages:ChatMessage[]):SceneContext|undefined {
  if(value===undefined)return;
  const context=SceneContextSchema.parse(value);
  const spoken=messages.filter(m=>m.role==='learner');
  const ids=new Set<string>();
  for(const observation of context.observations){
    if(ids.has(observation.id)||spoken[observation.turn-1]?.text!==observation.learnerQuote)throw new Error('Scene observations must match the exact learner turn');
    ids.add(observation.id);
  }
  const actionIds=new Set<string>();
  for(const action of context.actions??[]){
    if(actionIds.has(action.id)||action.afterTurn>spoken.length)throw new Error('Scene actions must belong to the recorded conversation');
    actionIds.add(action.id);
  }
  return context;
}

export function sanitizeSceneNotes(value:unknown,context?:SceneContext):SceneNote[] {
  if(!context||!Array.isArray(value))return [];
  const schema=z.object({evidence:z.string().trim().min(1).max(2000),observationId:z.string().max(80),note:z.string().trim().min(1).max(2000)});
  const seen=new Set<string>(),notes:SceneNote[]=[];
  for(const raw of value){
    const result=schema.safeParse(raw);if(!result.success)continue;
    const item=result.data,observation=context.observations.find(o=>o.id===item.observationId);
    if(!observation||seen.has(item.observationId)||!hasQuote(item.evidence,[observation.learnerQuote]))continue;
    notes.push(item);seen.add(item.observationId);if(notes.length===3)break;
  }
  return notes;
}

export const SCENE_OBSERVATION_POLICY=`These are recorded public scene observations, not evidence of emotions or hidden intent. Pair any interpretation with the learner's exact words and the subsequent actual NPC dialogue. A selected addressee does not make this a private conversation: everyone present can hear. Proximity is not confidentiality. Standing or moving is not proof of avoidance. Raising a cup or choosing tea is not proof of drinking or agreeing to delivery. An NPC animation or reaction is not an objective rating of the learner. No audio prosody, timing, gaze trajectory or body language of the learner was measured; do not invent it. Any assessment still requires a spoken learner quote.`;

export const SCENE_ASSESS_POLICY=SCENE_OBSERVATION_POLICY+` You may return sceneNotes: up to 3 {evidence,observationId,note}, only when the supplied facts change how that specific quoted line should be understood. Use an ID attached to that same learner turn, explain the limit naturally, and omit when nothing useful is supported. These notes supplement the same communication ratings, never a separate 3D score.`;

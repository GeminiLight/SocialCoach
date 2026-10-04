import type {Scenario as PracticeScenario} from '@/data/corpus/types';
import {COMPETENCIES,skillById,type ContextId,type SkillId} from '@/data/taxonomy';
import type {Session,ChatMessage} from '@/lib/types';
import type {SceneContext} from '@/lib/scene-context';
import {l,pick,scenarios} from './content';
import {SaveSchema,type Save} from './engine';
import {dinnerTranscript} from './transcript';
import {actionEvidence} from './drama';
import {variantFor,storyScenario,type VariantId} from './story';
import {tableEvidence} from './tableEvidence';
import {publicSceneBrief} from './briefing';

const skills:Record<VariantId,SkillId[]>={
  'work-toast':['communication','resolving-conflicts','ethical-responsibility'],
  'work-deadline':['communication','problem-solving','analyzing-consequences'],
  'family-introduction':['communication','resolving-conflicts','goal-setting'],
  'family-privacy':['communication','ethical-responsibility','resolving-conflicts'],
  'school-credit':['recognizing-strengths','communication','teamwork'],
  'school-workload':['communication','goal-setting','teamwork'],
  'elevator-privacy':['communication','ethical-responsibility','resolving-conflicts'],
  'elevator-blame':['communication','problem-solving','ethical-responsibility'],
  'office-overtime':['communication','goal-setting','organizational-skills'],
  'office-interruption':['communication','standing-up','resolving-conflicts'],
};
const zones={table:l('桌边','at the table'),side:l('包厢侧边','at the side of the room'),door:l('包厢门边','by the room door'),lobby:l('电梯等候区','in the elevator lobby'),cabin:l('电梯轿厢','in the elevator cabin'),desk:l('办公桌边','by the desk'),board:l('白板边','by the whiteboard')};
const contexts:Record<Save['scenarioId'],ContextId>={work:'workplace',family:'family',school:'education',elevator:'workplace',office:'workplace'};

/** Bridge the actual 3D record into the same immutable assessment input as text practice. */
export function dinnerReviewContent(raw:Save) {
  const save=SaveSchema.parse(raw),variant=variantFor(save.scenarioId,save.variantId);
  const scene=storyScenario(scenarios.find(s=>s.id===save.scenarioId)!,variant),lang=save.lang;
  const source=tableEvidence[variant.id],targetSkills=skills[variant.id],brief=publicSceneBrief(variant.id,save.briefVersion);
  const hue=COMPETENCIES.find(c=>c.id==='relationship-skills')!.hue;
  const scenario:PracticeScenario={
    id:`3d-${variant.id}`,custom:true,title:variant.title,hook:source.pressure,
    background:l(`${scene.room.zh}。${variant.setup.zh}\n${brief.lines.map(v=>v.zh).join('\n')}\n${brief.unknown.zh}\n${scene.characters.map(c=>`${c.name.zh}：${c.description.zh}`).join('\n')}`,`${scene.room.en}. ${variant.setup.en}\n${brief.lines.map(v=>v.en).join('\n')}\n${brief.unknown.en}\n${scene.characters.map(c=>`${c.name.en}: ${c.description.en}`).join('\n')}`),
    context:contexts[scene.id],contextType:scene.category,skills:targetSkills,
    competencies:[...new Set(targetSkills.map(id=>skillById(id).competency))],
    relationship:scene.id==='family'?['parent']:scene.id==='school'?['senior','peer']:['senior','peer',...(scene.id==='work'?['customer' as const]:[])],
    difficulty:3,minutes:8,maxTurns:save.maxTurns,
    characters:[{id:'you',name:l('你','You'),role:brief.role,personality:l('按自己的意愿表达。','Speak according to your own intent.'),stance:variant.goal,playable:true,hue},...scene.characters.map(c=>({id:c.id,name:c.name,role:c.role,personality:c.description,stance:c.role,hue}))],
    objectives:brief.aims,success:l('根据用户真实意图与对话中的具体约定核对，不预设成功。','Check the learner’s actual intent and explicit arrangements without assuming success.'),failure:l('没有达成预设目标不自动代表沟通失败。','Not achieving the initial aim does not automatically mean poor communication.'),
    opening:{characterId:scene.characters[variant.speaker].id,text:variant.opening},
    source:`Original fiction: ${brief.source.path}`,keywords:[variant.id,...targetSkills],
  };
  const messages:ChatMessage[]=dinnerTranscript(save.messages,save.dinner?.records??[],scene,lang)
    .filter(line=>line.role!=='action').map(line=>({id:line.id,role:line.role==='user'?'learner':'npc',characterId:line.role==='user'?'you':line.speakerId,text:line.text,ts:0}));
  let turn=0;
  const sceneContext:SceneContext={kind:'3d',practiceId:save.practiceId,sceneId:scene.id,openingId:variant.id,actions:(save.dinner?.records??[]).map(r=>({id:r.eventId,afterTurn:r.turn,action:actionEvidence(r,lang).action})),observations:save.messages.flatMap(m=>{
    if(m.role!=='user')return [];
    turn++;
    const facts=[pick(l('发言面向在场所有人；走近不代表私聊。','Everyone present can hear; moving closer does not make it private.'),lang)];
    if(m.targetId){const person=scene.characters.find(c=>c.id===m.targetId)!;facts.push(pick(l(`指定回应对象：${person.name.zh}。`,`Selected addressee: ${person.name.en}.`),lang));}
    if(m.room)facts.push(pick(l(`发言时：${m.room.posture==='seated'?'坐着':'站着'}，${zones[m.room.zone].zh}。`,`While speaking: ${m.room.posture}, ${zones[m.room.zone].en}.`),lang));
    for(const record of m.dinner?.previous.filter(r=>r.turn===turn-1)??[]){const action=actionEvidence(record,lang);facts.push(pick(l(`这句之前完成的动作：${action.action}。`,`Action completed before this line: ${action.action}.`),lang));}
    return [{id:`spoken-${turn}`,turn,learnerQuote:m.text,facts}];
  })};
  return {scenario,messages,sceneContext};
}

export function buildDinnerReview(save:Save,id:string,now=Date.now()):Session {
  if(!save.messages.some(m=>m.role==='user'))throw new Error('No spoken learner evidence');
  return {id,...dinnerReviewContent(save),learnerCharacterId:'you',status:'ended',origin:'arena',objectiveDone:[],startedAt:now,endedAt:now,reflections:[],revealSeen:true};
}

export function matchesDinnerReview(session:Session,save:Save) {
  const content=dinnerReviewContent(save);
  return session.sceneContext?.kind==='3d'&&session.scenario.id===content.scenario.id&&JSON.stringify(session.messages)===JSON.stringify(content.messages)&&JSON.stringify(session.sceneContext)===JSON.stringify(content.sceneContext);
}

export function dinnerReplayUrl(context:SceneContext) {
  return `/3d?scene=${encodeURIComponent(context.sceneId)}&opening=${encodeURIComponent(context.openingId)}&restart=1`;
}

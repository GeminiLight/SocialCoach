import snapshot from '@/data/challenges/office-quick-favor-v1.json';
import type {Scenario} from '@/data/corpus/types';
import type {Lang} from '@/data/taxonomy';
import type {Session} from './types';
import {buildSession} from './session-utils';
import {pick} from './i18n';

export const CHALLENGE_ID = 'office-quick-favor';
export const CHALLENGE_VERSION = 1;
export type ChallengeRef = {id:typeof CHALLENGE_ID; version:1; lang:Lang};
export type InviteDestination = 'main' | 'studio';
const scene = snapshot as Scenario;

/** Published content is immutable. A changed setup needs a new version/file. */
export function challengeScene():Scenario { return structuredClone(scene); }
export function challengeRef(id:string,version:string,lang:string):ChallengeRef|null {
 return id===CHALLENGE_ID&&version==='v1'&&(lang==='zh'||lang==='en')?{id:CHALLENGE_ID,version:1,lang}:null;
}
export function challengePath(lang:Lang) { return `/challenge/${CHALLENGE_ID}/v1/${lang}`; }
export function challengeUrl(lang:Lang,destination:InviteDestination) {
 const path=challengePath(lang);
 if(destination==='main')return `https://socialcoach-ai.vercel.app${path}`;
 const url=new URL('https://modelscope.cn/studios/GeminiLight/SocialCoach');
 url.searchParams.set('mode','full');url.searchParams.set('app_path',path);return url.href;
}
export function inviteDestination(host:string):InviteDestination {
 return host==='geminilight-socialcoach.ms.show'?'studio':'main';
}
/** Only an approved public scene can offer this invitation. No session data is serialized. */
export function canInvite(session:Session) {
 return !session.sceneContext&&!session.scenario.custom&&session.scenario.id===CHALLENGE_ID&&session.scenario.source===scene.source;
}
export function challengePublic(lang:Lang) {
 const npc=scene.characters.find(c=>c.id===scene.opening.characterId)!;
 return {title:pick(scene.title,lang),opening:pick(scene.opening.text,lang),background:pick(scene.background,lang),role:pick(scene.characters.find(c=>c.playable)!.role,lang),npc:pick(npc.name,lang),npcRole:pick(npc.role,lang),objectives:scene.objectives.map(o=>pick(o,lang)),source:scene.source};
}
export const inviteCopy={
 question:{zh:'换你，这句话怎么接？',en:'How would you answer?'},
 label:{zh:'同一个开场，换你来回应',en:'Same opening. Your response.'},
 privacy:{zh:'只分享公共场景。你的对话、姓名和评分不会出现在邀请里。',en:'Only the public scene is shared. Your conversation, name and scores stay private.'},
 note:{zh:'同一版本的开场，后续由你的回应决定。各自的练习只保存在自己的设备上。',en:'The same version and opening; what follows depends on your response. Each practice stays on its own device.'},
};
export function invitationText(lang:Lang,destination:InviteDestination) {
 const p=challengePublic(lang);
 return ['SocialCoach · '+pick(inviteCopy.question,lang),`“${p.opening}”`,p.title,pick({zh:'来试试同一个场景，不用注册。',en:'Try the same scene. No sign-up needed.'},lang),challengeUrl(lang,destination)].join('\n\n');
}
export function buildChallengeSession(lang:Lang):Session {
 const scenario=challengeScene(),learnerCharacterId=scenario.characters.find(c=>c.playable)!.id;
 return {...buildSession(scenario,'arena',lang,{adaptation:{learnerCharacterId,briefing:pick(scenario.background,lang),objectives:scenario.objectives.map(o=>pick(o,lang)),focus:pick({zh:'先听清请求，再作出你愿意承担的选择。',en:'Understand the request, then choose what you can take on.'},lang)}}),challenge:{id:CHALLENGE_ID,version:CHALLENGE_VERSION,lang},timed:false};
}
export function pendingChallenge(sessions:Session[],lang:Lang) {
 return sessions.find(s=>s.challenge?.id===CHALLENGE_ID&&s.challenge.version===1&&s.challenge.lang===lang&&s.status!=='assessed');
}

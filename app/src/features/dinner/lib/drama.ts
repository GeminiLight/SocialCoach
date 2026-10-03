import {z} from 'zod';
import {l,pick,ui,type L,type Lang,type Scenario} from './content';
import {distance,PLAYER_HOME,roomContext,ZoneSchema,setLiftDoor,type World} from './room';
import {liftPanelFor,OFFICE_BOARD} from './spaces';
import {MAX_DINNER_TURNS} from './story';
export const EventIdSchema=z.enum(['work-toast','work-deadline','family-toast','family-phone','school-toast','school-photo','elevator-door','office-task','office-floor']);
export const ChoiceIdSchema=z.enum(['join','tea','hold','calendar','conditions','confirm','accept','decline','ally','group','credit','outside','hold-door','release-door','step-aside','inspect','request','board']);
export type EventId=z.infer<typeof EventIdSchema>;
export type ChoiceId=z.infer<typeof ChoiceIdSchema>;
type Choice={id:ChoiceId;label:L;movingLabel?:L;cupLabel?:L;line:L;cue:L;icon:'glass'|'tea'|'hand'|'phone'|'people'};
export type DinnerEvent={id:EventId;scene:Scenario['id'];turn:number;speaker:number;title:L;line:L;cue:L;nudge:L;choices:Choice[];kind:'toast'|'calendar'|'phone'|'photo'|'lift'|'document'};
const toastChoices=(scene:Scenario['id']):Choice[]=>[
  {id:'join',label:l('举杯跟上','Raise your glass'),movingLabel:l('回桌边，举杯跟上','Return to the table & raise your glass'),icon:'glass',line:scene==='work'?l('杯子举起来了就别光做样子。林总还看着呢。','Now your glass is up, don’t just make a gesture. Ms. Lin is watching.'):scene==='family'?l('这杯祝你今年有个好消息。联系方式我还是给你留着。','Here’s to good news this year. I’m still keeping that contact for you.'):l('这杯敬完，合照我就发了。带队这部分，你们都看见了。','After this toast, I’ll post the photo. You all saw what my leadership did.'),cue:l('杯子陆续抬起。你的杯子也进入了这一桌的视线。','Glasses rise one by one. Your glass joins the table’s attention.')},
  {id:'tea',label:l('用茶回应','Toast with tea'),movingLabel:l('回桌边，用茶回应','Return to the table & toast with tea'),icon:'tea',line:scene==='work'?l('茶也端来了？可我给你倒的这杯，真就一口不喝？','Tea as well? But not even one sip of the glass I poured you?'):scene==='family'?l('茶也行。可我说的这位，你还没听呢。','Tea is fine. But you haven’t heard about this person yet.'):l('喝茶也行。等会儿拍照，奖杯还放我这边。','Tea is fine. When we take the photo, the trophy stays by me.'),cue:l('你端起茶杯。同桌人放慢动作，有人看了一眼主位。','You lift your tea. The others slow down; someone glances toward the head of the table.')},
  {id:'hold',label:l('暂不举杯','Keep your cup down'),icon:'hand',line:scene==='work'?l('这一桌都举了。你是没听见，还是还有别的话？','Everyone else has raised theirs. Did you not hear, or do you have something to say?'):scene==='family'?l('连个祝福都不接？你到底是不想聊，还是已经有主意了？','You won’t even accept a good wish? Do you not want to talk, or have you made up your mind?'):l('你一直没举杯。对刚才的说法有意见，可以当着大家讲。','You haven’t raised yours. If you disagree with what I said, you can tell everyone.'),cue:l('你没有跟杯。旁边的人先把杯子放回桌上，主位仍在等你。','You leave your cup down. The others lower theirs first; the head of the table still waits.')}
];
export const dinnerEvents:DinnerEvent[]=[
 {id:'work-toast',scene:'work',turn:0,speaker:0,kind:'toast',title:l('这一杯，全桌都在等','This toast has an audience'),line:l('来，都举起来，先敬林总。你这杯不跟，是不是不给我面子？','Come on, everyone. A toast to Ms. Lin. If you won’t join, are you saying I don’t deserve your respect?'),cue:l('陈总先举杯。林姐跟上，小周迟疑片刻。三道目光最后落到你身上。','Mr. Chen raises his glass first. Ms. Lin follows; Zhou hesitates. Their attention ends on you.'),nudge:l('杯子还举着呢。就等你这一句。','My glass is still up. We’re waiting for your answer.'),choices:toastChoices('work')},
 {id:'work-deadline',scene:'work',turn:2,speaker:1,kind:'calendar',title:l('客户突然点你的名','The client puts you on the spot'),line:l('酒先放下。周三上线，你现在敢不敢给我一个准话？','Set the drinks down. Can you give me a definite answer about Wednesday’s launch?'),cue:l('林姐把杯子放下，转向你。陈总没有替你回答。','Ms. Lin sets down her glass and turns to you. Mr. Chen doesn’t answer for you.'),nudge:l('我这边也要报上线时间。周三到底赶不赶得上？','I have to report a launch date too. Can you make Wednesday or not?'),choices:[
 {id:'calendar',label:l('打开手机日程','Open your calendar'),movingLabel:l('回桌边，放杯看日程','Return to the table, set down cup & open calendar'),icon:'phone',line:l('周三我看到了。客户这边今天确认，你们还赶得上吗？','Wednesday, I see. If we confirm today, can your side still make it?'),cue:l('你拿出手机，亮起周三的日程。林姐低头看，陈总等你解释。','You open Wednesday’s calendar. Ms. Lin looks down; Mr. Chen waits for your explanation.')},
 {id:'conditions',label:l('抬手，正面谈条件','Raise a hand & discuss terms'),icon:'hand',line:l('那你说，哪项还卡着？今天要我们确认什么？','What’s blocked, then? What do you need us to confirm today?'),cue:l('你抬手示意回到交付话题。林姐把身体转向你，桌上安静下来。','You raise a hand to return to delivery. Ms. Lin turns toward you and the table falls quiet.')},
 {id:'confirm',label:l('示意陈总一起确认','Bring Mr. Chen into the answer'),icon:'people',line:l('陈总也在这儿。测试是你们做的，你觉得来得及吗？','Mr. Chen is here too. But you’re doing the testing. Can you make it?'),cue:l('你看向陈总。林姐的视线在你们之间停了一下。','You look toward Mr. Chen. Ms. Lin looks between you both.')}]},
 {id:'family-toast',scene:'family',turn:0,speaker:0,kind:'toast',title:l('祝福里，夹着一个追问','A question wrapped in a toast'),line:l('来，一起碰个杯，祝你今年有个好消息。你表妹都订婚了，你还想挑到什么时候？','Let’s raise a cup—to good news for you this year. Your cousin is engaged. How much longer are you going to be picky?'),cue:l('大姨端起杯子。妈妈跟上，爸爸慢半拍举起茶杯。','Your aunt raises a cup. Mom follows. Dad raises his tea a beat later.'),nudge:l('这杯我可还举着呢。照片先看看？','My cup is still up. Shall we look at the photo first?'),choices:toastChoices('family')},
 {id:'family-phone',scene:'family',turn:2,speaker:1,kind:'phone',title:l('手机递到了桌边','A phone comes across the table'),line:l('你先看看照片，又不是现在就让你结婚。加个联系方式，有那么难吗？','Just look at the photo. Nobody is asking you to marry today. Is adding a contact so difficult?'),cue:l('妈妈拿出手机，屏幕朝着你。大姨向前倾，爸爸的杯子停在半空。','Mom holds out her phone. Your aunt leans forward; Dad pauses with his cup.'),nudge:l('我举着手机呢。你看一眼，还是想先把话说清楚？','I’m holding the phone. Will you look, or do you want to say something first?'),choices:[
 {id:'accept',label:l('接过手机','Take the phone'),movingLabel:l('走近，接过手机','Walk over & take the phone'),cupLabel:l('放回杯子，再接手机','Set down cup & take the phone'),icon:'phone',line:l('手机拿着吧。条件我都替你问过了，你真不考虑？','Keep the phone a moment. I’ve asked about them for you. Won’t you consider it?'),cue:l('你接过妈妈递来的手机。大姨等你表态，爸爸放下茶杯。','You take the phone Mom offers. Your aunt waits for an answer; Dad lowers his tea.')},
 {id:'decline',label:l('摆手，暂不接手机','Gesture that you won’t take it'),icon:'hand',line:l('好，手机收回来。可妈妈问两句，你就这么不愿意听？','Fine, I’ll put it away. But you really don’t want to hear even a couple of questions from me?'),cue:l('你抬手示意暂不接。妈妈收回手机，大姨看向她。','You hold up your hand. Mom draws back her phone; your aunt looks at her.')},
 {id:'ally',label:l('看向爸爸，请他接话','Look to Dad to join in'),icon:'people',line:l('手机先收起来吧。要见也是孩子自己安排，别今天就定明天。','Put the phone away for now. Let them arrange it if they want to meet. Don’t book tomorrow for them.'),cue:l('你看向爸爸。他放下茶杯接话，妈妈的手机暂时收住。','You look toward Dad. He sets down his tea to speak; Mom pauses with the phone.')}]},
 {id:'school-toast',scene:'school',turn:0,speaker:0,kind:'toast',title:l('庆功杯，敬给谁','Whose win is this toast for?'),line:l('这个奖，主要还是我带得好。来，大家敬一杯，你们做执行也辛苦了。','My leadership really made this win happen. Let’s toast. You all worked hard on the execution too.'),cue:l('许学长把奖杯拉近，先举杯。小月和阿凯对视一下，才抬起自己的杯子。','Xu draws the trophy closer and raises his drink. Yue and Kai exchange a glance before following.'),nudge:l('别光坐着呀。这次怎么赢的，大家心里都有数。','Don’t just sit there. We all know how this win happened.'),choices:toastChoices('school')},
 {id:'school-photo',scene:'school',turn:2,speaker:0,kind:'photo',title:l('合照，还差一个位置','The photo leaves a place open'),line:l('来拍个照，奖杯放我这里。朋友圈我就写“带队拿下”，你们没意见吧？','Let’s take a photo. The trophy stays here. I’ll caption it “led the team to victory.” Everyone agrees?'),cue:l('许学长抬起手机。奖杯挡在他面前，小月和阿凯等你决定要不要入镜。','Xu raises his phone. The trophy is in front of him; Yue and Kai wait to see whether you join.'),nudge:l('镜头已经开了。要补充就现在说，别等我发完。','The camera is ready. Say what you want to add before I post it.'),choices:[
 {id:'group',label:l('示意大家一起入镜','Bring everyone into the photo'),movingLabel:l('回桌边，大家一起入镜','Return to the table & join the team photo'),icon:'people',line:l('照片可以一起拍。朋友圈怎么写，我带队这部分也不能省。','We can all be in the photo. But my leadership still needs to be in the caption.'),cue:l('你示意把镜头转向全桌。许学长把奖杯让到桌心，队友抬头入镜。','You gesture for a whole-table photo. Xu moves the trophy to the center; your teammates look up.')},
 {id:'credit',label:l('抬手，先谈贡献','Raise a hand to discuss credit'),icon:'hand',line:l('先说也行。不过汇报和联络都是我做的，这部分别漏了。','We can talk first. But I handled the presentation and the contacts. Don’t leave that out.'),cue:l('你抬手示意先停一下。手机降下来，阿凯转向你，奖杯留在原处。','You raise a hand. The phone lowers; Kai turns toward you. The trophy stays where it is.')},
 {id:'outside',label:l('摆手，暂不入镜','Stay out of the photo'),icon:'hand',line:l('你不拍，我还是会发。对那个文案有意见，现在就说。','If you won’t join, I’ll still post it. If you disagree with the caption, say so now.'),cue:l('你摆手没有跟上。许学长收住拍照的动作，小月看向你。','You wave it off. Xu pauses before taking the photo; Yue looks at you.')}]}
,
 {id:'elevator-door',scene:'elevator',turn:0,speaker:0,kind:'lift',title:l('电梯停着，话还没说完','The elevator is stopped'),line:l('电梯停在本层，你可以留在走廊继续说。','The elevator is stopped here. You can keep talking in the lobby.'),cue:l('电梯停在 12 楼，门口没有倒计时。','The car is stopped on floor 12. There is no countdown.'),nudge:l('按钮只控制门，不会替你回答问题。','The buttons control the doors, not your answer.'),choices:[
 {id:'hold-door',label:l('按开门键','Press Open'),movingLabel:l('走到按钮旁，按开门键','Walk to the panel & press Open'),icon:'hand',line:l('',''),cue:l('你按下开门键；电梯继续停在本层。','You press Open; the elevator remains on this floor.')},
 {id:'release-door',label:l('按关门键','Press Close'),movingLabel:l('走到按钮旁，按关门键','Walk to the panel & press Close'),icon:'hand',line:l('',''),cue:l('你按下关门键；门口有人时，门会重新打开。','You press Close; the doors reopen if someone is in the doorway.')},
 {id:'step-aside',label:l('走到走廊旁','Step aside'),movingLabel:l('走到走廊旁','Step aside'),icon:'people',line:l('',''),cue:l('你站到走廊旁，其他人仍能听见。','You stand to one side of the corridor. The others can still hear you.')}]},
 ...(['office-task','office-floor'] as const).map(id=>({id,scene:'office' as const,turn:0,speaker:id==='office-task'?0:1,kind:'document' as const,title:id==='office-task'?l('三项任务，还没分给谁','Three tasks, still unassigned'):l('你的发言，被接走了','Your speaking slot was interrupted'),line:l('可以先看资料，也可以直接把话接回来。','Read the notes or speak directly.'),cue:id==='office-task'?l('任务资料放在你的工位上，白板留着讨论的位置。','The task notes are at your workstation; the board is available for discussion.'):l('会议资料放在工位上，白板上的方案仍待决定。','Meeting notes are at the workstation. The proposal is still undecided.'),nudge:l('查看资料不等于接任务，举手也不会自动获得发言权。','Reading is not taking the task. Raising a hand does not automatically grant the floor.'),choices:[
 {id:'inspect' as const,label:l('查看现场资料','Read the notes'),movingLabel:l('回工位，查看资料','Return to your workstation & read'),icon:'phone' as const,line:l('',''),cue:l('你打开开局资料，内容仍是未确认的版本。','You read the opening notes; they remain unconfirmed.')},
 {id:'request' as const,label:l('抬手示意，准备开口','Raise a hand'),icon:'hand' as const,line:l('',''),cue:l('你抬手示意准备开口。别人是否让出发言权，还需要说清楚。','You raise a hand to speak. Whether others give you the floor remains unresolved.')},
 {id:'board' as const,label:l('走到白板旁','Walk to the whiteboard'),movingLabel:l('走到白板旁','Walk to the whiteboard'),icon:'people' as const,line:l('',''),cue:l('你走到白板旁。资料与分工没有因此改变。','You stand beside the board. The notes and assignments have not changed.')}] })),
];
const RecordSchema=z.object({eventId:EventIdSchema,choice:ChoiceIdSchema,turn:z.number().int().min(0).max(MAX_DINNER_TURNS),posture:z.enum(['seated','standing']),zone:ZoneSchema,silent:z.boolean().optional()}).refine(r=>{const scene=dinnerEvents.find(e=>e.id===r.eventId)!.scene;return scene==='elevator'?r.posture==='standing'&&['lobby','cabin','door'].includes(r.zone):scene==='office'?['desk','board','side','door'].includes(r.zone):['table','side','door'].includes(r.zone);},'Action position belongs to another room');
export const DramaSaveSchema=z.object({active:EventIdSchema.optional(),phase:z.enum(['waiting','reacting','settled']),elapsed:z.number().finite().min(0).max(30),responseAt:z.number().finite().min(0).max(30).optional(),choice:ChoiceIdSchema.optional(),pending:ChoiceIdSchema.optional(),seen:z.array(EventIdSchema).max(2),records:z.array(RecordSchema).max(2),paused:z.boolean(),inventory:z.enum(['none','glass','tea','phone'])}).superRefine((s,c)=>{
  if(new Set(s.seen).size!==s.seen.length||new Set(s.records.map(r=>r.eventId)).size!==s.records.length)c.addIssue({code:'custom',message:'Duplicate dinner event'});
  if(s.active&&!s.seen.includes(s.active))c.addIssue({code:'custom',message:'Active event must have started'});
  if(s.choice&&s.pending||s.phase==='waiting'&&s.choice||s.phase==='reacting'&&!s.choice||s.pending&&s.phase!=='waiting'||!s.active&&s.phase!=='settled')c.addIssue({code:'custom',message:'Inconsistent dinner phase'});
  if(s.choice&&!s.records.some(r=>r.eventId===s.active&&r.choice===s.choice))c.addIssue({code:'custom',message:'Action needs observed evidence'});
  if((s.choice||s.pending)&&(!s.active||!dinnerEvents.find(e=>e.id===s.active)!.choices.some(a=>a.id===(s.pending??s.choice))))c.addIssue({code:'custom',message:'Invalid event action'});
  if(s.records.some(r=>!s.seen.includes(r.eventId)||!dinnerEvents.find(e=>e.id===r.eventId)!.choices.some(a=>a.id===r.choice)))c.addIssue({code:'custom',message:'Invalid action evidence'});
});
export type Drama=z.infer<typeof DramaSaveSchema>;
export const DinnerContextSchema=z.object({eventId:EventIdSchema,phase:z.enum(['waiting','reacting','settled']),choice:ChoiceIdSchema.optional(),previous:z.array(RecordSchema).max(2)});
export type DinnerContext=z.infer<typeof DinnerContextSchema>;
export function validDinnerContext(context:DinnerContext,scene:Scenario['id']){const event=dinnerEvents.find(e=>e.id===context.eventId)!;return event.scene===scene&&!(context.phase==='waiting'&&context.choice)&&!(context.phase==='reacting'&&!context.choice)&&(!context.choice||event.choices.some(c=>c.id===context.choice)&&context.previous.some(r=>r.eventId===context.eventId&&r.choice===context.choice))&&context.previous.every(r=>dinnerEvents.some(e=>e.id===r.eventId&&e.scene===scene&&e.choices.some(c=>c.id===r.choice)))&&new Set(context.previous.map(r=>r.eventId)).size===context.previous.length;}
export const createDrama=(saved?:Drama):Drama=>saved?structuredClone(saved):{phase:'settled',elapsed:0,seen:[],records:[],paused:false,inventory:'none'};
export const snapshotDrama=(d:Drama):Drama=>structuredClone(d);
/** Animation time stays mutable; React only needs actual controls / label changes. */
export function dramaUiKey(d:Drama,scene:Scenario['id']) {
  const pose=d.phase==='reacting'?(d.elapsed<.8?'raising':d.elapsed<2.5?'holding':'lowering'):d.elapsed>=12?'waiting-long':'waiting';
  const labels=[0,1,2].map(index=>{const beat=actorBeat(d,index,scene);return [beat.raise>.25,beat.phone>.2];});
  const {elapsed:ignored,...state}=d;void ignored;
  return JSON.stringify([state,pose,labels]);
}
export const activeEvent=(d:Drama)=>dinnerEvents.find(e=>e.id===d.active);
export function syncDrama(d:Drama,scene:Scenario,turn:number,started:boolean,complete:boolean,options:{openingEvent?:EventId|null;requestedEvent?:EventId}={}){
  if(!started||complete||d.phase!=='settled')return;
  const id=turn===0?(options.openingEvent===undefined?dinnerEvents.find(e=>e.scene===scene.id&&e.turn===0)?.id:options.openingEvent):options.requestedEvent;
  const next=dinnerEvents.find(e=>e.id===id&&e.scene===scene.id&&e.turn<=turn&&!d.seen.includes(e.id));if(!next)return;
  d.active=next.id;d.seen.push(next.id);d.elapsed=0;d.phase='waiting';d.choice=undefined;d.pending=undefined;d.responseAt=undefined;d.paused=false;
}
export function stepDrama(d:Drama,dt:number,paused:boolean){if(paused||d.paused||d.phase==='settled')return;d.elapsed=Math.min(30,d.elapsed+Math.min(.05,Math.max(0,dt)));if(d.phase==='reacting'&&d.elapsed>=4.6)d.phase='settled';}
export function choiceDestination(id:ChoiceId,world:World){
 if(id==='hold-door'||id==='release-door')return liftPanelFor(world.player);
 if(id==='step-aside')return {x:-3.3,z:2.65};
 if(id==='board')return OFFICE_BOARD;
 if(id==='inspect')return world.player.home;
}
export function readyForChoice(d:Drama,id:ChoiceId,world:World){
  const destination=choiceDestination(id,world);if(destination)return distance(world.player,destination)<.4;

  if((id==='join'||id==='tea')&&d.inventory==='none')return distance(world.player,PLAYER_HOME)<1.2;
  if(id==='calendar'&&(d.inventory==='glass'||d.inventory==='tea'))return distance(world.player,PLAYER_HOME)<1.2;
  if(id==='group')return distance(world.player,PLAYER_HOME)<1.2;
  if(id==='accept')return d.inventory!=='glass'&&d.inventory!=='tea'&&distance(world.player,world.npcs[1])<2.2;
  return true;
}
export function chooseDrama(d:Drama,id:ChoiceId,world:World,turn:number){
  const event=activeEvent(d);if(!event||d.phase!=='waiting'||d.choice||!event.choices.some(c=>c.id===id)||!readyForChoice(d,id,world))return false;
  d.choice=id;d.pending=undefined;d.phase='reacting';d.responseAt=d.elapsed;d.elapsed=0;d.paused=false;
  if(id==='join')d.inventory='glass';else if(id==='tea')d.inventory='tea';else if(id==='calendar'||id==='accept')d.inventory='phone';else if(id==='conditions'&&distance(world.player,PLAYER_HOME)<1.2)d.inventory='none';
  if(id==='hold-door'||id==='release-door')setLiftDoor(world,id==='hold-door'?'open':'closed');
  d.records.push({eventId:event.id,choice:id,turn,silent:true,posture:world.player.seated?'seated':'standing',zone:roomContext(world).zone});return true;
}
export function settleForSpeech(d:Drama){d.phase='settled';d.pending=undefined;d.choice=undefined;d.responseAt=undefined;d.elapsed=0;}
export function dinnerContext(d:Drama):DinnerContext|undefined{return d.active?{eventId:d.active,phase:d.phase,choice:d.choice,previous:structuredClone(d.records)}:undefined;}
export function eventDialogue(d:Drama,lang:Lang){const event=activeEvent(d);if(!event||d.phase==='settled'&&!d.choice||d.records.some(r=>r.eventId===d.active&&r.choice===d.choice&&r.silent))return;const choice=event.choices.find(c=>c.id===d.choice);return {speaker:event.scene==='family'&&d.choice==='ally'?2:event.speaker,text:pick(choice?.line??event.line,lang),cue:pick(choice?.cue??event.cue,lang)};}
export function actionEvidence(record:Drama['records'][number],lang:Lang){const event=dinnerEvents.find(e=>e.id===record.eventId)!,choice=event.choices.find(c=>c.id===record.choice)!;return {title:pick(event.title,lang),action:pick(choice.label,lang),reply:record.silent?undefined:pick(choice.line,lang),cue:pick(choice.cue,lang),speaker:event.scene==='family'&&choice.id==='ally'?2:event.speaker};}
const ease=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
const waitingRaise=(elapsed:number,index:number)=>{
 const delay=index===0?0:index===1?.65:1.45,lowerAt=index===0?8.5:index===1?5.2:6.2;
 return ease((elapsed-delay)/.65)*(1-ease((elapsed-lowerAt)/1.1));
};
export function actorBeat(d:Drama,index:number,scene:Scenario['id']){
  const event=activeEvent(d),toast=event?.kind==='toast'&&d.phase!=='settled';
  const lead=index===0,delay=index===0?0:index===1?.65:1.45;
  const initial=waitingRaise(d.responseAt??2.2,index);
  let raise=toast?d.phase==='waiting'?waitingRaise(d.elapsed,index):d.choice==='hold'?initial:initial+(1-initial)*ease((d.elapsed-delay)/.65):0;
  if(d.phase==='reacting'&&toast){const drop=d.choice==='hold'?(lead?3:.9):d.choice==='tea'?(lead?2.4:1.8):3.1;raise*=1-ease((d.elapsed-drop)/.8);}
  if(event?.kind==='phone'&&index===2&&d.phase!=='settled')raise=.7*ease((d.elapsed+(d.phase==='reacting'?(d.responseAt??1):0))/.6)*(d.phase==='reacting'?1-ease(d.elapsed/.9):1);
  const sip=toast&&d.phase==='reacting'&&d.choice!=='hold'?Math.sin(Math.PI*ease((d.elapsed-1.6-index*.15)/1.1))*.55:0;
  const phone=event?.kind==='phone'&&index===1&&d.phase!=='settled'?(d.choice?ease((d.elapsed+(d.responseAt??1))/.7)*(1-ease((d.elapsed-.45)/.7)):ease(d.elapsed/.7)):event?.kind==='photo'&&index===0&&d.phase!=='settled'?(d.choice==='group'?1-ease((d.elapsed-2.5)/.8):d.choice?1-ease(d.elapsed/.7):ease(d.elapsed/.7)):0;
  const gaze=toast&&d.phase==='waiting'&&index>0&&d.elapsed<2.4?0:event?.kind==='phone'&&d.choice==='ally'?2:event?.kind==='photo'&&d.choice==='group'?0:-1;
  return {raise,sip,phone,gaze,glass:(scene==='work'||scene==='school')&&index===0};
}
export function playerBeat(d:Drama){const raising=d.phase==='reacting'&&(d.choice==='join'||d.choice==='tea');return {raise:raising?ease(d.elapsed/.65)*(1-ease((d.elapsed-3)/.9)):0,palm:d.phase==='reacting'&&['hold','conditions','decline','credit','outside','request','hold-door','release-door'].includes(d.choice??'')?ease(d.elapsed/.5)*(1-ease((d.elapsed-2.5)/.7)):0,phone:d.inventory==='phone'?d.phase==='reacting'?ease(d.elapsed/.8):.25:0};}
export function trophyPosition(d:Drama){if(d.records.some(r=>r.eventId==='school-photo'&&r.choice==='group'))return {x:0,z:0};return {x:0,z:d.active?-1.85:-.75};}

export function actorActionLabel(d:Drama,index:number,scene:Scenario['id'],lang:Lang){const beat=actorBeat(d,index,scene);return beat.phone>.2?pick(ui[d.active==='school-photo'?'photoAction':'phoneAction'],lang):undefined;}

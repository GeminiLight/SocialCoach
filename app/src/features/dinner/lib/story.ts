import { z } from 'zod';
import { l, pick, type L, type Lang, type Scenario } from './content';

export const MAX_DINNER_TURNS = 24;
export const DEFAULT_DINNER_TURNS = 12;
export const DinnerLengthSchema = z.number().int().min(4).max(MAX_DINNER_TURNS);
export const VariantIdSchema = z.enum(['work-toast', 'work-deadline', 'family-introduction', 'family-privacy', 'school-credit', 'school-workload','elevator-privacy','elevator-blame','office-overtime','office-interruption']);
export type VariantId = z.infer<typeof VariantIdSchema>;
export type TopicId = 'toast' | 'scope' | 'deadline' | 'introduction' | 'privacy' | 'autonomy' | 'credit' | 'evidence' | 'workload' | 'responsibility' | 'speaking';
export const TopicIdSchema = z.enum(['toast', 'scope', 'deadline', 'introduction', 'privacy', 'autonomy', 'credit', 'evidence', 'workload','responsibility','speaking']);
export const StoryBeatSchema = z.object({ topic: TopicIdSchema, event: z.enum(['work-toast', 'work-deadline', 'family-toast', 'family-phone', 'school-toast', 'school-photo','elevator-door','office-task','office-floor']).optional(), beat:z.string().min(1).max(30).optional() });
export type StoryBeat = z.infer<typeof StoryBeatSchema>;
export type StoryVariant = { id: VariantId; scene: Scenario['id']; title: L; setup: L; goal: L; opening: L; speaker: number; topic: TopicId; openingEvent?: StoryBeat['event']; events: StoryBeat['event'][] };

// Original fictional situations, not advice or sourced claims about real people.
export const variants: StoryVariant[] = [
  { id:'work-toast', scene:'work', title:l('敬酒之后，还得谈交付','A toast, then the delivery'), setup:l('陈总拿不喝酒说事，林姐还带着上线问题。你可以拒绝、解释、问清需求，或请同事补充。','Chen makes the drink a test of respect; Lin has launch questions. Refuse, explain, ask about scope, or bring in your teammate.'), goal:l('守住不喝酒的边界，并把交付条件讲清楚。','Keep your drinking boundary and establish the delivery conditions.'), opening:l('来，敬林总。大家都举杯了，就等你了。你这杯不跟，是不给我面子？','A toast to Ms. Lin. Everyone has a cup up—we’re waiting for you. You won’t join?'), speaker:0, topic:'toast', openingEvent:'work-toast', events:['work-toast','work-deadline'] },
  { id:'work-deadline', scene:'work', title:l('领导已经替你答应了','Your boss has already promised'), setup:l('陈总当着客户保证周三上线。测试还有两项未通过，新增报表也没确认范围。','Chen promised a Wednesday launch to the client. Two tests are failing; a new report has no agreed scope.'), goal:l('把口头保证拆成范围、验收与负责人，不接下无法保证的日期。','Separate scope, acceptance and ownership; do not take on a date you cannot guarantee.'), opening:l('林总，周三肯定上线。你当着林总再确认一句：没问题，对吧？','Ms. Lin, Wednesday is definite. Tell her yourself: no problem with your part, right?'), speaker:0, topic:'deadline', events:['work-deadline'] },
  { id:'family-introduction', scene:'family', title:l('看照片，就算答应了吗','Does looking mean agreeing?'), setup:l('大姨带来一位相亲对象，妈妈想让你加联系方式。看照片、加好友、见面是三件不同的事。','Your aunt has an introduction; Mom wants you to add a contact. Looking, adding and meeting are three different decisions.'), goal:l('说清自己愿意和不愿意做什么，不让别人替你安排。','Say what you do and do not agree to, without letting others arrange it for you.'), opening:l('你表妹都订婚了。今天把照片看了、联系方式加了，别又说“以后再说”。','Your cousin is engaged. Look at the photo and add the contact today. Don’t give me another “maybe later.”'), speaker:0, topic:'introduction', openingEvent:'family-toast', events:['family-toast','family-phone'] },
  { id:'family-privacy', scene:'family', title:l('妈妈把你的近况告诉了大姨','Mom shared your news with your aunt'), setup:l('妈妈把你工作变动的消息发给了大姨，没有先问你。饭桌上的追问越来越细。','Mom told your aunt about a change at work without asking you. The questions at dinner are getting personal.'), goal:l('确定哪些信息能分享、谁可以转述，以及这次怎样补救。','Agree what may be shared, who can share it, and how to address this disclosure.'), opening:l('工作变动你妈都告诉我了。工资变没变？这桌又没外人，你还瞒着？','Your mom told me about the work change. Did your pay change? We’re all family here. Why hide it?'), speaker:0, topic:'privacy', events:[] },
  { id:'school-credit', scene:'school', title:l('合照文案，功劳归谁','Who gets named in the caption?'), setup:l('许学长准备发布获奖合照。代码、设计、汇报确实由不同的人完成，文案还没有发出去。','Xu is preparing the award photo. Code, design and presentation had different contributors; the caption has not been posted.'), goal:l('谈成准确的贡献表述，并确认由谁修改、何时一起核对。','Agree an accurate credit statement, who will edit it and when everyone will check it.'), opening:l('这个奖主要靠我带队。合照就写“队友负责执行”，没意见吧？','My leadership made this win. I’ll caption the photo “the teammates handled execution.” No objections?'), speaker:0, topic:'credit', openingEvent:'school-toast', events:['school-toast','school-photo'] },
  { id:'school-workload', scene:'school', title:l('庆功还没完，活又落给你','More work before dinner is over'), setup:l('许学长想把周五展示的演示、海报和答辩准备都交给你。小月与阿凯还没有答应分工。','Xu wants you to handle Friday’s demo, poster and Q&A preparation. Yue and Kai have not agreed to any assignments.'), goal:l('把新增任务、时间与分工谈清楚，也让每个人自己确认。','Clarify the extra work, timing and ownership, with each person confirming their part.'), opening:l('庆功归庆功，周五还得上。你代码最熟，演示、海报、答辩都给你，定了啊？','Celebration’s over; Friday’s showcase is next. You know the code—demo, poster and Q&A all go to you. Settled?'), speaker:0, topic:'workload', events:[] },
  {id:'elevator-privacy',scene:'elevator',title:l('HR 的谈话，要当众交代？','Explain your HR conversation in public?'),setup:l('方经理在电梯口追问你与 HR 的谈话。乔宁、程悦都在旁边，没人知道谈话内容。','Fang asks about your HR conversation in front of Qiao and Cheng. Nobody knows what was discussed.'),goal:l('守住私下谈话的边界，把工作安排与猜测分开。','Protect a private conversation and separate work arrangements from guesses.'),opening:l('刚从 HR 出来？是不是准备走了？乔宁也在，一起说说，省得大家猜。','Just out of HR? Planning to leave? Qiao’s here too. Tell us, so we don’t have to guess.'),speaker:0,topic:'privacy',openingEvent:'elevator-door',events:['elevator-door']},
  {id:'elevator-blame',scene:'elevator',title:l('原因没查，先让你认错','Take the blame before the facts are checked'),setup:l('演示账号打不开，会议提前结束。方经理想立即向上报“交接疏漏”，日志和权限还未核对。','The demo account would not open and the meeting ended early. Fang wants to report a handoff error, before logs or permissions have been checked.'),goal:l('先核对事实与责任，不接下没有证据的归因。','Check facts and responsibility before accepting an unsupported cause.'),opening:l('演示砸了，报告怎么写？就写你交接没核对。你先认一下，我好交代。','The demo failed. I’ll report that you missed the handoff checks. Admit it now so I have an answer.'),speaker:0,topic:'responsibility',openingEvent:'elevator-door',events:['elevator-door']},
  {id:'office-overtime',scene:'office',title:l('下班前，三件活都归你','Three tasks before you leave'),setup:l('17:50，客户想在 18:30 收到材料。数据核对、排版和最终检查还没分工，主管一句“顺手”全压给你。','It’s 17:50; the client wants material at 18:30. Data, layout and final checks are unassigned. Your lead calls it a quick favor for you.'),goal:l('说清能做的部分，并确认优先级、负责人和可交范围。','State what you can do and confirm priorities, owners and deliverable scope.'),opening:l('还有四十分钟。数据、排版、检查你一起收尾吧，我六点半要发给客户。','Forty minutes left. Finish the data, layout and checks. I need to send it to the client at 6:30.'),speaker:0,topic:'workload',openingEvent:'office-task',events:['office-task']},
  {id:'office-interruption',scene:'office',title:l('你还没讲完，别人替你总结了','Interrupted before you reach the point'),setup:l('办公室短会轮到你讲方案。宁姐打断，何主管想快点作决定；关键风险和数据还没有听完。','It’s your turn to present at a short office meeting. Ning interrupts; He wants a quick decision. The key risk and data have not been heard.'),goal:l('拿回一段明确的发言时间，说完关键点并确认下一步。','Secure a clear speaking slot, finish the key point and confirm a next step.'),opening:l('你先停一下。就按我的方案吧，你的细节大家应该都懂了，别耽误时间。','Stop there. Let’s use my proposal. Everyone probably gets your details already—don’t hold us up.'),speaker:1,topic:'speaking',openingEvent:'office-floor',events:['office-floor']},
];

export function variantFor(scene: Scenario['id'], id?: string): StoryVariant {
  return variants.find(v => v.scene === scene && v.id === id) ?? variants.find(v => v.scene === scene)!;
}
export function isSceneVariant(scene: Scenario['id'], id: VariantId) { return variants.some(v => v.id === id && v.scene === scene); }
export function nextDinnerLimit(current: number) { return Math.min(MAX_DINNER_TURNS, current + 6); }

export const topicLabels: Record<TopicId,L> = {
  toast:l('这杯酒','The drink'), scope:l('需求范围','Scope'), deadline:l('上线条件','Launch conditions'), introduction:l('介绍与见面','The introduction'), privacy:l('信息边界','Privacy'), autonomy:l('由谁做决定','Who decides'), credit:l('贡献表述','Credit'), evidence:l('核对与发布','Review and publication'), workload:l('任务与分工','Work and ownership'),responsibility:l('事实与责任','Facts and responsibility'),speaking:l('发言与决定','Speaking and decisions'),
};
export const sceneTopics: Record<Scenario['id'], TopicId[]> = {work:['toast','scope','deadline'],family:['introduction','privacy','autonomy'],school:['credit','evidence','workload'],elevator:['privacy','responsibility','autonomy'],office:['workload','speaking','autonomy']};

export const sceneFacts: Record<Scenario['id'],L[]> = {
  work:[l('林姐是客户负责人；小周是同组测试同事；陈总是领导。三人没有互相替对方承诺的权限。','Lin represents the client, Zhou is a testing teammate, Chen is the boss. None can make commitments on the others’ behalf.'),l('周三是陈总向客户提出的上线目标，不是已经验证能完成的事实。测试还有两项没通过；未确认的新报表不自动包含在原范围。','Wednesday is Chen’s proposed launch target, not a verified delivery date. Two tests are failing; an unconfirmed new report is not automatically in scope.'),l('用户是否喝酒、为什么不喝、已经完成哪些工作，只能从这局的用户发言和动作中确认。','Whether the player drinks, why they refuse, and their completed work can only come from their words and actions in this session.')],
  family:[l('相亲对象是虚构且未具名的人。没有任何已约定的见面、加好友或婚期。看照片不等于同意，亲戚的提议不等于用户的承诺。','The proposed match is fictional and unnamed. No meeting, contact or wedding date is agreed. Looking is not consent; a relative’s proposal is not the player’s promise.'),l('用户的性别、伴侣、年龄、工资和工作细节未给出时都未知，不得编造。家庭隐私开局只确认妈妈把“工作有变动”转给大姨，其余未确认。','Gender, partner, age, pay and work details are unknown unless supplied. In the privacy opening, only Mom’s disclosure of “a change at work” is established.'),l('爸爸能表态或要求停下，但不能替妈妈、大姨或用户承诺。妈妈担心近况；大姨重视亲戚间的信息往来。','Dad can take a position or ask for a pause, but cannot commit for Mom, Aunt or the player. Mom worries about their situation; Aunt values sharing within the family.')],
  school:[l('许学长负责汇报和联络，小月做设计，用户与阿凯做代码。代码贡献有提交记录；不要编造具体比例、提交次数或导师的决定。','Xu handled presentation and contacts; Yue did design; the player and Kai worked on code. Commits exist; do not invent percentages, commit counts or a supervisor’s decision.'),l('合照与总结尚未发布，除非对话中确实完成确认。一起拍照不等于接受文案。','The photo and write-up remain unpublished unless the conversation establishes otherwise. Joining a photo does not approve its caption.'),l('追加任务开局中，周五是下一场展示；演示、海报、答辩尚未分工。每位队友要亲自确认时间和任务。','In the extra-work opening, the next showcase is Friday. Demo, poster and Q&A are unassigned. Each teammate must confirm their own task and availability.')],
  elevator:[l('电梯停在 12 楼，没有行驶或倒计时。三人都在等候区，说话能被其他人听见；走近或关门不会使谈话自动私密。','The elevator is stopped on floor 12, with no ride or countdown. All three are waiting nearby; walking closer or closing doors does not make a conversation private.'),l('方经理只管理部门工作，乔宁只知道自己经手的材料，程悦来自另一组。不得替 HR、上级或不在场的人作决定。','Fang manages the department; Qiao knows their handoff material; Cheng is from another team. Nobody speaks for HR, absent leaders or others.')],
  office:[l('何主管管理项目；宁姐负责排版与讲解；瑞瑞能核对数据来源。任何人的剩余时间、加班意愿与任务承诺都需要本人确认。','He leads the project; Ning handles layout and presentation; Rui can check data sources. Each person must confirm their own availability, overtime and tasks.'),l('现场资料是开局版本，不能因查看或走到白板旁而自动修改。抬手不等于别人已经同意让出发言权。','Documents show the opening state. Reading or approaching the board does not edit them. Raising a hand does not mean others granted the floor.')],
};

export const characterAgendas: Record<Scenario['id'],L[]> = {
  work:[l('陈总想保住对客户的承诺和席间权威。可以接受有限范围或补充验证，但要求具体安排；不能用健康理由继续逼酒，也不能因一句客气话就保证交付。','Chen wants to protect his promise and authority. He may accept limited scope or verification with concrete arrangements. Do not pressure drinking against a health restriction or guarantee delivery because of politeness.'),l('林姐要一个能汇报的日期和可验收范围。收到具体条件后追问优先级、谁确认和下一次检查，不反复问同一句。','Lin needs a reportable date and testable scope. Given conditions, ask about priorities, decision owners and the next check instead of repeating the same question.'),l('小周只对自己参与的测试作证。被点名时给具体进度、限制或可核对资料，不自动同意背下全部工作。','Zhou can attest only to testing they worked on. When addressed, give concrete status, limits or verifiable material, without taking on all the work.')],
  family:[l('大姨会把拒绝理解为疏远，但如果用户说清具体边界，她可以不认同却停止这次追问。不能无限重复劝相亲或强行替用户同意。','Aunt may read refusal as distance. With a specific boundary she can disagree but stop this inquiry. Do not loop on matchmaking or agree on the player’s behalf.'),l('妈妈想知道近况，担心被排除。她可承认转述过信息，同时追问以后怎样关心；不得把含糊应声当成授权。','Mom wants updates and fears being excluded. She may acknowledge sharing information and ask how to stay involved. An ambiguous response is not permission.'),l('爸爸偏向尽快吃饭，不必总当盟友。被请求时可澄清争议或提议暂停，不能一开口就让另外两人全部让步。','Dad wants dinner to continue and is not always an ally. He can clarify or propose a pause, but cannot make the other two concede automatically.')],
  school:[l('许学长重视带队身份和对外发言权。可承认具体代码、设计贡献，但会争取保留自己的汇报职责；不能凭一段好听的话承诺公平。','Xu values the captain role and public voice. He may acknowledge concrete code and design contributions while keeping presentation duties; pleasant wording alone is not enough.'),l('小月希望设计被准确写出，不愿再次被分配全部海报修改。她的支持需要具体写法和边界。','Yue wants design named accurately and does not want every poster revision assigned to her. Support depends on concrete wording and limits.'),l('阿凯能核对代码和演示，避免争执但有时间限制。被点名时回答自己的贡献或任务，不替全队签字。','Kai can check code and demos, avoids conflict and has time limits. Answer about their own work without approving for the whole team.')],
  elevator:[l('方经理需要尽快向上汇报。遇到拒绝会追问替代口径，但不能把猜测说成事实，不因一句客气话就撤回关切。','Fang needs a quick report upward. Push for an alternative account after refusal, without asserting guesses as facts or dropping concerns due to politeness.'),l('乔宁愿意核对自己经手的材料，但不想背下全部事故，也不传播没有听过的 HR 谈话。','Qiao may check the material they handled, but will not own the entire incident or repeat an HR conversation they never heard.'),l('程悦不想参与传闻。被点名时说明所见范围，不做自动支持用户的裁判。','Cheng wants to avoid rumors. When addressed, state what they actually saw without becoming an automatic referee for the player.')],
  office:[l('何主管要具体的交付或决定。允许调整范围，但需要负责人和下一次检查，不能仅因礼貌就让所有任务消失。','He needs a concrete delivery or decision. Scope can change with owners and a next check; politeness does not make all tasks disappear.'),l('宁姐认为自己熟悉方案，担心拖延。让出发言权需明确时长与要点；只对自己的排版或讲解负责，不替全组同意。','Ning thinks she knows the proposal and worries about delay. A speaking slot needs a duration and purpose; she commits only to her own layout or presentation.'),l('瑞瑞担心未经核对的数据被发给客户。可说明来源、限制和自己所需时间，不突然承担所有任务或编造已确认数据。','Rui worries unchecked data will reach the client. Explain sources, limits and their own time needs without taking every task or inventing verified data.')],
};

export function storyScenario(base: Scenario, variant: StoryVariant): Scenario {
  const characters=variant.id==='family-privacy'?base.characters.map((c,i)=>({...c,description:[l('听妈妈提到了你的工作变动，觉得亲戚之间问细一点很正常。','Mom mentioned a change at work. Your aunt thinks detailed questions are normal among relatives.'),l('没有先问你，就把工作变动的消息告诉了大姨。','Told your aunt about the work change without asking you first.'),l('一直在听，想让这一桌先把争议说清楚。','Listening, and hoping the table can clarify the disagreement.')][i]})):base.characters;
  return {...base,time:variant.id==='office-interruption'?'14:20':base.time,characters,title:variant.title,subtitle:variant.setup,goal:variant.goal,opening:variant.opening,openingCue:l(`${base.characters[variant.speaker].name.zh}朝你看过来，等你接话。`,`${base.characters[variant.speaker].name.en} looks toward you and waits.`),source:{...base.source,title:l(`原创虚构剧情：${variant.title.zh}`,`Original fiction: ${variant.title.en}`),path:base.space?'wiki/archive/specs/spec-3d-places.md#fiction':'wiki/archive/specs/spec-3d-story-continuity.md#fiction'}};
}

/** Separate optional openings so a family introduction cannot invent a change at work. */
export function factsForVariant(variant:StoryVariant,lang:Lang):string[] {
 const facts=sceneFacts[variant.scene].map(f=>pick(f,lang));
 if(variant.scene==='family')facts[1]=pick(l('用户的性别、伴侣、年龄、工资和工作细节都未知。未在当前开局或用户发言中出现的个人经历，不得编造。','Gender, partner, age, pay and work details are unknown. Do not invent personal history absent from this opening or the player’s statements.'),lang);
 if(variant.scene==='school'&&variant.id!=='school-workload')facts.pop();
 if(variant.scene==='work')facts.push(pick(l('两项失败测试具体为：退款回调偶发超时、批量导入权限丢失。它们尚未复测通过，影响不能由席间口头保证排除。除此以外不要编造合同条款、签字制度或已批准的延期日期。','The two failing checks are intermittent refund callback timeouts and lost permissions during batch import. Neither has passed retesting; impact cannot be ruled out by a verbal assurance. Do not invent contract clauses, signature requirements or approved delays.'),lang));
 if(variant.id==='family-privacy')facts.push(pick(l('此开局只确认妈妈转述了“工作有变动”，没有相亲安排，也没有已知工资数字。','This opening establishes only that Mom shared “a change at work.” There is no matchmaking arrangement or known pay figure.'),lang));
 if(variant.id==='elevator-privacy')facts.push(pick(l('只确认你从 HR 办公室出来，谈话内容未知，离职是方经理的猜测。工资、岗位、去向和个人经历都未知；本开局没有演示事故。','Only your exit from HR is established. The conversation is unknown; leaving is Fang’s guess. Pay, role, destination and personal history are unknown. No demo incident exists in this opening.'),lang));
 if(variant.id==='elevator-blame')facts.push(pick(l('会议上演示账号无法打开，会议提前结束。乔宁交接了演示链接与账号操作说明；完整性、账号日志、权限和故障原因均未核对。没有证据证明用户疏漏，也没有本开局的 HR 谈话。','The demo account would not open; the meeting ended early. Qiao handed over the demo link and account instructions only. Completeness, logs, permissions and cause remain unchecked. No evidence establishes the player’s fault; no HR conversation exists in this opening.'),lang));
 if(variant.id==='office-overtime')facts.push(pick(l('现在 17:50，客户希望 18:30 收到材料。客户邮件要主方案与数据摘要。数据核对、排版、最终检查尚未分工，是否能全做完未知。没有人已答应加班，没有既定劳动规则或惩罚。','It is 17:50; the client wants material at 18:30. The client email asks for the main proposal and data summary. Data checks, layout and final review are unassigned; feasibility is unknown. Nobody has agreed to overtime. No employment policy or penalty is established.'),lang));
 if(variant.id==='office-interruption')facts.push(pick(l('现在 14:20，在办公室短会，轮到用户讲方案但被宁姐打断。用户方案的内容和风险由用户说明，瑞瑞的数据尚未核对，何主管没有正式作出决定。本开局没有 18:30 的客户材料期限。','It is 14:20 at a short office meeting. Ning interrupted the player’s slot. The player supplies their proposal and risk; Rui’s data is unchecked; He has not made a final decision. There is no 18:30 client-material deadline in this opening.'),lang));
 return facts;
}

export function availableStoryEvents(variant:StoryVariant,turn:number,history:Array<{role:string;text:string;story?:StoryBeat;dinner?:{eventId:string}}>,text:string,seen:string[]) {
 const used=new Set([...seen,...history.flatMap(m=>[m.story?.event,m.dinner?.eventId].filter((id):id is string=>!!id))]);
 const utterances=[...history.filter(m=>m.role==='user').map(m=>m.text),text];
 const latestPhoto=utterances.filter(t=>/照片|手机|相亲|见面|photo|phone|meet|date/i.test(t)).at(-1)??'';
 const declinesPhoto=/不看|不接|不要|不考虑|不见|不愿|别|拒绝|don[’']?t|won[’']?t|not interested|no photo|decline/i.test(latestPhoto);
 return variant.events.filter(id=>id!==variant.openingEvent&&!used.has(id!)&&turn>=2&&!(id==='family-phone'&&declinesPhoto));
}

export function addressedCharacter(scene:Scenario, text:string, targetId?:string) {
  if(targetId&&scene.characters.some(c=>c.id===targetId))return targetId;
  const aliases:Record<string,RegExp>={chen:/陈总|mr\.? chen/i,lin:/林姐|林总|ms\.? lin/i,zhou:/小周|zhou/i,aunt:/大姨|阿姨|aunt/i,mom:/妈妈|妈[，,：:]|\bmom\b/i,dad:/爸爸|爸[，,：:]|\bdad\b/i,senior:/许学长|学长|\bxu\b/i,yue:/小月|\byue\b/i,kai:/阿凯|\bkai\b/i,fang:/方经理|\bfang\b/i,qiao:/乔宁|\bqiao\b/i,cheng:/程悦|\bcheng\b/i,he:/何主管|\b(?:mr\.?\s+|supervisor\s+)he\b|\bhe(?=\s*[,，:：])/i,ning:/宁姐|\bning\b/i,rui:/瑞瑞|\brui\b/i};
  // A greeting or explicit request wins, not a third-person reference later in a sentence.
  return scene.characters.find(c=>{const match=aliases[c.id]?.exec(text);return match&&/^(?:那[，,]?|请问[，,]?|谢谢[，,]?|好的[，,]?|对了[，,]?|well,?\s*|thanks,?\s*)?\s*$/i.test(text.slice(0,match.index));})?.id;
}
export function inferTopic(scene:Scenario['id'],text:string,current:TopicId):TopicId {
  const rules:Partial<Record<TopicId,RegExp>>={
    toast:/喝|茶|酒|开车|过敏|服药|drink|toast|alcohol|driv|medicat/i,
    scope:/需求|范围|报表|功能|scope|requirement|feature|report module/i,
    deadline:/上线|排期|测试|周三|日期|验收|交付|项目|launch|deadline|test|wednesday|acceptance|delivery|project/i,
    introduction:/相亲|照片|见面|联系|加好友|介绍对象|photo|meet|date|introduction|contact/i,
    privacy:/HR|人事|谈话|离职|隐私|转发|转述|工资|消息|亲戚群|privacy|shar|forward|salary|family chat/i,
    autonomy:/决定|安排|逼|同意|答应|授权|consent|decid|agree|permission|pressure/i,
    credit:/功劳|贡献|带队|执行|署名|credit|contribution|leadership/i,
    evidence:/提交|文案|总结|记录|核对|发布|caption|commit|write.up|record|review|post/i,
    responsibility:/原因|责任|认错|交接|日志|权限|故障|fault|blame|cause|handoff|logs|permission/i,
    speaking:/发言|打断|讲完|方案|风险|议程|speak|interrupt|finish|proposal|risk|agenda/i,
    workload:/加班|排版|数据|检查|六点半|分工|任务|海报|演示|答辩|周五|熬夜|workload|task|poster|demo|friday|time/i,
  };
  return sceneTopics[scene].find(topic=>rules[topic]?.test(text))??current;
}

export function storyHint(topic:TopicId,lang:Lang,scene?:Scenario):string[] {
  if(scene?.space&&topic!=='responsibility'&&topic!=='speaking')return scene.suggestions.map(s=>pick(s,lang));
  const hints:Record<TopicId,L[]>={
    responsibility:[l('先核对日志和权限，才能判断原因。乔宁，你交接的是哪些材料？','We need logs and permissions before assigning a cause. Qiao, what did you hand over?'),l('现在可以上报哪些已确认的现象，哪些还只是猜测？','Which symptoms can we report as facts, and which causes are guesses?')],speaking:[l('给我一分钟讲完关键风险，再决定用哪份方案，可以吗？','Can I have one minute to finish the key risk before we choose a proposal?'),l('我还没讲到关键点，请让我讲完，再听您的不同意见。','I haven’t reached the key point. Let me finish, then we can hear your objection.')],
    toast:[l('我今天不喝酒。您希望我表达的是感谢，还是一定要喝这一杯？','I’m not drinking tonight. Do you want a thank-you, or must it be this drink?'),l('林姐，我们这次合作里，您现在最想确认哪件事？','Ms. Lin, what do you most need to confirm about our work?')],
    scope:[l('新增报表和原来的交付，我们能分开确认吗？','Can we confirm the new report separately from the original delivery?'),l('哪些必须周三完成，哪些可以下一版再做？','What must be ready Wednesday, and what can wait for the next version?')],
    deadline:[l('两项测试没过之前，我不能保证上线。明早拿结果一起判断，可以吗？','I can’t guarantee launch before those tests pass. Can we review the results tomorrow morning?'),l('小周，测试现在卡在哪里？请你补充一下。','Zhou, where is testing blocked? Please add what you know.')],
    introduction:[l('看照片和答应见面是两件事，我还没有同意见面。','Looking at a photo and agreeing to meet are different. I haven’t agreed to meet.'),l('如果我今天说不考虑，您会怎样回复对方？','If I say I’m not interested today, what would you tell them?')],
    privacy:[l('我说的是转述前先问我，不是不让你关心。','I’m asking you to check before sharing, not to stop caring.'),l('已经发出去的那条消息，你愿意帮我澄清一下吗？','Would you help clarify the message that has already gone out?')],
    autonomy:[l('我能答应的是自己安排后告诉你，不能答应现在定时间。','I can tell you after I make my own arrangements; I can’t set a date now.'),l('爸爸，你听到我刚才答应见面了吗？','Dad, did you hear me agree to meet?')],
    credit:[l('你负责汇报，小月做设计，我和阿凯做代码，这样写准确吗？','You presented, Yue designed, Kai and I coded. Is that accurate?'),l('小月，你希望设计部分具体怎样写？','Yue, how should we describe your design work?')],
    evidence:[l('文案先放到群里让每个人核对，确认后再发，可以吗？','Can everyone review the caption in the group before it goes out?'),l('阿凯，你能把代码提交记录整理出来吗？','Kai, can you pull together the code history?')],
    workload:[l('演示、海报、答辩是三项工作。我能接演示，其余谁愿意接？','Demo, poster and Q&A are three tasks. I can take the demo. Who can take the others?'),l('周五之前每个人还有多少时间？先别替别人答应。','How much time does each person have before Friday? Let’s not commit for each other.')],
  };return hints[topic].map(h=>pick(h,lang));
}

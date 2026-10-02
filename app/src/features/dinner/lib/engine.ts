import { z } from 'zod';
import {DramaSaveSchema,DinnerContextSchema,validDinnerContext,dinnerEvents,type DinnerContext} from './drama';
import { RoomContextSchema, RoomSaveSchema, validRoomCast, PLAYER_HOME, SEATS, distance, walkable, type RoomContext } from './room';
import { l, pick, scenarios, type Lang, type L, type Scenario } from './content';

export const ReactionSchema = z.object({ characterId: z.string().max(30), emotion: z.enum(['neutral', 'pressing', 'annoyed', 'thinking', 'supportive']), gesture: z.enum(['idle', 'toast', 'lean', 'fold', 'nod']) });
export const ReplySchema = z.object({ speakerId: z.string().max(30), text: z.string().min(1).max(650), cue: z.string().min(1).max(250), reactions: z.array(ReactionSchema).min(3).max(3) });
export type Reply = z.infer<typeof ReplySchema>;
export type Message = { role: 'npc' | 'user'; text: string; speakerId?: string; cue?: string; mode?: 'script' | 'model'; reactions?: Reply['reactions']; room?:RoomContext; dinner?:DinnerContext };
const MessageSchema = z.object({ role: z.enum(['npc', 'user']), text: z.string().min(1).max(2000), speakerId: z.string().optional(), cue: z.string().optional(), mode: z.enum(['script', 'model']).optional(), reactions: z.array(ReactionSchema).optional(), room:RoomContextSchema.optional(),dinner:DinnerContextSchema.optional() });
export const SaveSchema = z.object({ version: z.literal(1), scenarioId: z.enum(['work', 'family', 'school']), messages: z.array(MessageSchema).max(9), started: z.boolean(), complete: z.boolean(), lang: z.enum(['zh', 'en']), draft: z.string().max(500),view:z.enum(['first','third']).optional(),room:RoomSaveSchema.optional(),dinner:DramaSaveSchema.optional() }).superRefine((save, ctx) => {
  const ids = scenarios.find(s => s.id === save.scenarioId)!.characters.map(c => c.id);
  if (!save.messages.length || save.messages.length % 2 !== 1 || save.messages.some((m, i) => m.role !== (i % 2 ? 'user' : 'npc') || (m.role === 'npc' && !ids.includes(m.speakerId ?? '')))) ctx.addIssue({ code: 'custom', message: 'Invalid conversation order' });
  if(save.room&&(new Set(save.room.npcs.map(n=>n.id)).size!==3||save.room.npcs.some(n=>!ids.includes(n.id))))ctx.addIssue({code:'custom',message:'Invalid room cast'});
  if(save.room){const {player,npcs}=save.room;if(player.seated?distance(player,PLAYER_HOME)>.02:!walkable(player,0))ctx.addIssue({code:'custom',message:'Invalid player position'});for(const n of npcs){const index=ids.indexOf(n.id);if(index>=0&&(n.seated?distance(n,SEATS[index])>.02:!walkable(n,index+1)))ctx.addIssue({code:'custom',message:'Invalid NPC position'});}}
  if(save.room?.attention?.characterId&&!ids.includes(save.room.attention.characterId))ctx.addIssue({code:'custom',message:'Invalid attention target'});
  if(save.dinner&&[...save.dinner.seen,...save.dinner.records.map(r=>r.eventId),...(save.dinner.active?[save.dinner.active]:[])].some(id=>dinnerEvents.find(e=>e.id===id)!.scene!==save.scenarioId))ctx.addIssue({code:'custom',message:'Invalid dinner scene'});
  if(save.messages.some((m,i)=>m.dinner&&(!validDinnerContext(m.dinner,save.scenarioId)||m.dinner.previous.some(r=>r.turn>Math.floor(i/2)))))ctx.addIssue({code:'custom',message:'Invalid dinner evidence'});
  if(save.dinner&&save.dinner.records.some(r=>r.turn>save.messages.filter(m=>m.role==='user').length||r.turn<dinnerEvents.find(e=>e.id===r.eventId)!.turn))ctx.addIssue({code:'custom',message:'Invalid action timing'});
  if(save.messages.some(m=>m.room&&!validRoomCast(m.room,ids)))ctx.addIssue({code:'custom',message:'Invalid spatial evidence'});
  if (save.messages.some(m => m.reactions?.some(r => !ids.includes(r.characterId)))) ctx.addIssue({ code: 'custom', message: 'Invalid character reaction' });
});
export type Save = z.infer<typeof SaveSchema>;

export function opening(scenario: Scenario, lang: Lang): Message {
  return { role: 'npc', speakerId: scenario.characters[0].id, text: pick(scenario.opening, lang), cue: pick(scenario.openingCue, lang), mode: 'script', reactions: scenario.characters.map((c, i) => ({ characterId: c.id, emotion: i === 0 ? 'pressing' : 'neutral', gesture: i === 0 && scenario.id === 'work' ? 'toast' : 'idle' })) };
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

type Lines = Record<Intent, [L, L, L, L]>;
const script: Record<Scenario['id'], Lines> = {
  work: {
    bridge: [l('茶可以。可林姐特意倒的这杯，你就这么放着？', 'Tea, then. But Ms. Lin poured this glass for you. Are you just leaving it there?'), l('酒先不说。周三上线，测试来得及吗？', 'Leave the drink for now. Can testing finish before Wednesday’s launch?'), l('林姐，测试我也在做。现在还差客户那边的确认。', 'Ms. Lin, I’m on testing too. We still need confirmation from your side.'), l('先吃饭。周三我等结果，这个时间先别改了。', 'Let’s eat. I expect results Wednesday. Don’t move that date.')],
    boundary: [l('就这一杯，也不行？林姐都举起来了。', 'Not even this one glass? Ms. Lin has already raised hers.'), l('陈总，酒先放放。周三的版本我可已经跟上面报了。', 'Mr. Chen, leave the drink. I’ve already told my manager we’re launching Wednesday.'), l('陈总，我这也是茶。明早还得回去测一轮呢。', 'Mr. Chen, mine’s tea too. We still have another test run tomorrow morning.'), l('行，杯子放下吧。周三交付，别在那件事上也说不行。', 'All right, set it down. Just don’t tell me Wednesday’s delivery is impossible too.')],
    yield: [l('这就对了！再给你倒上，刚才那杯算开个头。', 'That’s the spirit! Let me pour another. That first one was just the start.'), l('陈总，别接着倒了。菜都还没吃几口。', 'Mr. Chen, don’t pour another yet. We’ve barely touched the food.'), l('你还好吧？我给你倒杯水。', 'Are you okay? I’ll get you some water.'), l('那今天说定了，下次客户来，你还得陪这一杯。', 'Then it’s settled. When the client comes next time, you’ll join the toast again.')],
    attack: [l('你在客户面前这么说话？我敬你一杯，还敬出错了？', 'You’re speaking to me like that in front of our client? Was offering a toast wrong?'), l('先别把气氛弄僵。陈总，把杯子放下，我们说项目。', 'Let’s not make this worse. Mr. Chen, set the glass down. Let’s talk about the project.'), l('我们先吃点菜吧，凉了。', 'Shall we eat? The food is getting cold.'), l('今天到这儿吧。你这句话，我记住了。', 'That’s enough for tonight. I’ll remember what you said.')],
    unclear: [l('你这话我没听明白。杯子还举着呢，你到底喝不喝？', 'I didn’t follow that. My glass is still raised. Are you drinking or not?'), l('喝不喝先放一边。你负责的那块，周三能上线吗？', 'Leave the drink aside. Will your part be ready to launch Wednesday?'), l('林姐，测试结果明早给你。还有两项没过。', 'Ms. Lin, I’ll send the test results tomorrow morning. Two checks are still failing.'), l('还没说清楚，那这杯先放着。饭吃完，我们再谈。', 'Still not clear. Leave the glass there. We’ll talk after dinner.')],
  },
  family: {
    bridge: [l('饭后再说也行。可照片总能先看一眼吧？', 'After dinner, then. But surely you can look at the photo first?'), l('你大姨今天特地带了照片。看一眼，又不是就让你定下来。', 'Your aunt brought the photo specially. Looking isn’t a commitment.'), l('先吃饭吧。这个菜再不夹就凉了。', 'Let’s eat. This dish will be cold in a minute.'), l('那今天先不说了。照片我留着，过两天再问你。', 'We’ll leave it tonight. I’m keeping the photo; I’ll ask again in a few days.')],
    boundary: [l('听听又不吃亏。条件这么好，我也是替你留意着。', 'What’s the harm in hearing about them? They’re a good match. I’ve been keeping an eye out for you.'), l('妈妈也不是要逼你。可你一句不让问，我心里也没底。', 'I’m not trying to force you. But when you won’t let us ask anything, I worry.'), l('见不见让孩子自己想吧。先吃饭。', 'Let them decide whether to meet. Let’s eat.'), l('我知道你有自己的主意了。但那个联系方式，我还是留给你。', 'I know you have your own ideas. But I’m still leaving you their contact details.')],
    yield: [l('这才对嘛，我把微信推给你。明天就见一面。', 'That’s better. I’ll send you their contact. You can meet tomorrow.'), l('明天是不是太急了？还是让孩子安排一下。', 'Tomorrow might be too soon. Let them arrange it.'), l('明天人家有没有空还不知道呢，别急着替孩子定。', 'We don’t even know if they’re free tomorrow. Don’t arrange it for them yet.'), l('那就这么说定了。我已经跟对方家里说好了。', 'Then it’s decided. I’ve already told their family.')],
    attack: [l('我们都是为你好，你怎么说话呢？', 'We only want the best for you. Why are you talking to us like that?'), l('别跟长辈顶嘴。有什么话不能好好说？', 'Don’t snap at your aunt. Can’t we discuss this calmly?'), l('先停一下。饭桌上不用把话说到这个份上。', 'Let’s stop for a moment. We don’t need to go this far over dinner.'), l('行，我不问了。以后你的事也别来找我。', 'Fine. I won’t ask. Don’t come to me about it later, either.')],
    unclear: [l('照片要不要看？我手机里就有。', 'Would you like to see the photo? It’s on my phone.'), l('你大姨还等着呢。是先看看，还是今天不想聊？', 'Your aunt is waiting. Do you want a look, or would you rather leave it tonight?'), l('先把手机收起来吧，让孩子吃两口。', 'Put the phone away for now. Let them eat.'), l('那照片我先留着。下回见面，我还得问你。', 'I’ll keep the photo. Next time I see you, I’ll ask again.')],
  },
  school: {
    bridge: [l('分工可以写。但我是队长，总不能把我放最后吧？', 'We can list the roles. But I’m the captain. Surely I shouldn’t go last?'), l('那就分开写吧。我做的设计，别又算进“执行”两个字里。', 'Then list them separately. Don’t hide my design work under “execution” again.'), l('核心模块是我们做的，提交记录都有。我可以整理。', 'We built the core module. The commit history is there. I can put it together.'), l('行，按分工写。对外汇报还是我来，但总结你们先起草。', 'Fine. Write it by role. I’ll still present externally, but you can draft the summary.')],
    boundary: [l('代码是你写的，可没有我的方向，能拿奖吗？', 'You wrote the code, but would we have won without my direction?'), l('学长，设计改了四版。只写带队拿奖，别人哪知道我们做了什么。', 'Xu, I revised the design four times. “Led the team to victory” doesn’t tell anyone what we did.'), l('我记得你连着三晚调试。这个没必要抹掉。', 'I remember you debugging for three nights. That shouldn’t disappear.'), l('你的代码贡献我会提。但我带队这部分，也得写清楚。', 'I’ll mention your code. But my leadership needs to be clear as well.')],
    yield: [l('懂事。下次比赛我还带你，你继续负责实现。', 'Good. I’ll bring you to the next competition. You can handle implementation again.'), l('可设计和开发不只是执行吧？', 'But design and development aren’t just execution, are they?'), l('你刚才真的同意那个说法吗？', 'Did you actually agree with that description?'), l('那我就按刚才说的发朋友圈了，大家帮我点个赞。', 'Then I’ll post it the way I said. Everyone give it a like.')],
    attack: [l('当着大家你就这样拆台？以后还怎么一起做项目？', 'You’re undermining me in front of everyone? How do we work together after this?'), l('我们把做过的事说清楚就好，不用互相攻击。', 'Let’s just name what each of us did. We don’t need to attack each other.'), l('提交记录能说明问题。先别吵了。', 'The commit history can settle this. Let’s not fight.'), l('这顿饭先到这儿。总结的事，明天再说。', 'Let’s end dinner here. We’ll discuss the write-up tomorrow.')],
    unclear: [l('我这句“带队拿下”，你觉得哪里不合适？', 'What’s wrong with my caption, “led the team to victory”?'), l('学长，我的设计和核心代码都还没提呢。', 'Xu, you haven’t mentioned my design or the core code yet.'), l('代码提交都有记录。我回去把链接找出来。', 'The commits are all there. I’ll find the links when we get back.'), l('今晚先不发了。明天拿着分工表再说。', 'I’ll hold the post tonight. We’ll look at the role list tomorrow.')],
  },
};

function actionReply(scene:Scenario['id'],choice:NonNullable<DinnerContext['choice']>,intent:Intent,fallback:L):L {
  if(intent==='attack')return fallback;
  const yielding=intent==='yield';
  const lines:Partial<Record<NonNullable<DinnerContext['choice']>,L>>=scene==='work'?{
    join:yielding?l('好，杯子别急着放。下一杯咱们再敬林姐。','Good. Don’t put the glass down yet. The next one’s for Ms. Lin.'):l('杯子都举了，就差这一口。林姐还等着呢。','Your glass is up. Just one sip. Ms. Lin is waiting.'),
    tea:yielding?l('刚端了茶，又说喝酒？那我再给你倒。','Tea a moment ago, now you want wine? I’ll pour some.'):l('茶端来了啊。可这杯酒是特意给你倒的，就一口也不行？','You brought tea. But this wine was poured for you. Not even one sip?'),
    hold:yielding?l('那就拿起来吧，别让林姐一直等着。','Then pick it up. Don’t keep Ms. Lin waiting.'):l('杯子都不拿？今天请林姐吃饭，你倒给我出难题。','You won’t even pick up the glass? We’re hosting Ms. Lin, and you’re putting me on the spot.'),
    calendar:l('日程给我也看一下吧。测试还没排完，周三不能光看这个日期。','Let me see the calendar too. Testing isn’t scheduled yet. The date alone won’t get us to Wednesday.'),
    conditions:l('林姐，客户确认那项确实得先给我们。不然测试跑不完。','Ms. Lin, we do need your confirmation first. Otherwise we can’t finish testing.'),
    confirm:l('陈总定时间也得等测试过。我这边还有两项没过呢。','Even if Mr. Chen sets the date, the tests have to pass. Two are still failing on my side.'),
  }:scene==='family'?{
    join:yielding?l('好，杯子先放下。我现在就把照片找给你。','Good. Put the cup down. I’ll find the photo now.'):l('我这杯是祝你有好消息，又不是催你。照片先看看？','I’m wishing you good news, not rushing you. Shall we look at the photo?'),
    tea:l('茶也是祝福嘛。可我说的这位，你听听总可以吧？','Tea is a toast too. But you can at least hear about this person, can’t you?'),
    hold:l('我祝你一句，你连杯子都不拿？又没让你明天就结婚。','I offer you a good wish and you won’t even lift your cup? I’m not asking you to marry tomorrow.'),
    accept:l('看完就把手机还给妈妈吧。见不见，别在饭桌上急着定。','Give the phone back to Mom when you’ve looked. There’s no rush to decide over dinner.'),
    decline:l('手机收起来就收起来吧。菜都要凉了，先吃。','Put the phone away, then. The food’s getting cold. Let’s eat.'),
    ally:l('我说一句吧。大过年的，别一桌人都盯着孩子问。','Let me say something. It’s a family dinner. Don’t all crowd them with questions.'),
  }:{
    join:yielding?l('好，杯子放下就拍。文案我还写带队拿下。','Good. Put the glass down and we’ll take the photo. I’m keeping “led the team to victory.”'):l('这杯敬完，照片还得拍。文案里带队这句，我要留着。','After this toast, we still need a photo. I want to keep the line about leading the team.'),
    tea:l('喝茶也行。可文案里写我带队，这个没问题吧？','Tea is fine. But there’s no problem saying I led the team in the caption, right?'),
    hold:l('怎么就你不举杯？我刚才那句，你是有意见？','Why are you the only one with your cup down? Is it what I said?'),
    group:l('全桌拍就全桌拍。发的时候，代码和设计也得带上。','Sure, get everyone in. When it’s posted, the code and design need a mention too.'),
    credit:l('先别拍了。代码那部分我和你都有提交，记录能对上。','Hold the photo. You and I both have code commits. The records show it.'),
    outside:l('你不入镜，照片里就少个人。学长，文案还是先商量好吧。','If you stay out, someone’s missing from the photo. Xu, let’s settle the caption first.'),
  };
  return lines[choice]??fallback;
}

export function scriptedReply(scenario: Scenario, text: string, turn: number, lang: Lang, room?:RoomContext,dinner?:DinnerContext): Reply {
  const intent = detectIntent(text);
  const index = Math.max(0, Math.min(turn - 1, 3));
  const speakerIndex = index === 1 ? 1 : index === 2 ? 2 : 0;
  const emotions = intent === 'attack' ? ['annoyed', 'thinking', 'neutral'] as const : intent === 'bridge' ? ['pressing', 'thinking', 'supportive'] as const : intent === 'yield' ? ['supportive', 'thinking', 'thinking'] as const : ['pressing', 'thinking', 'neutral'] as const;
  const leadGesture = intent === 'attack' ? 'fold' : intent === 'yield' ? 'nod' : scenario.id === 'work' && index === 0 ? 'toast' : 'lean';
  const lead=scenario.characters[0].name,who=scenario.characters[speakerIndex].name;
  const leadCue=leadGesture==='fold'?l(`${lead.zh}抱起手臂。`,`${lead.en} folds their arms.`):leadGesture==='nod'?l(`${lead.zh}点了点头。`,`${lead.en} nods.`):leadGesture==='toast'?l(`${lead.zh}的杯子还举着。`,`${lead.en} keeps the glass raised.`):l(`${lead.zh}朝前倾了一点。`,`${lead.en} leans forward slightly.`);
  const cue=speakerIndex===0?leadCue:l(`${who.zh}点头接话。${leadCue.zh}`,`${who.en} nods and takes a turn. ${leadCue.en}`);
  const spatialCue=room?.posture==='standing'?pick(room.zone==='table'?l('你站在桌边回答，大家抬头看向你。','You answer standing beside the table. They look up at you.'):l('你在包厢另一侧回答，桌上的人转向你。','You answer from across the room. The table turns toward you.'),lang)+' ':'';
  let spoken=script[scenario.id][intent][index];
  if(scenario.id==='work'&&dinner?.eventId==='work-deadline'&&index===3&&intent!=='attack')spoken=intent==='yield'?l('那周三我先报了。明早把测试结果发给我，别到时候才说来不及。','Then I’ll report Wednesday. Send me the test results tomorrow morning. Don’t wait until the last minute to say you can’t make it.'):intent==='boundary'?l('周三这个时间先不改。明早带着测试结果来找我。','Wednesday stays for now. Bring me the test results tomorrow morning.'):l('周三先按这个时间排。还卡着什么，明早一起看。','Plan around Wednesday for now. We’ll look at what’s still blocked tomorrow morning.');
  const tea=/茶|tea/i.test(text), privateTalk=/私下|饭后|之后聊|privately|after dinner/i.test(text);
  if(intent==='bridge'&&index===0&&scenario.id==='work'&&!tea)spoken=l('项目我当然要看结果。可林姐倒的这杯，你准备怎么办？','Of course I expect the project to deliver. But what are you doing with the glass Ms. Lin poured?');
  if(intent==='bridge'&&index===0&&scenario.id==='family'&&!privateTalk)spoken=l('饭还长着呢。就看张照片，又不是现在让你答应。','Dinner isn’t over yet. It’s only a photo. I’m not asking you to agree now.');
  // The completed action informs one whole reply, rather than a repeated status prefix.
  const fresh=dinner?.choice&&dinner.previous.some(r=>r.eventId===dinner.eventId&&r.choice===dinner.choice&&r.turn===turn-1)?dinner.choice:undefined;
  if(fresh)spoken=actionReply(scenario.id,fresh,intent,spoken);
  if(!fresh&&room?.posture==='standing'&&room.zone!=='table'&&intent==='unclear')spoken=scenario.id==='work'?(index>=2?l('先别走，周三的排期还没定呢。','Don’t go yet. Wednesday’s schedule isn’t settled.'):l('先别走。刚才那杯，你还没回答呢。','Don’t go yet. You haven’t answered about the toast.')):scenario.id==='family'?l('饭还没吃完呢，站那边做什么？','We haven’t finished eating. Why are you standing over there?'):l('等一下，照片和文案还没说好呢。','Wait. We haven’t settled the photo or the caption.');
  return { speakerId: scenario.characters[speakerIndex].id, text: pick(spoken, lang), cue: spatialCue+pick(cue, lang), reactions: scenario.characters.map((c, i) => ({ characterId: c.id, emotion: i === speakerIndex && speakerIndex !== 0 ? intent === 'attack' ? 'thinking' : 'supportive' : emotions[i], gesture: i === speakerIndex && speakerIndex !== 0 ? 'nod' : i === 0 ? leadGesture : 'idle' })) };
}

export function validateReply(data: unknown, scenario: Scenario): Reply {
  const reply = ReplySchema.parse(data);
  const ids = scenario.characters.map(c => c.id);
  if (!ids.includes(reply.speakerId) || new Set(reply.reactions.map(r => r.characterId)).size !== 3 || reply.reactions.some(r => !ids.includes(r.characterId))) throw new Error('Invalid character');
  return reply;
}

export function extractJSON(text: string): unknown {
  const clean = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('No JSON object');
  return JSON.parse(clean.slice(start, end + 1));
}

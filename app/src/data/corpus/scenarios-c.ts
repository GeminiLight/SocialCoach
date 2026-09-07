import { L } from "../taxonomy";
import type { Scenario } from "./types";
import { practiceSource } from "./sources";

/** Fictional practice applications, not reported events from the cited sources. */
export const SCENARIOS_C: Scenario[] = [
  {
    id: "friend-good-news",
    title: L("朋友的好消息，让你有点酸", "Your Friend’s Good News Stings a Little"),
    hook: L(
      "朋友拿到了你也申请过的驻留机会，兴奋地约你喝咖啡。",
      "Your friend won an arts residency you also applied for and wants to celebrate.",
    ),
    background: L(
      "你和阿澄都申请了同一个艺术驻留。你落选了，对方尚不知道。你真心在意这段友情，但不想假装没有失落，也不想把见面变成安慰自己。",
      "You and Chen applied for the same arts residency. You were rejected; Chen does not know yet. You care about the friendship, but do not want to fake your feelings or turn the meeting into comforting you.",
    ),
    context: "friendship",
    contextType: L("情感联结", "Emotional bonding"),
    competencies: ["social-awareness", "relationship-skills", "self-awareness"],
    skills: ["empathy", "building-relationships", "identifying-emotions"],
    relationship: ["friend"],
    difficulty: 2,
    minutes: 4,
    icon: "trophy",
    characters: [
      {
        id: "chen",
        name: L("阿澄", "Chen"),
        role: L("拿到驻留机会的朋友", "Friend awarded a residency"),
        personality: L(
          "兴奋又试探你的反应；敷衍祝贺会让他停止分享，追问具体创作才会多聊。",
          "Excited but attentive to your reaction; stops sharing after a perfunctory congratulations and opens up to specific questions about the work.",
        ),
        stance: L("想分享喜悦，不愿立刻听机会的缺点或安慰你的落选。", "Wants to share joy, not immediately hear drawbacks or console you."),
        hidden: L(
          "他最开心的不是获奖，而是终于能完成祖母故事的绘本；只有被问到项目才会谈起。",
          "The real joy is finally finishing a picture book about his grandmother; mentions this only when asked about the project.",
        ),
        hue: 75,
      },
    ],
    objectives: [
      L("围绕朋友的好消息追问一个具体细节。", "Ask a specific follow-up about the good news."),
      L("若表达自己的失落，也把谈话空间还给对方。", "If sharing disappointment, also return space to the friend."),
    ],
    success: L(
      "阿澄分享项目意义，双方约定一个彼此愿意的庆祝方式；不要求用户掩饰失落。",
      "Chen shares the meaning of the project and both choose a welcome way to celebrate; hiding disappointment is not required.",
    ),
    failure: L(
      "持续贬低机会、抢回话题或要求朋友为你的落选负责。",
      "Repeatedly devalues the opportunity, redirects attention, or blames the friend for the rejection.",
    ),
    maxTurns: 8,
    opening: {
      characterId: "chen",
      text: L("我收到录取邮件了！有点不敢相信……你怎么这么安静？", "I got the acceptance email! Still can’t believe it… you’ve gone quiet?"),
    },
    source: practiceSource("goodNews"),
    keywords: ["朋友", "好消息", "嫉妒", "祝贺", "friend", "good news", "jealousy", "celebration"],
  },
  {
    id: "trip-budget-boundary",
    title: L("这趟旅行，预算超出太多", "The Trip Is Beyond Your Budget"),
    hook: L("朋友已经挑好了海景酒店，你却只想花一半的钱。", "Your friend picked a sea-view hotel that costs twice your budget."),
    background: L(
      "你们还没付款。你给这趟周末旅行的总预算是 1500 元，朋友的方案要 3000 元。你不想解释私人财务，也不愿先答应再后悔。",
      "Nothing has been paid. Your total weekend budget is 1,500 yuan; your friend’s plan costs 3,000. You do not want to disclose personal finances or agree and regret it.",
    ),
    context: "friendship",
    contextType: L("非正式", "Informal"),
    competencies: ["responsible-decision-making", "relationship-skills"],
    skills: ["problem-solving", "communication", "analyzing-consequences"],
    relationship: ["friend"],
    difficulty: 2,
    minutes: 4,
    icon: "piggy-bank",
    characters: [
      {
        id: "mika",
        name: L("米卡", "Mika"),
        role: L("负责订旅行的朋友", "Friend planning the trip"),
        personality: L(
          "热情但把降低预算听成否定心意，会问为什么不能偶尔对自己好一点。",
          "Enthusiastic, but hears a lower budget as rejection of the effort; asks why you cannot treat yourself for once.",
        ),
        stance: L(
          "不接受只有一句太贵了；愿意比较仍有共同体验的完整方案。",
          "Rejects a bare complaint about price; will compare complete alternatives that preserve a shared experience.",
        ),
        hidden: L("最在意的是一起看日出，并不坚持住海景房。", "What matters most is watching sunrise together, not the sea-view room."),
        hue: 78,
      },
    ],
    objectives: [
      L("明确说出预算上限，不以羞辱消费习惯来辩护。", "State your budget ceiling without shaming spending habits."),
      L("提出两种自己负担得起的整体方案，并听取偏好。", "Offer two affordable packages and hear the preference."),
    ],
    success: L(
      "确认一个预算内方案，或明确友好地不参加；没有被迫披露财务。",
      "Agree on an affordable plan or clearly decline without disclosing private finances.",
    ),
    failure: L("含糊答应超预算，或以指责对方奢侈结束。", "Vaguely agrees beyond budget or ends by attacking the friend as extravagant."),
    maxTurns: 8,
    opening: {
      characterId: "mika",
      text: L("酒店快没房了，就订这个吧？一年才出去这么一次。", "The hotel’s almost full. Shall we book it? We only do this once a year."),
    },
    source: practiceSource("options"),
    keywords: ["旅行", "预算", "拒绝", "朋友", "travel", "budget", "options"],
  },
  {
    id: "family-photo-permission",
    title: L("家人把你的照片发出去了", "Your Family Posted Your Photo Without Asking"),
    hook: L(
      "你刚看到家庭群里的截图：一张不想公开的照片已经发到朋友圈。",
      "A family chat screenshot shows a photo you wanted private has been posted publicly.",
    ),
    background: L(
      "妈妈把你参加业余舞台演出的照片发在社交平台，附了你的工作单位。你愿意让家人看，但不想公开。你准备打电话要求处理这次发布，并约定以后先询问。",
      "Your mother posted a photo of your amateur performance along with your workplace. You welcome sharing within the family, but not publicly. You call to address this post and agree on permission for future ones.",
    ),
    context: "family",
    contextType: L("亲子", "Parent-child"),
    competencies: ["relationship-skills", "responsible-decision-making"],
    skills: ["communication", "standing-up", "ethical-responsibility"],
    relationship: ["parent"],
    difficulty: 2,
    minutes: 4,
    icon: "smartphone",
    characters: [
      {
        id: "mother",
        name: L("妈妈", "Mom"),
        role: L("发布照片的家人", "Family member who posted the photo"),
        personality: L(
          "觉得分享是骄傲的表现，被指责会辩解；具体说明公开范围和请求时才讨论修改。",
          "Sees sharing as pride and defends herself against accusations; discusses changes when the audience and request are specific.",
        ),
        stance: L(
          "不认为一句不喜欢就足以否定自己的心意；不会主动提出删除。",
          "Does not think a vague dislike accounts for her intentions; will not offer deletion unprompted.",
        ),
        hidden: L(
          "她不清楚那条动态对同事也可见，可以接受私发亲友作为替代。",
          "She did not realize coworkers could see it and is open to private sharing with relatives instead.",
        ),
        hue: 30,
      },
    ],
    objectives: [
      L("说明这次公开发布对自己的具体影响。", "Explain the specific impact of this public post."),
      L(
        "请求处理照片和单位信息，并约定下次先取得同意。",
        "Request action on the photo and workplace details, with permission before future posts.",
      ),
    ],
    success: L(
      "明确当前帖子的处理方式和以后的询问规则；不以保证绝不分享所有生活换取同意。",
      "Clarifies action on this post and future permission, without demanding a blanket ban on all family sharing.",
    ),
    failure: L("只争论谁更爱谁，或没有提出任何具体处理请求。", "Argues only about who cares more or makes no concrete request."),
    maxTurns: 8,
    opening: {
      characterId: "mother",
      text: L(
        "大家都在夸你，我发一下怎么了？你是不是觉得我给你丢脸？",
        "Everyone’s saying lovely things. What’s wrong with posting it? Are you embarrassed by me?",
      ),
    },
    source: practiceSource("listening"),
    keywords: ["家庭", "照片", "隐私", "边界", "family", "photo", "privacy", "permission"],
  },
  {
    id: "holiday-two-families",
    title: L("今年假期，不想两边连轴转", "You Cannot Spend the Holiday Everywhere"),
    hook: L(
      "父母默认你整个假期都回家，但你和伴侣已经累得不想赶路。",
      "Your parents expect the whole holiday, but you and your partner cannot face another travel marathon.",
    ),
    background: L(
      "五天假期，两边家人住在相距很远的城市。你与伴侣已商量最多出行三天，并留两天休息。你希望与爸爸谈一个真实可行的团聚安排。",
      "There are five days off and two families in distant cities. You and your partner agreed on at most three travel days and two at home. You want a workable family visit plan with your father.",
    ),
    context: "family",
    contextType: L("家庭日常", "Home interactions"),
    competencies: ["self-management", "responsible-decision-making", "relationship-skills"],
    skills: ["goal-setting", "problem-solving", "communication"],
    relationship: ["parent"],
    difficulty: 3,
    minutes: 5,
    icon: "calendar-x",
    characters: [
      {
        id: "father",
        name: L("爸爸", "Dad"),
        role: L("盼你回家的父亲", "Father expecting a visit"),
        personality: L(
          "用往年的安排证明理所当然，会拿亲戚的看法施压，但具体替代比笼统道歉更有用。",
          "Treats past arrangements as precedent and invokes relatives’ opinions; concrete alternatives matter more than vague apologies.",
        ),
        stance: L("想保住团聚，不接受无限期以后再说。", "Wants a reunion and will not accept an indefinite later."),
        hidden: L(
          "最在意的是假期第二天给奶奶庆生，其他日期可以商量。",
          "The key event is Grandma’s birthday on day two; other dates are flexible.",
        ),
        hue: 130,
      },
    ],
    objectives: [
      L("表明已经与伴侣商定的出行限制，不甩锅给伴侣。", "Own the travel limit agreed with your partner rather than blaming them."),
      L("问清重要日期，提出有明确时间的替代安排。", "Ask which dates matter and propose a dated alternative."),
    ],
    success: L(
      "双方明确能参加什么、不能参加什么，以及下一次联系时间。",
      "Both understand what is and is not possible and when to reconnect.",
    ),
    failure: L(
      "承诺做不到的行程，或把伴侣说成阻碍团聚的罪魁祸首。",
      "Promises an impossible itinerary or casts the partner as the culprit.",
    ),
    maxTurns: 10,
    opening: {
      characterId: "father",
      text: L(
        "票买好了吧？你叔叔一家都回来，就差你们了。",
        "You booked the tickets, right? Your uncle’s whole family is coming. We’re only waiting on you.",
      ),
    },
    source: practiceSource("options"),
    keywords: ["假期", "家庭", "休息", "边界", "holiday", "family", "boundaries"],
  },
  {
    id: "class-name-correction",
    title: L("老师总是把你的名字叫错", "The Teacher Keeps Getting Your Name Wrong"),
    hook: L("你已轻声纠正过两次，对方却说用一个简单昵称就好了。", "You have corrected them twice, but they suggest an easier nickname."),
    background: L(
      "你刚加入一门成人夜校课。老师不断叫错你的名字，并擅自缩短成昵称。你想在课后说明正确读法，让下次点名有所改变，而不必解释自己的全部文化背景。",
      "You joined an adult evening class. The teacher keeps mispronouncing your name and shortening it. After class, you want to clarify its pronunciation and future use without explaining your entire cultural background.",
    ),
    context: "education",
    contextType: L("师生", "Teacher-student"),
    competencies: ["self-awareness", "relationship-skills"],
    skills: ["social-cultural-identity", "standing-up", "cultural-competence"],
    relationship: ["teacher"],
    difficulty: 2,
    minutes: 3,
    icon: "graduation-cap",
    characters: [
      {
        id: "lee",
        name: L("李老师", "Lee"),
        role: L("夜校老师", "Evening class teacher"),
        personality: L(
          "赶着收拾东西，会用不是故意的挡住第一次提醒；需要一个可操作的记忆办法。",
          "Busy packing up, initially responds that it was unintentional; needs a practical way to remember.",
        ),
        stance: L(
          "觉得昵称方便，不会因为学生微笑就主动改正。",
          "Finds the nickname convenient and will not correct the habit merely because the student is polite.",
        ),
        hidden: L(
          "名单上的名字没有发音备注，愿意当场写上，但要先意识到这是明确请求。",
          "The roster lacks pronunciation notes; will add one if the request is explicit.",
        ),
        hue: 190,
      },
    ],
    objectives: [
      L("清楚说出希望使用的名字和读法。", "State the name and pronunciation you want used."),
      L("提出下次点名可落实的做法。", "Request a concrete action for the next roll call."),
    ],
    success: L(
      "老师复述正确称呼并记录提醒；学生不必接受不喜欢的昵称。",
      "The teacher repeats the correct name and records a reminder; the learner need not accept an unwanted nickname.",
    ),
    failure: L(
      "只说没关系而放弃请求，或以羞辱老师作为唯一回应。",
      "Drops the request with reassurance alone or responds only by humiliating the teacher.",
    ),
    maxTurns: 6,
    opening: {
      characterId: "lee",
      text: L(
        "我真的不太会读，不如以后就叫你小林？大家也好记。",
        "I struggle with the pronunciation. Could I just call you Lin? Easier for everyone.",
      ),
    },
    source: practiceSource("identity"),
    keywords: ["姓名", "校园", "文化", "昵称", "name", "identity", "pronunciation", "classroom"],
  },
  {
    id: "language-club-space",
    title: L("语言角里，总轮不到你说完", "You Never Finish a Sentence at Language Club"),
    hook: L(
      "你说第二语言需要停顿，热心的同伴总替你把话说完。",
      "Speaking your second language takes pauses, and a helpful peer keeps finishing your sentences.",
    ),
    background: L(
      "你参加校园语言角是为了练习表达。同伴不带恶意，却一遇到停顿就翻译或替答。你想提出一种能让你完成表达、又不让对方觉得帮助被全盘否定的方式。",
      "You joined a campus language club to practise speaking. A peer translates or answers whenever you pause. You want room to finish without treating all offers of help as unwelcome.",
    ),
    context: "education",
    contextType: L("同学讨论", "Peer discussion"),
    competencies: ["relationship-skills", "social-awareness", "self-awareness"],
    skills: ["communication", "sense-of-belonging", "self-efficacy"],
    relationship: ["peer"],
    difficulty: 1,
    minutes: 3,
    icon: "message-square",
    characters: [
      {
        id: "robin",
        name: L("Robin", "Robin"),
        role: L("语言角同伴", "Language club peer"),
        personality: L(
          "语速快，认为填补沉默是在帮忙；第一次被提醒会解释自己的善意。",
          "Speaks quickly and thinks filling silence helps; initially explains the good intention.",
        ),
        stance: L("愿意帮忙但不知道何时该停，需要明确的等待或求助信号。", "Wants to help but needs an explicit waiting or help signal."),
        hidden: L(
          "担心冷场会让新成员不再来，不知道你把停顿当作练习的一部分。",
          "Worries silence will drive new members away and does not know pauses are part of your practice.",
        ),
        hue: 190,
      },
    ],
    objectives: [
      L("说明被接话对练习的影响，而不猜测恶意。", "Explain how interruptions affect practice without assuming malice."),
      L("约定等待或求助信号，并完成一小段表达。", "Agree on a waiting or help signal and finish a short contribution."),
    ],
    success: L(
      "同伴允许你自行完成一句话，且双方明确何时可以提供帮助。",
      "The peer lets you finish a sentence and both know when help is welcome.",
    ),
    failure: L("再次默认由对方替答，或完全拒绝一切交流。", "Again lets the peer answer for you or rejects all interaction."),
    maxTurns: 6,
    opening: {
      characterId: "robin",
      text: L(
        "你是不是想说很有意思？我懂了，我帮你跟大家解释吧。",
        "Do you mean it was interesting? Got it—I’ll explain it to everyone for you.",
      ),
    },
    source: practiceSource("listening"),
    keywords: ["第二语言", "校园", "融入", "打断", "language", "belonging", "interrupting"],
  },
  {
    id: "event-access-request",
    title: L("报名活动前，先问清无障碍安排", "Ask About Access Before the Event"),
    hook: L(
      "活动介绍写着欢迎所有人，但场地信息只有一张楼梯照片。",
      "The event says everyone is welcome, but the venue page shows only stairs.",
    ),
    background: L(
      "你使用轮椅，想参加社区桌游夜。报名截止前，你需要确认入口、洗手间和座位通道。你希望得到事实，而不是让主办方承诺到时总有办法。",
      "You use a wheelchair and want to join a community board-game night. Before registration closes, you need facts about entry, toilets, and seating routes, rather than a promise that something will work out.",
    ),
    context: "party",
    contextType: L("活动", "Events"),
    competencies: ["relationship-skills", "social-awareness", "responsible-decision-making"],
    skills: ["standing-up", "sense-of-belonging", "problem-solving"],
    relationship: ["stranger"],
    difficulty: 2,
    minutes: 4,
    icon: "door-open",
    characters: [
      {
        id: "host",
        name: L("安琪", "Anqi"),
        role: L("桌游夜主办人", "Board-game host"),
        personality: L(
          "友好但不了解场地细节，先说大家可以帮忙；遇到具体问题才愿意联系场地方核实。",
          "Friendly but unfamiliar with venue details; offers general help before checking specifics with the venue.",
        ),
        stance: L(
          "预算不够临时换场地，也不能把抬人上楼当成默认解决方案。",
          "Cannot fund a last-minute venue change and must not treat carrying someone upstairs as the default solution.",
        ),
        hidden: L(
          "侧门可能有平坡入口，但从未检查通道宽度和洗手间，需要确认。",
          "There may be a level side entrance, but the route width and toilet have never been checked.",
        ),
        hue: 130,
      },
    ],
    objectives: [
      L("明确自己需要核实的参与条件，不被迫解释诊断。", "State the access conditions to verify without explaining a diagnosis."),
      L(
        "约定谁去确认、何时回复，以及不满足时的选择。",
        "Agree who will check, when they will reply, and options if access is unavailable.",
      ),
    ],
    success: L(
      "得到具体核实计划，保留是否参加的决定权；拒绝不合适安排也可成功。",
      "Secures a specific verification plan and retains the choice to attend; declining an unsuitable option can succeed.",
    ),
    failure: L(
      "只接受到时有人帮忙的保证，或以未核实信息承诺可参加。",
      "Accepts only a vague promise of help or commits based on unverified access.",
    ),
    maxTurns: 8,
    opening: {
      characterId: "host",
      text: L(
        "我们很欢迎你呀！有台阶的话，到时候找几个人帮一下就行吧？",
        "We’d love to have you! If there are steps, could a few people help on the day?",
      ),
    },
    source: practiceSource("access"),
    keywords: ["无障碍", "轮椅", "桌游", "社群", "accessibility", "wheelchair", "event", "community"],
  },
  {
    id: "party-alcohol-pressure",
    title: L("不喝酒，也想好好待在聚会里", "Stay at the Party Without Drinking"),
    hook: L("你已经说不喝，主人还在把酒杯往你手里塞。", "You said no to alcohol, but the host keeps handing you a glass."),
    background: L(
      "你参加新邻居的乔迁聚会，决定今晚不喝酒，也不想交代私人原因。你愿意参与庆祝，希望明确拒绝酒精并继续自在地交流。",
      "At a new neighbor’s housewarming, you have decided not to drink and do not want to give private reasons. You want to decline alcohol while staying involved in the celebration.",
    ),
    context: "party",
    contextType: L("社交寒暄", "Social mingling"),
    competencies: ["self-awareness", "relationship-skills"],
    skills: ["self-efficacy", "communication", "building-relationships"],
    relationship: ["stranger"],
    difficulty: 1,
    minutes: 3,
    icon: "wine",
    characters: [
      {
        id: "kai",
        name: L("凯", "Kai"),
        role: L("乔迁聚会主人", "Housewarming host"),
        personality: L(
          "把共同举杯当作热情，第一次拒绝后仍劝一小口；遇到明确边界和参与意愿才停止。",
          "Treats a shared drink as hospitality and pushes once after refusal; stops when the boundary and wish to participate are clear.",
        ),
        stance: L(
          "希望气氛热闹，不会因一句随便就理解成不喝。",
          "Wants a lively party and will not interpret an ambiguous answer as a refusal.",
        ),
        hidden: L(
          "厨房准备了气泡水，只是觉得拿出来会显得招待不周。",
          "There is sparkling water in the kitchen, but the host worries offering it seems ungenerous.",
        ),
        hue: 15,
      },
    ],
    objectives: [
      L("明确拒绝酒精，不编造必须自证的理由。", "Clearly decline alcohol without inventing a reason to defend."),
      L("提出自己愿意的参与方式，若继续施压则说明边界。", "Offer a welcome way to participate and state a boundary if pressure continues."),
    ],
    success: L(
      "主人停止劝酒并提供可接受选择，或你明确选择离开。",
      "The host stops pushing and offers an acceptable option, or you clearly choose to leave.",
    ),
    failure: L("为不扫兴答应喝酒，或拒绝表达自己的选择。", "Agrees to drink only to please others or avoids expressing a choice."),
    maxTurns: 6,
    opening: {
      characterId: "kai",
      text: L("都来了，就一小口！你总得给新邻居一点面子吧。", "You’re here already—just a sip! Come on, for your new neighbor."),
    },
    source: practiceSource("listening"),
    keywords: ["拒酒", "聚会", "边界", "陌生人", "party", "alcohol", "boundary"],
  },
  {
    id: "community-room-sharing",
    title: L("社区活动室，总被同一组占着", "The Community Room Is Always Taken"),
    hook: L(
      "你想办免费读书会，却连续三周约不到活动室。",
      "You want to host a free reading group but have missed out on the room three weeks running.",
    ),
    background: L(
      "社区只有一间晚间活动室。棋友群总是提前预约所有周五，你的读书会也只有这个时间多数人有空。你约棋友群负责人讨论轮换，管理员尚未定正式规则。",
      "The community has one evening room. A chess group reserves every Friday, the only convenient slot for your reading group too. You approach its coordinator; the administrator has not set a formal allocation rule.",
    ),
    context: "public",
    contextType: L("陌生人", "Unknown people"),
    competencies: ["responsible-decision-making", "relationship-skills"],
    skills: ["ethical-responsibility", "problem-solving", "teamwork"],
    relationship: ["stranger"],
    difficulty: 3,
    minutes: 5,
    icon: "scale",
    characters: [
      {
        id: "zhou",
        name: L("周叔", "Zhou"),
        role: L("棋友群负责人", "Chess group coordinator"),
        personality: L(
          "强调先到先得和老成员付出；不会凭一句大家都不容易就让出时间。",
          "Emphasizes first come, first served and longstanding members’ effort; sympathy alone will not change the booking.",
        ),
        stance: L("要维持棋友群固定聚会，不接受直接剥夺所有周五。", "Needs predictable chess meetings and rejects losing every Friday."),
        hidden: L(
          "每月只有两次需要全员到场，其余可以小组去茶室，但担心规则只约束自己。",
          "Only two monthly meetings require everyone; smaller sessions could use a tea room, but the coordinator fears one-sided rules.",
        ),
        hue: 130,
      },
    ],
    objectives: [
      L("询问双方实际使用需求，提出共同适用的分配标准。", "Ask about actual needs and propose criteria that apply to both groups."),
      L("讨论明确的轮换方案和请管理员确认的下一步。", "Discuss a concrete rotation and a next step for administrator approval."),
    ],
    success: L(
      "达成愿意共同提交的分配方案，或列明分歧与确认标准；不冒称有权单方改规则。",
      "Agree on a joint proposal or specify unresolved criteria for confirmation, without claiming unilateral authority.",
    ),
    failure: L(
      "用资历或人数压过对方，或私自宣布取消对方预约。",
      "Relies on seniority or numbers to overpower the other group, or unilaterally cancels its bookings.",
    ),
    maxTurns: 10,
    opening: {
      characterId: "zhou",
      text: L("我们每次都按时预约的，凭什么现在要给你们让？", "We booked on time every week. Why should we give up our slot now?"),
    },
    source: practiceSource("criteria"),
    keywords: ["社区", "公共空间", "公平", "协商", "community", "fairness", "shared space"],
  },
  {
    id: "friend-secret-apology",
    title: L("你把朋友的秘密说漏嘴了", "You Let a Friend’s Secret Slip"),
    hook: L(
      "你以为只告诉一个人没关系，朋友却从第三个人那里听到了。",
      "You thought telling one person would be harmless. Your friend heard it from someone else.",
    ),
    background: L(
      "朋友曾私下说准备换城市，你转述给共同朋友，消息又传开。你想承担责任、商量补救，而不是逼朋友马上原谅你。",
      "A friend privately shared plans to move cities. You told a mutual friend and the news spread. You want to own the breach and discuss repair without demanding immediate forgiveness.",
    ),
    context: "friendship",
    contextType: L("情感联结", "Emotional bonding"),
    competencies: ["responsible-decision-making", "relationship-skills"],
    skills: ["reflecting-on-role", "ethical-responsibility", "resolving-conflicts"],
    relationship: ["friend"],
    difficulty: 3,
    minutes: 5,
    icon: "heart-crack",
    characters: [
      {
        id: "ning",
        name: L("宁宁", "Ning"),
        role: L("秘密被泄露的朋友", "Friend whose confidence was broken"),
        personality: L(
          "生气且简短；会质疑不是故意的，不因一句道歉立刻恢复信任。",
          "Angry and terse; challenges claims that it was unintentional and does not restore trust after one apology.",
        ),
        stance: L(
          "要知道你到底告诉了谁，并阻止继续传播；暂时不愿分享更多近况。",
          "Wants to know whom you told and stop further spread; does not want to share more personal news yet.",
        ),
        hidden: L(
          "新工作还没定，最担心消息传到现同事；只有被问影响时才说明。",
          "The new job is not settled and current coworkers hearing is the main worry; explains this when asked about impact.",
        ),
        hue: 15,
      },
    ],
    objectives: [
      L("承认自己未经允许转述，并说明已知传播范围。", "Own sharing without permission and state the known extent."),
      L("提出补救、先取得对方同意，接受信任需要时间。", "Offer repair with consent and accept that trust takes time."),
    ],
    success: L(
      "朋友知道你承担什么责任，并明确一项同意的补救或暂不联系的边界；无需当场原谅。",
      "The friend knows what you own and agrees to a repair or a no-contact boundary for now; immediate forgiveness is unnecessary.",
    ),
    failure: L(
      "辩解对方小题大做、隐瞒转述对象，或未经同意再公开澄清。",
      "Dismisses the harm, conceals recipients, or posts a public correction without consent.",
    ),
    maxTurns: 10,
    opening: {
      characterId: "ning",
      text: L(
        "我只跟你说过。现在连不熟的人都来问，你让我以后怎么信你？",
        "I told only you. Now people I barely know are asking. How am I supposed to trust you?",
      ),
    },
    source: practiceSource("apology"),
    keywords: ["秘密", "道歉", "信任", "隐私", "secret", "apology", "trust", "repair"],
  },
  {
    id: "partner-alone-evening",
    title: L("想独处一晚，被听成了不想见面", "An Evening Alone Sounds Like Rejection"),
    hook: L(
      "连续几天社交后，你想安静一下，伴侣却问是不是感情淡了。",
      "After several social days, you need quiet. Your partner asks whether you are losing interest.",
    ),
    background: L(
      "你们原本只说周末可能见面，尚未定计划。今晚你很疲惫，想独处；伴侣也期待相处。你需要表达自己的状态，并讨论能兑现的连接方式。",
      "You tentatively discussed meeting this weekend but set no plan. Tonight you are exhausted and want solitude; your partner wants time together. Explain your state and discuss a connection you can actually offer.",
    ),
    context: "romantic",
    contextType: L("伴侣冲突", "Partner conflicts"),
    competencies: ["self-management", "relationship-skills", "self-awareness"],
    skills: ["emotion-regulation", "communication", "identifying-emotions"],
    relationship: ["partner"],
    difficulty: 2,
    minutes: 4,
    icon: "moon",
    characters: [
      {
        id: "sam",
        name: L("Sam", "Sam"),
        role: L("期待见面的伴侣", "Partner hoping to meet"),
        personality: L(
          "把模糊的改天听成疏远，会追问到底什么时候；不要求用户放弃独处才算成功。",
          "Hears a vague later as distance and asks when; success must not require the learner to abandon solitude.",
        ),
        stance: L(
          "需要可预期的联系，不接受突然失联，也不承诺立刻不难过。",
          "Needs predictable contact, rejects disappearing, and will not promise to stop feeling disappointed immediately.",
        ),
        hidden: L(
          "最近两次临时改约让对方不安，具体兑现的安排比反复说爱更有用。",
          "Two recent reschedules caused uncertainty; a kept arrangement matters more than repeated reassurances.",
        ),
        hue: 15,
      },
    ],
    objectives: [
      L("说明疲惫和独处需要，同时承认对方的失落。", "Explain exhaustion and the need for solitude while acknowledging disappointment."),
      L("提出可兑现的联系时间，不用冷处理结束。", "Offer a realistic time to reconnect rather than disappearing."),
    ],
    success: L(
      "双方清楚今晚的安排和下次联系时间，即使仍有失落也可结束。",
      "Both know tonight’s plan and the next contact time, even if disappointment remains.",
    ),
    failure: L("失联、威胁分手，或承诺不可能兑现的补偿。", "Disappears, threatens a breakup, or promises an unrealistic compensation."),
    maxTurns: 8,
    opening: {
      characterId: "sam",
      text: L("你又想一个人待着。是不是只有跟我见面才觉得累？", "You want to be alone again. Is seeing me the part that tires you out?"),
    },
    source: practiceSource("pause"),
    keywords: ["伴侣", "独处", "精力", "边界", "partner", "alone time", "reconnect"],
  },
  {
    id: "async-message-misread",
    title: L("一句「随你」让线上协作卡住了", "One Short Message Derails Remote Collaboration"),
    hook: L(
      "跨时区同事回复了「随你」，你已经准备回一封长长的反驳。",
      "A colleague in another time zone wrote ‘up to you,’ and you are drafting a long rebuttal.",
    ),
    background: L(
      "你们正选择周报格式，上一条消息只有简短回复。你把它理解为消极抵抗，但并不知道对方当时的处境。你希望在短会里核实意思，并约定以后如何确认决定。",
      "You are choosing a weekly report format. A terse reply sounded like resistance, but you do not know the circumstances. In a short call, clarify the meaning and agree how to confirm decisions next time.",
    ),
    context: "workplace",
    contextType: L("专业协作", "Professional collaboration"),
    competencies: ["self-awareness", "social-awareness", "relationship-skills"],
    skills: ["examining-bias", "perspective-taking", "communication"],
    relationship: ["peer"],
    difficulty: 1,
    minutes: 3,
    icon: "message-square-warning",
    characters: [
      {
        id: "alex",
        name: L("Alex", "Alex"),
        role: L("跨时区同事", "Colleague in another time zone"),
        personality: L(
          "言简意赅，被指控阴阳怪气会防御；具体询问时愿意解释，但不自动承认有恶意。",
          "Terse and defensive if accused of sarcasm; explains when asked specifically without falsely admitting malicious intent.",
        ),
        stance: L(
          "愿意让你决定格式，但还需要确认数据导出的工作量。",
          "Willing to let you choose the format but still needs to confirm the data-export effort.",
        ),
        hidden: L(
          "上一条消息是在接孩子的路上发的，没来得及写出技术顾虑。",
          "The reply was sent during school pickup, without time to explain a technical concern.",
        ),
        hue: 190,
      },
    ],
    objectives: [
      L("区分看到的消息和自己对语气的解读。", "Separate the actual message from your reading of its tone."),
      L("核实顾虑，并约定清晰的异步确认方式。", "Check the concern and agree on a clear asynchronous confirmation."),
    ],
    success: L(
      "双方澄清格式决定与剩余工作，明确下次需要怎样的确认。",
      "Clarifies the format decision, remaining work, and how to confirm next time.",
    ),
    failure: L(
      "把恶意当作事实追责，或不核实就宣布所有工作已同意。",
      "Treats hostile intent as established fact or assumes all work is agreed without checking.",
    ),
    maxTurns: 6,
    opening: {
      characterId: "alex",
      text: L(
        "你说想聊那条消息？我不是已经说随你了吗，还有什么问题？",
        "You wanted to talk about that message? I said it was up to you. What’s the issue?",
      ),
    },
    source: practiceSource("listening"),
    keywords: ["线上", "远程", "误会", "语气", "remote", "async", "tone", "misunderstanding"],
  },
];

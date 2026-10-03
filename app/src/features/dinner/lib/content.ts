import type {SpaceKind} from './spaces';
export type Lang = 'zh' | 'en';
export type L = { zh: string; en: string };
export const l = (zh: string, en: string): L => ({ zh, en });
export const pick = (value: L, lang: Lang) => value[lang];
export type Emotion = 'neutral' | 'pressing' | 'annoyed' | 'thinking' | 'supportive';
export type Gesture = 'idle' | 'toast' | 'lean' | 'fold' | 'nod';
export type Character = { id: string; name: L; role: L; description: L; outfit: 'suit' | 'shirt' | 'dress' | 'blazer' | 'cardigan' | 'polo' | 'crewneck' | 'hoodie'; palette: 'navy' | 'sage' | 'wine' | 'charcoal' | 'denim' | 'oat' | 'terracotta' | 'teal' | 'white'; hair: 'short' | 'bob' | 'swept' | 'bun' | 'wave' | 'crop' | 'ponytail' | 'fringe'; glasses: boolean; };
export type Scenario = {
  id: 'work' | 'family' | 'school' | 'elevator' | 'office'; space?:SpaceKind; category: L; title: L; subtitle: L;
  room: L; time: string; goal: L; opening: L; openingCue: L;
  characters: Character[]; suggestions: L[]; source: { title: L; type: 'original-fiction'; path: string };
};

export const scenarios: Scenario[] = [
  {
    id: 'work', category: l('职场', 'Work'), title: l('这杯酒，非喝不可吗？', 'Does this toast have to be a test?'),
    subtitle: l('客户在场。领导举杯。所有人都在等你。', 'The client is here. Your boss raises a glass. All eyes turn to you.'),
    room: l('望江阁 · 项目庆功宴', 'River Room · Project dinner'), time: '19:42',
    goal: l('拒绝这杯酒，也把项目的事谈下去。', 'Refuse the drink and keep the project conversation going.'),
    opening: l('这杯你不喝，是不是不给我面子？', 'If you won’t drink this, are you saying I don’t deserve your respect?'),
    openingCue: l('陈总举着杯子，没有放下。桌上的笑声停了。', 'Mr. Chen keeps his glass raised. The laughter at the table stops.'),
    characters: [
      { id: 'chen', name: l('陈总', 'Mr. Chen'), role: l('你的领导', 'Your boss'), description: l('坐主位。刚拿下客户续约，今晚已经敬了三轮酒。', 'At the head of the table. He secured the renewal and has already led three rounds of toasts.'), outfit: 'suit', palette: 'navy', hair: 'swept', glasses: false },
      { id: 'lin', name: l('林姐', 'Ms. Lin'), role: l('客户负责人', 'Client lead'), description: l('坐在领导旁边。更关心下周的交付，也在看你怎样接话。', 'Beside your boss. She cares about next week’s delivery and is watching your reply.'), outfit: 'blazer', palette: 'charcoal', hair: 'bun', glasses: false },
      { id: 'zhou', name: l('小周', 'Zhou'), role: l('同组同事', 'Your teammate'), description: l('和你一起做项目。他也没有喝酒，但暂时没有开口。', 'Worked on the project with you. He isn’t drinking either, but hasn’t spoken.'), outfit: 'shirt', palette: 'denim', hair: 'short', glasses: true },
    ],
    suggestions: [l('陈总，这杯我用茶敬您，项目我一定扛住。', 'Mr. Chen, let me toast you with tea. You can count on me for the project.'), l('谢谢您，我今天不喝酒。茶我陪您。', 'Thank you. I’m not drinking tonight, but I’ll join you with tea.'), l('不给面子和不喝酒，是两回事吧？', 'Not drinking and disrespecting you are two different things, aren’t they?')],
    source: { title: l('原创虚构剧情：庆功宴上的劝酒', 'Original fiction: a toast at the project dinner'), type: 'original-fiction', path: 'wiki/archive/specs/spec-3d-integration.md#fiction' },
  },
  {
    id: 'family', category: l('家庭', 'Family'), title: l('你的婚事，怎么成了全桌的事？', 'When did your life become table talk?'),
    subtitle: l('年夜饭刚开始，话题已经轮到你。', 'Dinner has barely started. Your future is already on the menu.'),
    room: l('团圆厅 · 家庭聚餐', 'Reunion Room · Family dinner'), time: '18:36',
    goal: l('不答应相亲，也不让这一桌替你做决定。', 'Decline the introduction without letting the table decide for you.'),
    opening: l('你表妹都订婚了。你到底还想挑到什么时候？', 'Your cousin is engaged already. How much longer are you going to be so picky?'),
    openingCue: l('大姨放下筷子。妈妈看向你，爸爸低头喝了一口茶。', 'Your aunt puts down her chopsticks. Mom looks at you. Dad takes a sip of tea.'),
    characters: [
      { id: 'aunt', name: l('大姨', 'Aunt Mei'), role: l('热心的长辈', 'Your outspoken aunt'), description: l('张罗了这顿饭，已经替你物色了一位相亲对象。', 'Organized this dinner. She already has a date in mind for you.'), outfit: 'cardigan', palette: 'wine', hair: 'wave', glasses: false },
      { id: 'mom', name: l('妈妈', 'Mom'), role: l('你的妈妈', 'Your mother'), description: l('夹在你和长辈之间，想听到一个能让大家安心的回答。', 'Caught between you and the relatives. She wants an answer that reassures everyone.'), outfit: 'cardigan', palette: 'sage', hair: 'crop', glasses: false },
      { id: 'dad', name: l('爸爸', 'Dad'), role: l('你的爸爸', 'Your father'), description: l('话不多。面前的茶已经续了三次，一直在听。', 'Quiet. His tea has been refilled three times. He’s been listening.'), outfit: 'polo', palette: 'oat', hair: 'swept', glasses: true },
    ],
    suggestions: [l('我知道您关心我，但结婚的时间我想自己决定。', 'I know you care, but I want to decide when I get married.'), l('今天先好好吃饭，相亲的事我们私下聊。', 'Let’s enjoy dinner. We can talk about introductions privately.'), l('这是我的生活，不用拿我和表妹比。', 'This is my life. Please don’t compare me with my cousin.')],
    source: { title: l('原创虚构剧情：被全桌追问的婚事', 'Original fiction: marriage questions over dinner'), type: 'original-fiction', path: 'wiki/archive/specs/spec-3d-integration.md#fiction' },
  },
  {
    id: 'school', category: l('学校', 'Campus'), title: l('没出力的人，要站在最中间？', 'Who gets the credit at this table?'),
    subtitle: l('比赛刚拿奖，功劳已经有了新版本。', 'You just won the competition. The story is already being rewritten.'),
    room: l('春和厅 · 赛后聚餐', 'Spring Room · Team celebration'), time: '20:08',
    goal: l('让代码和设计的贡献写进团队总结。', 'Get the code and design contributions into the team write-up.'),
    opening: l('这次主要还是我带得好。你们做执行也挺辛苦的。', 'My leadership really made this win happen. You all worked hard on the execution, too.'),
    openingCue: l('学长把奖杯拉到自己面前。两位队友交换了一下眼神。', 'Your senior pulls the trophy toward himself. Your teammates exchange a look.'),
    characters: [
      { id: 'senior', name: l('许学长', 'Xu'), role: l('项目队长', 'Team captain'), description: l('负责汇报和对外联络，习惯代表整支队伍讲话。', 'Handled the presentation and external coordination. Usually speaks for the team.'), outfit: 'shirt', palette: 'terracotta', hair: 'swept', glasses: false },
      { id: 'yue', name: l('小月', 'Yue'), role: l('设计队友', 'Designer'), description: l('负责设计，知道你连续熬夜写完了核心代码。', 'Led design. Knows you stayed up late to finish the core code.'), outfit: 'crewneck', palette: 'white', hair: 'ponytail', glasses: false },
      { id: 'kai', name: l('阿凯', 'Kai'), role: l('开发队友', 'Developer'), description: l('和你一起调试，不喜欢争执，但在等有人开口。', 'Debugged with you. Doesn’t like arguments, but is waiting for someone to speak.'), outfit: 'hoodie', palette: 'teal', hair: 'fringe', glasses: true },
    ],
    suggestions: [l('汇报确实重要，核心代码和设计也值得一起讲清楚。', 'The presentation mattered. Let’s name the code and design contributions too.'), l('我们把每个人做的部分写进总结吧。', 'Let’s put everyone’s contribution in the write-up.'), l('执行？核心代码可是我写的。', 'Execution? I wrote the core code.')],
    source: { title: l('原创虚构剧情：庆功时的贡献归属', 'Original fiction: claiming credit after a team win'), type: 'original-fiction', path: 'wiki/archive/specs/spec-3d-integration.md#fiction' },
  },
  {
    id:'elevator',space:'elevator',category:l('电梯口','Elevator lobby'),title:l('私下谈话，怎么被当众追问了？','A private conversation becomes hallway gossip'),
    subtitle:l('会议散了，人还没散。电梯口，有人要你当场表态。','The meeting is over. In the elevator lobby, someone still wants an answer.'),room:l('12 楼 · 电梯等候区','Floor 12 · Elevator lobby'),time:'15:20',
    goal:l('不交出私下谈话，也不让沉默变成默认。','Keep a private conversation private without letting silence become agreement.'),opening:l('你刚从 HR 那儿出来，是在谈离职吧？都是自己人，说说呗。','You just came out of HR. Talking about leaving? We’re all colleagues—tell us.'),openingCue:l('方经理转向你。电梯停在本层，乔宁与程悦也在等。','Fang turns to you. The elevator is stopped here; Qiao and Cheng are waiting too.'),
    characters:[
      {id:'fang',name:l('方经理','Fang'),role:l('部门经理','Department manager'),description:l('刚开完会。想尽快知道团队里有没有变动，习惯在走廊问个明白。','Just left the meeting. Wants to know about team changes and tends to ask in the hallway.'),outfit:'blazer',palette:'sage',hair:'bob',glasses:true},
      {id:'qiao',name:l('乔宁','Qiao'),role:l('协作同事','Collaborating teammate'),description:l('和你交接过演示材料，只能确认自己经手的内容。','Worked with you on the demo handoff. Can confirm only the material they handled.'),outfit:'polo',palette:'charcoal',hair:'crop',glasses:false},
      {id:'cheng',name:l('程悦','Cheng'),role:l('隔壁组同事','Colleague from another team'),description:l('碰巧一起等电梯。不想被卷进传闻，也没有看过私下谈话或故障记录。','Happens to be waiting too. Wants to avoid gossip and has seen neither the private conversation nor incident records.'),outfit:'shirt',palette:'terracotta',hair:'bun',glasses:false},
    ],suggestions:[l('谈话内容我不在这里分享。工作安排有变化，我会正式说。','I’m keeping that conversation private. I’ll communicate any work changes formally.'),l('您现在需要确认工作安排，还是想知道谈话细节？','Do you need to confirm work arrangements, or the conversation details?')],
    source:{title:l('原创虚构剧情：电梯口的追问','Original fiction: questions in the elevator lobby'),type:'original-fiction',path:'wiki/archive/specs/spec-3d-places.md#fiction'},
  },
  {
    id:'office',space:'office',category:l('办公室','Office'),title:l('快下班了，三件活都归你？','Three more tasks before you leave?'),subtitle:l('屏幕还亮着，临时任务已经落到你的桌上。','Your screen is still on. Extra work has already landed on your desk.'),room:l('项目组 · 开放办公室','Project team · Open office'),time:'17:50',
    goal:l('把任务、优先级与分工谈清楚，不替所有人承诺。','Clarify tasks, priorities and ownership without committing for everyone.'),opening:l('客户六点半要材料。你顺手把数据、排版、检查都收个尾，没问题吧？','The client needs this at 6:30. Finish the data, layout and checks for us—no problem, right?'),openingCue:l('何主管站在你的桌前。宁姐还在自己的工位，瑞瑞拿着未确认的数据清单。','He is standing at your desk. Ning is at her workstation; Rui has an unconfirmed data list.'),
    characters:[
      {id:'he',name:l('何主管','He'),role:l('项目主管','Project lead'),description:l('想准时发给客户，但还没有确认每个人的剩余时间。','Wants to send the material on time, without having checked everyone’s availability.'),outfit:'suit',palette:'charcoal',hair:'short',glasses:true},
      {id:'ning',name:l('宁姐','Ning'),role:l('资深同事','Senior colleague'),description:l('负责排版与对外讲解。重视效率，也习惯替别人总结重点。','Handles layout and presentation. Values speed and often summarizes for others.'),outfit:'blazer',palette:'oat',hair:'wave',glasses:false},
      {id:'rui',name:l('瑞瑞','Rui'),role:l('数据同事','Data teammate'),description:l('能核对数据来源。没有替你或宁姐答应今晚的工作。','Can check the data sources. Has not agreed to tonight’s work for you or Ning.'),outfit:'crewneck',palette:'teal',hair:'fringe',glasses:false},
    ],suggestions:[l('这三项分别需要谁确认？先把今晚必须发的范围说清楚。','Who confirms each of the three tasks? Let’s define what must go out tonight.'),l('我先确认自己的时间，其他人的部分请他们本人确认。','I’ll confirm my availability. Let the others confirm their own parts.')],
    source:{title:l('原创虚构剧情：办公室临时任务','Original fiction: extra work in the office'),type:'original-fiction',path:'wiki/archive/specs/spec-3d-places.md#fiction'},
  },

];

export const ui = {
  more:l('更多','More'),sceneOptions:l('现场设置','Scene options'),sceneActions:l('动作','Actions'),evidenceShort:l('资料','Notes'),hintShort:l('提示','Hint'),walkShort:l('走动','Move'),hideMovement:l('收起走动操作','Hide movement controls'),joystick:l('按住摇杆并拖动，或用方向键移动','Hold and drag the joystick, or use arrow keys to move'),joystickHint:l('拖动走动 · 松手停下','Drag to move · Release to stop'),movementBack:l('回到起始位置','Return to the starting position'),soundSetting:l('人物朗读与环境声','Dialogue and ambience'),followSetting:l('视线跟随发言人','Follow the speaker'),languageSetting:l('语言','Language'),viewSetting:l('视角','View'),liftOpenShort:l('开门','Open doors'),liftCloseShort:l('关门','Close doors'),
  practiceLength:l('练习长度','Practice length'), chooseOpening:l('从哪件事开始','Choose the opening'), newStory:l('开一局新的','Start a new scene'),
  speakTo:l('对谁说','Speak to'),wholeTable:l('在场的人','Everyone here'),audibleToTable:l('在场的人也听得见','The others can hear you too'),
  extendDinner:l('继续聊 · 加 {n} 回合','Keep talking · {n} more turns'),heardBefore:l('开口前听到的话','What you heard before speaking'),
  navLabel: l('主导航', 'Main navigation'), categoryLabel: l('现场类型', 'Scene categories'), conversationLabel: l('现场对话', 'Scene conversation'),
  switchLanguage: l('Switch to English', '切换为中文'), documentTitle: l('SocialCoach — 3D 实景练习', 'SocialCoach — 3D rehearsal'),
  tableBrief: l('现场与人物', 'Scene brief'), backToTable: l('回到现场', 'Back to the scene'),
  fullscreen: l('全屏体验', 'Enter fullscreen'), exitFullscreen: l('退出全屏', 'Exit fullscreen'), recenter: l('重新看向发言人', 'Refocus on the speaker'),
  attentionFollow:l('关注','Following'), freeLook:l('自由环顾','Free look'), resumeAttention:l('恢复关注发言人','Resume following the speaker'), enableFreeLook:l('切换自由环顾','Switch to free look'), resumeShort:l('继续关注','Resume'), freeShort:l('自由环顾','Look freely'),
  lookHint: l('拖动环顾 · WASD / 点击地面走动', 'Drag to look · WASD / Click the floor to walk'),
  mobileLookHint:l('拖动画面环顾 · 点脚印走动','Drag to look · Tap footsteps to move'),
  cameraLabel: l('现场视角。拖动或方向键环顾，WASD 移动，点击地面走过去，Home 看向发言人。', 'Room view. Drag or arrow keys to look; WASD to move; click the floor to walk; Home to follow the speaker.'),
  firstPerson:l('第一人称','First person'),thirdPerson:l('第三人称','Third person'),switchToFirstPerson:l('切换到第一人称','Switch to first person'),switchToThirdPerson:l('切换到第三人称','Switch to third person'),
  standUp:l('起身走动','Stand & explore'),returnSeat:l('回到座位','Back to your seat'), movement:l('移动你的角色','Move your character'),
  forward:l('向前走','Walk forward'),backward:l('向后走','Walk backward'),left:l('向左走','Walk left'),right:l('向右走','Walk right'),
  lookAt:l('看向 TA','Look at them'),goNear:l('走到旁边','Walk over'),invite:l('招呼过来','Call them over'),
  standing:l('站立','Standing'),seated:l('入座','Seated'),walking:l('走动中','Walking'),
  zoneLobby:l('电梯等候区','Elevator lobby'),zoneCabin:l('停层轿厢','Stopped elevator car'),zoneDesk:l('工位旁','Workstation'),zoneBoard:l('白板旁','By the whiteboard'),returnLobby:l('回到等候处','Back to the lobby'),liftApproach:l('正在走向电梯按钮','Walking to the elevator panel'),liftOpen:l('走近开门','Walk over & open'),liftClose:l('走近关门','Walk over & close'),liftOpening:l('电梯门正在打开','Doors opening'),liftClosing:l('电梯门正在关闭','Doors closing'),liftOpened:l('电梯停在本层 · 门已打开','Stopped here · Doors open'),liftClosed:l('电梯停在本层 · 门已关闭','Stopped here · Doors closed'),liftSafety:l('门口有人，门保持打开','Someone is in the doorway; doors stay open'),officeBoard:l('走到白板旁','Walk to the whiteboard'),zoneTable:l('桌边','By the table'),zoneSide:l('房间一侧','Side of the room'),zoneDoor:l('门边','By the door'),
  roomEvidence:l('发言时的位置','Where you spoke'),
  movementAbout:l('第一人称置身饭桌，第三人称能看到你的角色。点脚印展开摇杆，拖动走动、松手停下；也可用 WASD 或点击空地移动。走向人物时会持续关注 TA；拖动镜头可自由环顾，在「更多」中恢复跟随。主位人物留在座位上，其他人只在接受招呼后走过来；你走远时，TA 会回座。','First person puts you at the table; third person shows your character. Tap footsteps to reveal a joystick: drag to move, release to stop. WASD and clicking the floor also work. Walking over keeps your attention on that person. Drag to look freely, or resume following from More. The person at the head stays seated. Others may accept an invitation, approach, and return to their seats when you move away.'),
  phoneAction:l('递手机','Offers a phone'),photoAction:l('准备合照','Prepares a photo'),momentLabel:l('现场动作','In this scene'), pauseMoment:l('暂停这段','Pause this moment'), resumeMoment:l('继续这段','Resume this moment'), momentPaused:l('已暂停，你可以慢慢想','Paused. Take your time.'), momentWaiting:l('可以做一个动作，也可以直接开口','Choose an action, or speak freely.'), momentNudge:l('对方还在等你的回应','They are still waiting for your reply.'), momentMoving:l('正在走近，抵达后完成动作','Walking over. The action happens on arrival.'), cancelAction:l('取消走近','Cancel the approach'), momentDone:l('你可以继续开口','You can speak now'), momentTyping:l('慢慢组织语言，动作不会替你作决定','Take your time. No action will be chosen for you.'), actionLog:l('你做过的动作','Your actions'), actionSaid:l('随后，桌上回应','The table’s response'), eventEvidence:l('发言时的现场事件','Scene moment when you spoke'), calendarShort:l('三','WED'),familyGlyph:l('福','JOY'),trophyGlyph:l('Ⅰ','Ⅰ'),calendarDay:l('周三 · 上线窗口','Wednesday · Launch window'), phoneCard:l('介绍对象 · 照片','An introduction · Photo'), photoScreen:l('全员合照','Team photo'), familyWish:l('团圆','Together'), trophyLabel:l('团队一等奖','Team · First prize'),
  needPrompt: l('给我一点提示', 'Need a starting line?'), finished: l('这场对话，先说到这里。', 'Let’s leave this conversation here.'),
  shortFormat: l('默认 12 回合，可继续聊。', '12 turns by default. Extend when needed.'),
  subtitle: l('你的情商练习场', 'Your social rehearsal space'), edition: l('3D 实景练习', '3D rehearsal'),
  scenes: l('换场景', 'Choose a scene'), recap: l('对话记录', 'Conversation'), about: l('体验说明', 'About this experience'),
  historyTitle:l('这场对话，聊到哪了','The conversation so far'),historyOpening:l('开场','Opening'),historyLatest:l('最近一句','Latest'),historyYou:l('你','You'),historyAction:l('你的动作','Your action'),historyReview:l('查看本局回顾','View the recap'),historyReturn:l('回到现场','Back to the scene'),historyFull:l('查看完整原话','Read the full line'),
  eyebrow: l('换一个现场，把难说的话说出来。', 'Step into the scene. Say the difficult thing.'),
  intro: l('对方已经开口，你怎么接？', 'They’ve already spoken. What do you say?'),
  start: l('开始接话', 'Start responding'), continue: l('继续这一局', 'Continue this scene'),
  target: l('这次，试着做到', 'Your aim this time'), cast: l('在场的人', 'Who is here'),
  sceneHint: l('拖动看看周围 · 点击人物查看关系', 'Drag to look around · Select a person to meet them'),
  speaking: l('正在说话', 'Speaking'), watching: l('在看着你', 'Watching you'), seat: l('你的座位', 'Your seat'),
  turn: l('回合', 'Turn'), demo: l('内置剧情', 'Scripted rehearsal'), live: l('模型导演', 'AI director'),
  modeDetail: l('内置演练会跟随话题，但理解范围有限。接入模型后，角色会结合整段对话回应。', 'Built-in rehearsal follows topics with limited understanding. A connected model responds using the full conversation.'),
  sceneLoading:l('正在布置现场…','Preparing the scene…'),
  replyKeyHint:l('Enter 开口 · Shift + Enter 换行','Enter to speak · Shift + Enter for a new line'),
  voiceStart:l('语音输入','Voice input'),voiceStop:l('停止语音输入','Stop voice input'),voiceCancel:l('取消收音','Cancel listening'),
  voiceHint:l('语音先转成草稿 · 浏览器可能联网识别','Voice becomes a draft · Browser recognition may go online'),
  voiceStarting:l('正在打开麦克风，请留意浏览器权限提示…','Opening the microphone. Check your browser’s permission prompt…'),
  voiceListening:l('正在收音 · 点输入框即可停下改字','Listening · Tap the reply to stop and edit'),
  voiceStopping:l('正在收好最后一句 · 也可以直接点输入框修改','Finishing your last sentence · You can tap the reply to edit now'),
  voiceInterim:l('识别中，尚未写入草稿','Still recognizing, not yet in the draft'),
  voiceReady:l('已转成草稿。可以修改，确认后再开口。','Added to your draft. Edit it, then press Speak when ready.'),
  voiceEditing:l('收音已停止，文字已保留。修改后再开口。','Voice stopped and your words are kept. Edit, then press Speak.'),
  voiceCancelled:l('已停止收音，已确认的文字还在。','Listening stopped. Confirmed words are still in your draft.'),
  voiceLimit:l('草稿已到 500 字，收音已停。请先检查或缩短。','Your draft reached 500 characters. Listening stopped; review or shorten it.'),
  voiceUnsupported:l('这个浏览器没有提供语音识别。可以继续打字，或换支持语音的浏览器。','This browser does not provide speech recognition. Keep typing or use a browser that supports it.'),
  voicePermission:l('未能使用麦克风。请在浏览器的网站权限中允许麦克风，再重试；草稿还在。','Microphone access was not allowed. Enable it in this site’s browser permissions and retry. Your draft is safe.'),
  voiceMicrophone:l('没有收到麦克风声音。请检查设备是否连接、是否被其他应用占用。','No microphone audio was available. Check the device connection and whether another app is using it.'),
  voiceNetwork:l('浏览器语音服务没有连上。检查网络后重试，也可以继续打字。','The browser’s speech service could not connect. Check your connection and retry, or keep typing.'),
  voiceLanguage:l('浏览器语音服务暂不支持当前语言。可以切换语言，或继续打字。','The browser’s speech service does not support this language. Switch language or keep typing.'),
  voiceEmpty:l('没有识别到清楚的话。靠近麦克风再试一次，或继续打字。','No clear speech was recognized. Move closer to the microphone and retry, or keep typing.'),
  voiceUnavailable:l('浏览器未能开始或完成识别。请重试，草稿还在。','The browser could not start or finish recognition. Retry; your draft is safe.'),
  evidenceTitle:l('开局资料','Opening evidence'),evidenceAbout:l('这是开局时的资料。之后是否改过、谁答应了什么，以对话记录为准。','These are the opening notes. Later changes and commitments are recorded in the conversation.'),evidenceFiction:l('原创虚构情境，人物和资料均为剧情设定。','An original fictional scene. Characters and documents are story material.'),interjection:l('插话','Joins in'),canContinue:l('可以续聊','You can continue'),voiceOutputAbout:l('「更多」中的声音设置可开启人物台词朗读与环境声。朗读由浏览器提供，音色和可用性因设备而异；不支持时继续显示字幕。语音输入开始时会停止朗读。','The sound setting in More enables dialogue narration and ambience. Your browser provides narration; voices and availability vary by device. Captions remain when narration is unavailable. Starting speech input stops narration.'),
  voiceAbout:l('点击麦克风开始语音。随时点输入框就能停止收音并修改，眼前识别出的文字会留在草稿里；再点麦克风可接着补充。检查后点击「开口」，语音不会自动发送。当前界面语言决定中文或英文识别。语音由浏览器处理，可能发送给浏览器的在线识别服务；本应用不接收或保存音频，只保存文字草稿。浏览器不支持时仍可打字。','Click the microphone to dictate. Tap the reply anytime to stop and edit; the words you can see stay in your draft. Click the microphone again to add more. Review, then press Speak; voice never sends automatically. Recognition follows the interface language. Your browser processes speech and may send audio to its online recognition service. This app does not receive or store audio; it saves text drafts. Typing remains available when recognition is unsupported.'),
  type: l('你的回应', 'Your reply'),
  placeholder: l('你怎么接这句话…', 'How do you respond?'), send: l('开口', 'Speak'),
  thinking:l('对方正在接话…','They are responding…'), suggestion: l('也可以从这句话开始', 'Or start with one of these'),
  end: l('结束并回看', 'Finish and reflect'), restart:l('再练一次','Try this scene again'),
  download: l('导出这一局', 'Export this scene'), close: l('关闭', 'Close'),
  roomTone: l('包厢环境声', 'Room ambience'), quiet: l('开启人物朗读与环境声', 'Enable dialogue and ambience'), soundOn: l('关闭朗读与环境声', 'Mute dialogue and ambience'),
  reportTitle: l('刚才那句话，改变了什么？', 'What did your words change?'),
  reportIntro: l('先看你真正说了什么，再看现场发生了什么。', 'First, your actual words. Then, what happened in the scene.'),
  reportEmpty: l('还没有你的发言。开口说一句，再来回看。', 'You haven’t spoken yet. Speak, then come back here.'),
  evidence: l('你说', 'You said'), after: l('随后', 'Then'),
  reportNote: l('这是剧情回放，不是能力评分。换一种说法，再看在场的人的反应。', 'This is a story replay, not a skill score. Try different words and see how they respond.'),
  local: l('记录留在这个设备，可随时导出。', 'Your conversation stays on this device. Export it anytime.'),
  newDinner: l('选择新的场景会替换当前这一局。先导出可以保留记录。', 'A new scene replaces this conversation. Export it first to keep a copy.'),
  change: l('去这个场景', 'Go to this scene'),
  error: l('这次回应没有接上，你的话还在。请重试。', 'The reply didn’t arrive. Your words are still here. Try again.'),
  storageError: l('浏览器暂时无法保存；离开前可以导出这一局。', 'Your browser cannot save right now. Export before leaving.'),
  badSave: l('上次记录无法读取，已保留原文件；导出后可重新开始。', 'The previous save could not be read. It is preserved; export it before starting again.'),
  downloadSave: l('导出原记录', 'Export previous save'),
  sceneFallback: l('这个浏览器暂时无法显示 3D。仍然可以和在场的人练习。', '3D is unavailable in this browser. You can still rehearse with these people.'),
  aboutTitle: l('不只听见话，也看见局面。', 'Hear the words. See the room.'),
  aboutBody:l('SocialCoach 的 3D 实景练习。饭桌、电梯口、办公室，每个现场都有三位立场不同的人。切换视角、走近人物、做一个动作，或者直接开口。人物会接话，也可能插话；他们不会因为你客气就立刻让步。','SocialCoach in 3D: dinner, elevator lobby and office. Three people with different stakes in each scene. Switch views, walk over, choose an action or speak directly. They respond and may interrupt; politeness alone does not make them back down.'),
  source: l('剧情出处', 'Story source'), sourceDetail: l('三个场景均为本原型原创的虚构剧情，用于检验交互体验；不作为真实案例或研究结论。', 'All three scenes are original fiction for testing the interaction. They are not real cases or research findings.'),
  modelAbout: l('接入模型后，可以自由对话；连接不可用时，仍可探索场景、查看已有记录。', 'Connect a model for free-form conversation. When it is unavailable, you can still explore the scene and view saved conversations.'),
  privacyAbout: l('没有账号。练习记录只保存在你的浏览器。使用模型时，本局对话、虚拟包厢的位置和姿态、饭局事件及已完成动作会发送给配置的模型服务。', 'No account. Your rehearsal stays in your browser. In AI mode, the conversation, virtual room position and posture, dinner moments and completed actions go to the configured model provider.'),
  footer: l('想说的话，说出来。', 'Say the thing you’ve been not saying.'),
};

export const emotions: Record<Emotion, L> = { neutral: l('观察', 'Observing'), pressing: l('施压', 'Pressing'), annoyed: l('不悦', 'Annoyed'), thinking: l('斟酌', 'Considering'), supportive: l('接话', 'Joining in') };
export const gestures: Record<Gesture, L> = { idle: l('看向你', 'Looks at you'), toast: l('举杯', 'Raises a glass'), lean: l('前倾', 'Leans forward'), fold: l('抱臂', 'Folds arms'), nod: l('点头', 'Nods') };

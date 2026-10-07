import { L, type L as Localized, type SkillId } from './taxonomy';

export interface VideoLesson {
  id: string;
  title: Localized;
  synopsis: Localized;
  skills: SkillId[];
  keywords: string[];
  video: { src: string; poster: string; cover: string; seconds: number; captions: { lang: 'zh' | 'en'; src: string; label: Localized }[] };
  source: { label: Localized; href: string; provenance: Localized };
  practice: { scene: string; opening: string; label: Localized };
  chapters: { at: number; title: Localized }[];
  transcript: { from: number; to: number; text: Localized }[];
  takeaways: { at: number; title: Localized; quote: Localized; explanation: Localized }[];
  boundary: Localized;
}

/** Timings and quoted dialogue come from the supplied final film, not its earlier storyboard. */
export const VIDEO_LESSONS: VideoLesson[] = [{
  id: 'video-dinner-toast',
  title: L('饭局上，领导替你答应了', 'Your boss promises on your behalf'),
  synopsis: L('一杯酒，一个替你答应的日期。看三种回应，再自己接住这场压力。', 'A toast and a deadline you never agreed to. Compare three responses, then try the conversation yourself.'),
  skills: ['standing-up', 'communication', 'resolving-conflicts'],
  keywords: ['饭局', '领导', '客户', '拒酒', '边界', '交付', '日期', 'dinner', 'boss', 'client', 'toast', 'deadline', 'boundary'],
  video: {
    src: '/videos/learning/dinner-toast.mp4', poster: '/videos/learning/dinner-toast-frame.jpg', cover: '/videos/learning/dinner-toast-poster.png', seconds: 1696 / 30,
    captions: [
      { lang: 'zh', src: '/videos/learning/dinner-toast.zh.vtt', label: L('中文', 'Chinese') },
      { lang: 'en', src: '/videos/learning/dinner-toast.en.vtt', label: L('English', 'English') },
    ],
  },
  source: {
    label: L('饭局承诺', 'Dinner promises'),
    provenance: L('用户提供的 SocialCoach 原创虚构动画，源于职场饭局场景。', 'User-supplied SocialCoach fictional animation based on the work dinner scene.'),
    href: 'https://github.com/GeminiLight/SocialCoach/blob/main/app/src/features/dinner/lib/story.ts',
  },
  practice: { scene: 'work', opening: 'work-toast', label: L('进入这场饭局练习', 'Try this dinner conversation') },
  chapters: [
    { at: 0, title: L('压力怎么来的', 'The pressure') },
    { at: 14.5, title: L('直接拒绝', 'Blunt refusal') },
    { at: 21.5, title: L('勉强答应', 'Giving in') },
    { at: 30, title: L('换个说法', 'Another response') },
  ],
  transcript: [
    { from: 0, to: 3.5, text: L('陈总：来，敬林总！大家都举杯了，就等你了。', 'Chen: A toast to Ms. Lin! Everyone has raised a glass. We are waiting for you.') },
    { from: 3.5, to: 6, text: L('陈总：你这杯不跟，是不给我面子？', 'Chen: You will not join this toast? Are you refusing me respect?') },
    { from: 6, to: 10.5, text: L('陈总：林总，周三肯定上线！你当着林总再确认一句：没问题，对吧？', 'Chen: Ms. Lin, we will definitely launch on Wednesday! Confirm it for her: no problem, right?') },
    { from: 10.5, to: 12.5, text: L('你心里想：测试还有两项没通过……', 'You think: Two tests still have not passed…') },
    { from: 12.5, to: 14.5, text: L('一杯酒，一个替你答应的日期。', 'A drink, and a date promised on your behalf.') },
    { from: 14.5, to: 17.3, text: L('你：我不喝酒。周三也做不完。', 'You: I am not drinking. We cannot finish by Wednesday either.') },
    { from: 17.3, to: 19.5, text: L('林总：那到底什么时候能好？', 'Lin: Then when will it actually be ready?') },
    { from: 19.5, to: 21.5, text: L('影片旁白：话没错，但领导当着客户下不来台。', 'Film commentary: The facts are right, but the boss feels put on the spot in front of the client.') },
    { from: 21.5, to: 25.5, text: L('倒带。你：好好好，我喝！周三没问题！', 'Rewind. You: Fine, I will drink! Wednesday is no problem!') },
    { from: 25.5, to: 28.5, text: L('周三，两项测试没通过。林总：不是说没问题吗？陈总：这块是他负责的。', 'Wednesday. Two tests have failed. Lin: Did you not say it was fine? Chen: That part is his responsibility.') },
    { from: 28.5, to: 30, text: L('影片旁白：当场过关，周三背锅。', 'Film commentary: You get through dinner, then take the blame on Wednesday.') },
    { from: 30, to: 32.333, text: L('倒带。你：陈总，这杯我一定敬。', 'Rewind. You: Mr. Chen, I will join this toast.') },
    { from: 32.333, to: 35.533, text: L('你：今晚我还得回去盯那两项测试，以茶代酒，心意一点不少。', 'You: I still need to check those two tests tonight. I will toast with tea, with just as much appreciation.') },
    { from: 35.533, to: 37.866, text: L('陈总：哈哈，行！影片要点：拒的是酒，不是人。', 'Chen: Ha, all right! Film point: Decline the alcohol without rejecting the person.') },
    { from: 37.866, to: 40.2, text: L('你：周三能上的，我们先上。', 'You: Let us launch the parts that are ready on Wednesday.') },
    { from: 40.2, to: 44.2, text: L('你：剩下两项测试，我明天中午前把结果发您，给一个准确日期。', 'You: I will send the remaining two test results by noon tomorrow and give you a confirmed date.') },
    { from: 44.2, to: 45.03, text: L('林总：这样我回去好汇报。', 'Lin: That gives me something to report back.') },
    { from: 45.03, to: 49.033, text: L('陈总：就按这个来！大家碰杯。', 'Chen: Let us do that! The group clinks glasses.') },
    { from: 49.033, to: 52.533, text: L('影片总结：面子给到人，承诺落到事。', 'Film summary: Show respect to the person. Keep the promise grounded in the work.') },
    { from: 52.533, to: 1696 / 30, text: L('SocialCoach：这些难开口的场合，先在这里练一遍。想说的话，说出来。', 'SocialCoach: Rehearse difficult conversations here first. Say the thing you have been not saying.') },
  ],
  takeaways: [
    {
      at: 30, title: L('先把两件事分开', 'Separate the two decisions'),
      quote: L('“陈总，这杯我一定敬。”', '“Mr. Chen, I will join this toast.”'),
      explanation: L('影片用茶表达参与，同时拒绝酒精。你可以直接说“不喝”；无需为了拒绝编造理由，也不必等对方同意才有边界。', 'The film joins the toast with tea while declining alcohol. You can simply decline; do not invent an excuse or wait for approval before setting a boundary.'),
    },
    {
      at: 37.866, title: L('让范围比保证更具体', 'Be specific about scope'),
      quote: L('“周三能上的，我们先上。”', '“Let us launch the parts that are ready on Wednesday.”'),
      explanation: L('这句保留了交付方向，但“能上的”还不够具体。实际对话里要继续确认哪一部分、由谁验收；未确认的新报表不能默认为已承诺。', 'This keeps delivery moving, but “the parts that are ready” is still vague. Agree which parts and who accepts them; do not silently include the unconfirmed new report.'),
    },
    {
      at: 40.2, title: L('只承诺能控制的下一步', 'Promise a step you can control'),
      quote: L('“我明天中午前把结果发您。”', '“I will send the results by noon tomorrow.”'),
      explanation: L('这给了可核对的下一步，而不是保证所有测试都会通过。这个时间也要先确认自己做得到；暂时未知的上线日期，可以约定何时再确认。', 'This gives a checkable next step instead of promising that every test will pass. Confirm you can meet the checkpoint; if the launch date is unknown, agree when to confirm it.'),
    },
  ],
  boundary: L('这是剪辑后的虚构示范。真实练习中，对方可能继续劝酒、反问或追问日期；一句话不保证让步，也没有必须照背的答案。', 'This is an edited fictional demonstration. In practice, the other person may keep pushing, question you or demand a date. A line does not guarantee agreement, and you do not need to memorize an answer.'),
}, {
  id: 'video-elevator-hr',
  title: L('领导当众问：是不是要离职？', 'Your boss asks: are you resigning?'),
  synopsis: L('电梯口，旁人都在听。看三种回应，练习把私事与工作安排分开。', 'At the elevator, colleagues can hear everything. Compare three responses and separate private matters from work plans.'),
  skills: ['standing-up', 'communication', 'emotion-regulation'],
  keywords: ['HR', '人力资源', '电梯', '领导', '同事', '隐私', '离职', '边界', '工作安排', 'elevator', 'boss', 'privacy', 'leaving', 'resign', 'resigning', 'rumor', 'boundary'],
  video: {
    src: '/videos/learning/elevator-hr.mp4', poster: '/videos/learning/elevator-hr-frame.jpg', cover: '/videos/learning/elevator-hr-poster.png', seconds: 1505 / 30,
    captions: [
      { lang: 'zh', src: '/videos/learning/elevator-hr.zh.vtt', label: L('中文', 'Chinese') },
      { lang: 'en', src: '/videos/learning/elevator-hr.en.vtt', label: L('English', 'English') },
    ],
  },
  source: {
    label: L('当众问离职', 'Asked about resigning'),
    provenance: L('用户提供的 SocialCoach 原创虚构动画，源于电梯口隐私场景。', 'User-supplied SocialCoach fictional animation based on privacy at the elevator.'),
    href: 'https://github.com/GeminiLight/SocialCoach/blob/main/app/src/features/dinner/lib/story.ts',
  },
  practice: { scene: 'elevator', opening: 'elevator-privacy', label: L('进入这场电梯对话', 'Try this elevator conversation') },
  chapters: [
    { at: 0, title: L('当众被追问', 'Asked in public') },
    { at: 10.5, title: L('慌着解释', 'Explaining in a panic') },
    { at: 20, title: L('反问顶回去', 'Pushing back sharply') },
    { at: 27.5, title: L('换个说法', 'Another response') },
  ],
  transcript: [
    { from: 0, to: 2, text: L('你刚从 HR 出来，电梯口的领导和两位同事看向你。', 'You leave HR. Your boss and two colleagues turn toward you at the elevator.') },
    { from: 2, to: 5, text: L('方经理：刚从 HR 出来？是不是准备走了？', 'Fang: Just came out of HR? Are you planning to leave?') },
    { from: 5, to: 8.5, text: L('方经理：乔宁也在，一起说说，省得大家猜。', 'Fang: Qiao is here too. Tell us together so nobody has to guess.') },
    { from: 8.5, to: 10.5, text: L('你心里想：说什么，都会被传出去……', 'You think: Whatever I say will get passed around…') },
    { from: 10.5, to: 13.833, text: L('你：没有没有！就是问了下……社保和年假……', 'You: No, no! I was just asking about… social insurance and annual leave…') },
    { from: 13.833, to: 15.5, text: L('方经理：哦——社保啊。', 'Fang: Oh—social insurance.') },
    { from: 15.5, to: 17.567, text: L('影片群聊：同事 A：刚在电梯口……他在问社保？同事 B：听说要走了。同事 C：真的假的？下家定了？', 'The film shows a group chat. Colleague A: At the elevator… he asked about social insurance? B: I heard he is leaving. C: Really? Has he found his next job?') },
    { from: 17.567, to: 20, text: L('影片旁白：解释越多，猜测越多。', 'Film commentary: More explanation leads to more guessing.') },
    { from: 20, to: 22.533, text: L('倒回去，再试一种。你：这跟你有关系吗？', 'Rewind and try another response. You: What does this have to do with you?') },
    { from: 22.533, to: 25.167, text: L('方经理：我是你领导，问一句都不行？', 'Fang: I am your boss. Can I not even ask a question?') },
    { from: 25.167, to: 27.5, text: L('影片旁白：隐私守住了，关系丢了。', 'Film commentary: Privacy is protected, but the relationship suffers.') },
    { from: 27.5, to: 31.7, text: L('倒回去。你：和 HR 聊的是我自己的事，这儿不方便说。', 'Rewind. You: My conversation with HR was personal. This is not the place to discuss it.') },
    { from: 31.7, to: 34.433, text: L('方经理：那……会不会影响项目？', 'Fang: Then… will it affect the project?') },
    { from: 34.433, to: 38.433, text: L('你：项目我照常推进。您要是不放心，下午约十分钟？', 'You: I am continuing the project as planned. If you are concerned, shall we set aside ten minutes this afternoon?') },
    { from: 38.433, to: 43.167, text: L('方经理：行，三点。电梯开门，大家离开等候区。', 'Fang: All right, three o’clock. The elevator opens and the group leaves the waiting area.') },
    { from: 43.167, to: 46.167, text: L('影片总结：私事不当众说，工作事单独谈。', 'Film summary: Keep private matters out of public conversation. Discuss work separately.') },
    { from: 46.167, to: 1505 / 30, text: L('SocialCoach：难开口的场合，先在这里练一遍。想说的话，说出来。', 'SocialCoach: Rehearse difficult conversations here first. Say the thing you have been not saying.') },
  ],
  takeaways: [
    {
      at: 28.167, title: L('说明边界，不补私人细节', 'State the boundary without private details'),
      quote: L('“和 HR 聊的是我自己的事，这儿不方便说。”', '“My conversation with HR was personal. This is not the place to discuss it.”'),
      explanation: L('这句说清了哪些内容不在这里讨论，没有替“是不是要走”的猜测提供答案。你可以明确拒绝，不需要编造谈话内容来证明自己。', 'This names what you will not discuss here without answering the speculation about leaving. You can decline clearly; you do not need to invent details to justify yourself.'),
    },
    {
      at: 34.433, title: L('工作安排另说，只讲真实情况', 'Discuss work using the facts'),
      quote: L('“项目我照常推进。”', '“I am continuing the project as planned.”'),
      explanation: L('把领导对工作的担忧与私人谈话分开。这句只能在项目确实照常推进时说；若存在影响，单独谈清需要调整的任务，不能为了避开追问保证一切没问题。', 'Separate concern about work from your private conversation. Say this only if the project is proceeding as planned. If something is affected, discuss the tasks that need adjustment privately instead of promising that everything is fine.'),
    },
    {
      at: 34.433, title: L('给一个更合适的沟通场合', 'Offer a more suitable setting'),
      quote: L('“您要是不放心，下午约十分钟？”', '“If you are concerned, shall we set aside ten minutes this afternoon?”'),
      explanation: L('影片把工作沟通转到单独约谈，并得到“三点”的回应。真实对话还要确认双方时间与议题；同意约谈不等于同意公开私人内容，也不保证对方停止追问。', 'The film moves work discussion to a separate meeting and gets a three-o’clock agreement. Confirm the time and topic in a real conversation. Agreeing to meet does not authorize public disclosure or guarantee that questioning stops.'),
    },
  ],
  boundary: L('这是剪辑后的虚构示范。影片中的传言与让步是剧情，不是对你现实处境的判断。守住隐私并不必然损害关系；真实对方可能继续追问，你仍可以澄清边界、修复表达或另约沟通。', 'This is an edited fictional demonstration. Its rumors and agreements are plot, not judgments about your situation. Protecting privacy does not inevitably harm a relationship. The other person may keep asking; you can restate the boundary, repair your wording or arrange a separate conversation.'),
}];

export function chapterAt(lesson: VideoLesson, seconds: number): number {
  if (!Number.isFinite(seconds) || seconds < 0) return 0;
  const index = lesson.chapters.findLastIndex(chapter => seconds >= chapter.at);
  return Math.max(0, index);
}

export function matchesVideo(lesson: VideoLesson, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const text = [lesson.title.zh, lesson.title.en, lesson.synopsis.zh, lesson.synopsis.en, ...lesson.keywords].join(' ').toLowerCase();
  // Short Latin terms such as HR are words, not substrings of "three".
  return /^[a-z]{1,2}$/.test(q) ? new RegExp(`(?:^|[^a-z0-9])${q}(?:$|[^a-z0-9])`).test(text) : text.includes(q);
}

// Bilingual copy for the official site. Every user-facing string is an
// L = { zh, en } object, read with pick(v, lang), the same convention as the app.
//
// Product facts come from wiki/00-product-proposal.md and README.md; the hero
// copy is the approved header from the marketing workspace. Do not add claims
// that are not defensible from the repo (no user counts or "first" claims).

export const L = (zh, en) => ({ zh, en });
export const pick = (v, lang) => (v && typeof v === "object" && "zh" in v ? v[lang] : v);

export const site = {
  // Where the built site lives. GitHub Actions overrides this with whatever
  // configure-pages reports; the account's Pages domain makes that this URL.
  defaultUrl: "https://tianfuwang.tech/SocialCoach",
  // Geo-aware share URL redirects to a platform homepage and drops subpaths.
  appUrl: "https://socialcoach.aurax.live",
  appDeepUrl: "https://socialcoach-ai.vercel.app",
  repoUrl: "https://github.com/GeminiLight/SocialCoach",
  arxivId: "2606.04155",
  arxivUrl: "https://arxiv.org/abs/2606.04155",
  pdfUrl: "https://arxiv.org/pdf/2606.04155",
  // Copied from ../docs at build time so Scholar can find PDF + abstract on one host.
  localPdf: "paper/socialcoach-2606.04155.pdf",
  supplementaryUrl: "https://tianfuwang.tech/SocialCoach-SupplementaryMaterials/",
  name: "SocialCoach",
  year: 2026,
};

export const meta = {
  title: L(
    "SocialCoach — 你的 AI 情商教练 · 对话排练与 3D 实景",
    "SocialCoach — Your AI Social Skills Coach · Practice & 3D Scenes",
  ),
  description: L(
    "想说的话，说出来。SocialCoach 陪你练习难开口的对话：58 个场景、3D 饭局与办公室、视频示范，以及引用原话的复盘。无需注册，支持自己的模型。",
    "Practice difficult conversations with SocialCoach: 58 scenarios, 3D dinners and offices, video demonstrations, and feedback grounded in your own words. No account required. Bring your own model or use the shared quota.",
  ),
};

export const nav = {
  how: L("怎么练", "How it works"),
  learning: L("社交技能", "Social skills"),
  trust: L("依据", "Sources"),
  privacy: L("隐私", "Privacy"),
  faq: L("常见问题", "FAQ"),
  research: L("论文", "Paper"),
  cta: L("练一场对话", "Rehearse your conversation"),
  ctaShort: L("开始练习", "Practice"),
  langAria: L("语言", "Language"),
  themeAria: L("切换外观", "Toggle appearance"),
  themeNames: L(["跟随系统", "浅色", "深色"], ["System", "Light", "Dark"]),
  skip: L("跳到正文", "Skip to content"),
};

export const hero = {
  pill: L("来自同名研究论文", "From the research paper"),
  pillTag: "arXiv:2606.04155",
  eyebrow: L("你的专属 AI 情商教练", "Your personal AI social skills coach"),
  h1: L("想说的话，说出来。", "Say the thing you’ve been not saying."),
  sub: L(
    "下班加活、饭局劝酒、朋友借钱不还。先和有自己立场的 AI 练一次，再从你说过的话里，找到下一次可以做得更好的地方。",
    "A last-minute task. A toast you want to decline. A friend who still owes you. Practise with an AI character who has a position of their own, then revisit your words and try another response.",
  ),
  ctaPrimary: L("选一场对话，开始练习", "Choose a conversation"),
  ctaDebrief: L("先看一次真实复盘", "See a real debrief"),
  ctaHow: L("看看它怎么练", "See how it works"),
  micro: [
    { icon: "enter", text: L("无需注册", "No account") },
    { icon: "device", text: L("记录留在设备上", "History stays on your device") },
    { icon: "globe", text: L("中文 / English", "Chinese / English") },
  ],
  radarAria: L("五项 CASEL 能力的雷达图装饰", "Decorative radar of the five CASEL competencies"),
  screenshotAlt: L("SocialCoach 首页：今日训练与选择理由", "SocialCoach home: today's practice and why it was picked"),
};

export const learning = { sourceUrl: "https://casel.org/what-is-sel/" };

export const trust = {
  no: "04",
  eyebrow: L("语料与出处", "Corpus and sources"),
  title: L("判断有证据，建议有出处", "Evidence before judgment, sources before advice"),
  stats: [
    { n: "58", icon: "scene", label: L("双语场景", "bilingual scenarios") },
    { n: "42", icon: "book", label: L("策略", "strategies") },
    { n: "30", icon: "quote", label: L("案例", "cases") },
    { n: "7", icon: "pin", label: L("类生活情境", "context types") },
    { n: "34", icon: "sparkle", label: L("项社交技能", "social skills") },
  ],
  statsNote: L(
    "每条策略和案例都带来源。",
    "Every strategy and case carries a source.",
  ),
  sourcesLabel: L("出处包括", "Sources include"),
  sources: [
    "Difficult Conversations",
    "Nonviolent Communication",
    "Getting to Yes",
    "Crucial Conversations",
    "Never Split the Difference",
    "Radical Candor",
    "The Seven Principles for Making Marriage Work",
    "Thanks for the Feedback",
  ],
};

export const privacy = {
  no: "05",
  eyebrow: L("数据与部署", "Data and deployment"),
  title: L("数据留在你手里", "Your data stays yours"),
  cards: [
    {
      icon: "device",
      title: L("记录留在设备上", "History lives on your device"),
      body: L(
        "练习档案保存在当前浏览器，可导出、恢复或重置。生成内容时，相关对话与练习信息会发给所用的模型服务。",
        "Practice history stays in this browser and can be exported, restored or reset. Generating content sends relevant conversation and practice context to the selected model service.",
      ),
    },
    {
      icon: "sparkle",
      title: L("用你自己的模型", "Bring your own model"),
      body: L(
        "支持 Anthropic、OpenAI 和任何 OpenAI 兼容端点。填自己的 API key，或指向本地模型，请求直接从你的浏览器发出。",
        "Anthropic, OpenAI, or any OpenAI-compatible endpoint. Use your own API key or point it at a local model; requests go straight from your browser.",
      ),
    },
    {
      icon: "box",
      title: L("可以自己部署", "Self-hostable"),
      body: L(
        "应用以 Apache 2.0 开源，支持 Docker Compose、Vercel 等部署方式。产品语料和技能图谱随代码提供。",
        "The application is open source under Apache 2.0. Deploy with Docker Compose, Vercel and other platforms; the product corpus and skill map ship with the code.",
      ),
    },
  ],
};

export const faq = {
  no: "06",
  eyebrow: L("问答", "Questions"),
  title: L("常见问题", "Frequently asked questions"),
  items: [
    {
      q: L("需要注册或付费吗？", "Do I need an account or a paid plan?"),
      a: L("无需注册。场景和学习内容可以直接浏览；AI 对练使用共享模型额度，额度或服务不可用时，可在设置里接入自己的模型。自带模型的费用由相应服务商收取。", "No account is required. Browse scenarios and learning material directly. AI practice uses a shared model quota; if it is exhausted or unavailable, connect your own model in settings. Your provider charges for your own model usage."),
    },
    {
      q: L("这和直接让 ChatGPT 扮演老板有什么不同？", "How is this different from asking ChatGPT to play my manager?"),
      a: L(
        "通用聊天模型可以演一次。SocialCoach 把训练约束固定下来：角色有独立目标，部分角色还有隐藏顾虑，不会提前泄漏答案；文字练习分段可续聊，并记录未达成的目标；结束后每条判断先引用本次对话原话，再给归因、来源和下一次训练。",
        "A general chat model can play a role once. SocialCoach fixes the training constraints: characters have their own objectives, sometimes with an unspoken concern and won't leak the answer; text practice uses extendable segments and records unmet objectives; afterwards every point quotes the transcript first, then gives attribution, a source and the next practice.",
      ),
    },
    {
      q: L("为什么角色有时不让步？", "Why won't the character give in?"),
      a: L(
        "角色会根据自己的目标和眼前的对话作出回应。礼貌不保证对方同意；你可以协商、修复，也可以守住边界。复盘会分别看沟通表现和对话结果。",
        "Characters respond according to their goals and the conversation. Politeness does not guarantee agreement. You can negotiate, repair a misunderstanding or hold a boundary; the debrief considers communication and the outcome separately.",
      ),
    },
    {
      q: L("熟练度是怎么算的？", "Where do the proficiency numbers come from?"),
      a: L(
        "由教练模型根据每次对话估计，界面会标注。它依据的东西你都看得到：引用的原话、判断的维度和出处。多练几次，雷达上的变化比单次数字更有参考价值。",
        "The coach model estimates it from each conversation, and the UI says so. Everything it rests on is visible: the quoted line, the dimension, the source. Over several rounds the movement on the radar tells you more than any single number.",
      ),
    },
    {
      q: L("我的私人对话保存在哪里？", "Where do my conversations go?"),
      a: L(
        "练习记录保存在当前浏览器，可导出、恢复或重置。生成内容时，相关上下文会发送给你选择的模型服务。匿名使用统计可在设置中关闭；主动提交的反馈会发送给团队。",
        "Practice history is stored in this browser and can be exported, restored or reset. Relevant context is sent to the selected model service when generating content. Anonymous usage statistics can be disabled in settings; feedback you submit is sent to the team.",
      ),
    },
    {
      q: L("它会直接替我写一句完美话术吗？", "Will it just write the perfect line for me?"),
      a: L(
        "提示只点出下一步动作，话还是你自己说。复盘会给出更好的说法，但它的目标是让你在压力下多开口几次。",
        "Hints name the next move; the words are still yours. The debrief offers a better way to say it, but its job is to get you more reps under pressure.",
      ),
    },
  ],
};

export const research = {
  no: "07",
  eyebrow: L("研究", "Research"),
  title: L("这个产品来自一篇论文", "The paper behind the product"),
  paperTitle: "SocialCoach: Personalized Social Skill Learning with Agentic Tutoring and Practice",
  // Follow the arXiv v2 PDF title page; the arXiv abstract metadata lists a different order.
  authors: [
    { name: "Tianfu Wang", aff: 1 },
    { name: "Max Xiong", aff: 2 },
    { name: "Yuxuan Lei", aff: 3 },
    { name: "Jianxun Lian", aff: 4 },
    { name: "Hongyuan Zhu", aff: 3 },
    { name: "Zhengyu Hu", aff: 1 },
    { name: "Linxiao Gong", aff: 1 },
    { name: "Dapeng Hu", aff: 3 },
    { name: "Xiaofang Li", aff: 3 },
    { name: "Peiting Tsai", aff: 3 },
    { name: "Nicholas Jing Yuan", aff: 3 },
    { name: "Qi Zhang", aff: 3 },
  ],
  affiliations: [
    "HKUST (Guangzhou)",
    "Duke University",
    "Microsoft",
    "Microsoft Research Asia",
  ],
  venue: L("预印本 · cs.HC · 2026", "Preprint · cs.HC · 2026"),
  datePublished: "2026-06-02",
  dateModified: "2026-08-16",
  lead: L(
    "论文把「下一次该练什么」定义为一个冷启动、受检索约束的序列决策问题：给定学习者画像、模拟的熟练度状态和练习历史，策略先写出一份结构化处方，再由语料检索把它实现出来。语料本身是一个可追溯的「理论到实践」知识框架，排程和反思式辅导都从这里读取。产品里的每一次复盘所依赖的「不会」与「会但没做到」的区分，也来自这里。",
    "The paper frames “what to practise next” as cold-start, retrieval-constrained sequential decision making: given a learner profile, a simulated proficiency state and the practice history, a policy writes a structured prescription that corpus retrieval then realises. The corpus itself is a traceable theory-to-practice framework that both the scheduler and the reflective tutor read from. The distinction every debrief in the app rests on, not knowing the move versus failing to execute it, comes from here too.",
  ),
  coversTitle: L("论文里有、产品里看不到的部分", "What the paper covers that the app can't show"),
  covers: [
    L(
      "用轨迹级 GRPO 和评分者成对偏好训练的排程策略",
      "A scheduling policy trained with trajectory-level GRPO on rubric-judge pairwise preferences",
    ),
    L(
      "合成冷启动设定下，与检索基线和匹配消融的对比评测",
      "A synthetic cold-start evaluation against retrieval baselines and matched ablations",
    ),
    L(
      "50 名参与者、每人至少 10 次练习的用户研究，以及一个 n = 10 的随机试点",
      "A 50-participant study with at least 10 practices each, plus a randomised pilot with n = 10",
    ),
    L(
      "由自动化流程构建的 43,170 条结构化知识语料",
      "A 43,170-entry structured knowledge corpus built by an automated pipeline",
    ),
  ],
  boundaryLabel: L("论文与产品", "Paper and product"),
  boundary: L(
    "论文研究的是研究系统和一个内部研究平台；这个网站上的产品是它的产品化版本，内置一套更小、逐条核过出处的语料。",
    "The paper studies the research system and an internal research platform; the product on this site is its productised version, shipping a smaller, source-checked corpus.",
  ),
  links: {
    arxiv: L("arXiv", "arXiv"),
    pdf: L("PDF", "PDF"),
    code: L("GitHub", "GitHub"),
    supplementary: L("补充材料", "Supplementary materials"),
    bibtex: L("BibTeX", "BibTeX"),
  },
  bibtexLabel: L("引用", "Cite"),
  copy: L("复制", "Copy"),
  copied: L("已复制", "Copied"),
  bibtex: `@article{wang2026socialcoach,
  title   = {SocialCoach: Personalized Social Skill Learning with Agentic Tutoring and Practice},
  author  = {Wang, Tianfu and Xiong, Max and Lei, Yuxuan and Lian, Jianxun and Zhu, Hongyuan
             and Hu, Zhengyu and Gong, Linxiao and Hu, Dapeng and Li, Xiaofang and Tsai, Peiting
             and Yuan, Nicholas Jing and Zhang, Qi},
  journal = {arXiv preprint arXiv:2606.04155},
  year    = {2026}
}`,
};

export const footer = {
  tagline: L("想说的话，说出来。", "Say the thing you’ve been not saying."),
  links: {
    app: L("开始练习", "Start practising"),
    repo: L("GitHub", "GitHub"),
    paper: L("论文", "Paper"),
  },
  disclaimer: L(
    "用于日常练习与反思，不是临床评估或招聘工具。涉及自伤、他伤或即时危险时，请联系当地紧急服务与专业人员。",
    "For everyday practice and reflection, not clinical assessment or hiring. If there is risk of harm to yourself or others, contact local emergency services and a professional.",
  ),
  copyright: L("© 2026 SocialCoach 作者", "© 2026 the SocialCoach authors"),
};


// Homepage presentation, October 2026. Screenshots and excerpts are documented in assets/README.md.
export const experience = {
  nav3d: L("3D 现场", "3D scenes"), navVideos: L("视频示范", "Watch & learn"),
  open3d: L("进入 3D 现场", "Enter a 3D scene"),
  rehearse: L("有自己的处境？排练真实对话", "Have a situation in mind? Rehearse it"),
  preview: L("产品实景（局部）· 职场饭局", "In the app · Work dinner (cropped)"),
  previewAlt: L("SocialCoach 3D 职场饭局，三位人物围坐，等待你的回应", "A SocialCoach 3D work dinner with three characters waiting for your response"),
  previewQuote: L("大家都举杯了，就等你了。", "Everyone has a cup up—we’re waiting for you."),
  coach: L("陪你练习，也陪你复盘。", "Here for the practice. Here for the debrief."),
  updated: L("现已支持 3D 实景与视频学习", "Now with 3D scenes and video lessons"),
  sceneCount: L("个场景", "scenarios"),
  coachAlt: L("SocialCoach 的猫咪教练", "The SocialCoach cat coach"),
  pathsTitle: L("从你最近遇到的那件事开始", "Start with something on your mind"),
  paths: ["declining-extra-hours", "salary-raise", "friend-borrowed-money"],
  tryScene: L("练这场对话", "Practise this conversation"),
  practiceEyebrow: L("对练与复盘", "Practice & reflection"),
  practiceTitle: L("第一句之后，\n对方还会接着问。", "After your opening line,\nthey’ll have another question."),
  practiceLead: L("角色有自己的立场。你可以追问、拒绝、改口，也可以继续谈。结束后，教练回到你的原话，和你一起看清刚才发生了什么。", "Characters have positions of their own. Ask, decline, reconsider or keep talking. When you finish, revisit your own words with the coach and see what happened."),
  flow: [
    { title: L("选一场，或带来自己的处境", "Pick a scene, or bring your own"), body: L("58 个双语场景覆盖 7 类生活情境，也可以描述你真正要面对的那场对话。", "58 bilingual scenarios across seven everyday contexts, plus custom rehearsals for the conversation ahead of you.") },
    { title: L("开口，接住下一句", "Speak, then handle the reply"), body: L("用文字或语音组织回应。想增加压力，可以开启限时应答；还没谈完，就继续聊。", "Respond in text or use voice input. Add timed replies for more pressure, or keep the conversation going when you need to.") },
    { title: L("回到原话，再试一次", "Revisit your words. Try again."), body: L("看具体反馈、尝试改写、继续问教练。练习记录也会帮助安排接下来练什么。", "Read specific feedback, try another phrasing and ask the coach follow-up questions. Your practice history helps shape what comes next.") },
  ],
  arenaAlt: L("当前 SocialCoach 场景目录：按情境选择，搜索或筛选要练的对话", "The current SocialCoach scenario collection with search and context filters"),
  arenaCaption: L("现有场景直接开练，也可以排练自己的真实处境。", "Choose an existing scene, or rehearse your own situation."),
  evidenceLabel: L("一段示例对练中的原话", "An excerpt from a demo practice"),
  evidenceQuote: L("啊……好的，我看看。不过我今晚其实有点事，可能会晚一点开始，可以吗？", "Oh… okay, let me take a look. I do have something tonight though, so I might start a bit late, is that all right?"),
  evidenceTitle: L("想表达「今晚不行」，\n却说成了「晚一点开始」。", "You meant “not tonight.”\nYou said “a bit late.”"),
  evidenceBody: L("这次复盘回到「我看看」和「可以吗」：你的边界还没说清，对方仍有继续催促的空间。把具体措辞找出来，下一次才知道从哪里改。", "This debrief revisits “let me take a look” and “is that all right?” The boundary was still unclear, leaving room for more pressure. A specific line gives you something concrete to work on."),
  evidenceNote: L("示例摘录；每次反馈根据当次对话生成。", "Demo excerpt. Feedback is generated from each practice conversation."),
  evidenceLink: L("查看这次复盘的原始截图", "See the original debrief screenshot"),
  nextTitle: L("练完了，还能接着问。", "The conversation with your coach continues."),
  nextBody: L("为什么这句话没说清？如果对方继续追问呢？复盘里的教练可以围绕本次对话继续解释，也会从不同场次的原话中寻找反复出现的问题。", "Why was that line unclear? What if they keep asking? Ask follow-up questions about this practice, and look for recurring patterns across your past conversations."),
  sceneTitle: L("走进现场，\n练习一桌人的压力。", "Step into the room.\nPractise with everyone listening."),
  sceneLead: L("职场、家庭、学校饭局，还有电梯口和办公室。面对不同人物的立场，选择回应谁、说什么，处理旁人的插话。", "Work, family and school dinners, an elevator lobby and an office. Respond to different people, choose whom to address and handle interruptions."),
  sceneImageAlt: L("SocialCoach 3D 电梯口场景局部：三位人物与当前对话", "A cropped view of three characters and the conversation in SocialCoach’s 3D elevator lobby"),
  sceneCaption: L("电梯口：刚从 HR 出来，同事和领导都在场。", "At the elevator: you have just left HR, with your boss and colleagues nearby."),
  scenePoints: [L("文字或语音开口", "Text or voice input"), L("切换视角、走动与现场动作", "Change perspective, move and act"), L("练完同样可以引用原话复盘", "Debrief with quotes from your conversation")],
  videoTitle: L("先看一段，\n再换你来回应。", "Watch a scene.\nThen take your turn."),
  videoLead: L("同一个难题，看看不同回应怎样改变对话。视频配有中英字幕、关键选择的拆解，以及对应的 3D 练习入口。", "See how different responses change the same conversation. Videos include Chinese and English captions, a breakdown of key choices and a link to the matching 3D practice."),
  videoNote: L("SocialCoach 原创虚构示范 · 中文配音 / 中英字幕", "Original fictional demonstrations · Chinese audio / Chinese and English captions"),
  watch: L("前往视频课堂", "Explore video lessons"),
  videos: [
    { id: "dinner-toast", title: L("饭局上，领导替你答应了", "Your boss promises on your behalf"), body: L("酒可以拒绝，没确认的交付日期也需要说清楚。", "Decline the drink and clarify a deadline you never agreed to."), duration: "0:57", scene: "work", opening: "work-toast" },
    { id: "elevator-hr", title: L("领导当众问：是不是要离职？", "Your boss asks: are you leaving?"), body: L("旁人都在听。把私人边界和工作安排分别说清楚。", "Everyone is listening. Separate private boundaries from work commitments."), duration: "0:51", scene: "elevator", opening: "elevator-privacy" },
  ],
  videoPractice: L("进入对应的 3D 练习", "Try the matching 3D practice"),
  library: L("继续看 42 条策略与 30 个案例", "Explore 42 strategies and 30 cases"),
  closeTitle: L("把那场难开口的对话，\n先在这里练一遍。", "Give that difficult conversation\na first try here."),
  closeBody: L("和老板谈加薪，请朋友还钱，或把一件拖了很久的事说清楚。从你现在最想练的那场开始。", "Ask for a raise, bring up an unpaid loan or finally talk through something you have put off. Start with the conversation that matters to you."),
  sourceNote: L("技能分类参考 CASEL 的社交与情绪学习框架。", "The skill map draws on CASEL’s social and emotional learning framework."),
};

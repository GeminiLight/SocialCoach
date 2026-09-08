// Bilingual copy for the official site. Every user-facing string is an
// L = { zh, en } object, read with pick(v, lang), the same convention as the app.
//
// Product facts come from wiki/00-product-proposal.md and README.md; the hero
// copy is the approved header from the marketing workspace. Do not add claims
// that are not defensible from the repo (no user counts, no "first", no
// "open source" until a LICENSE exists).

export const L = (zh, en) => ({ zh, en });
export const pick = (v, lang) => (v && typeof v === "object" && "zh" in v ? v[lang] : v);

export const site = {
  // Where the built site lives. GitHub Actions overrides this with whatever
  // configure-pages reports; the account's Pages domain makes that this URL.
  defaultUrl: "https://tianfuwang.tech/SocialCoach",
  appUrl: "https://socialcoach-app.vercel.app",
  repoUrl: "https://github.com/GeminiLight/SocialCoach",
  arxivId: "2606.04155",
  arxivUrl: "https://arxiv.org/abs/2606.04155",
  pdfUrl: "https://arxiv.org/pdf/2606.04155",
  // Copied from ../docs at build time so Scholar can find PDF + abstract on one host.
  localPdf: "paper/socialcoach-2606.04155.pdf",
  name: "SocialCoach",
  year: 2026,
};

export const meta = {
  title: L(
    "SocialCoach — 想说的话，说出来。",
    "SocialCoach — Say the thing you've been not saying.",
  ),
  description: L(
    "面向真实困难对话的 AI 社交技能陪练。和有自己目标、不会轻易让步的角色练几轮；复盘引用你刚才说过的话，判断你是还不会，还是会但在压力下没做到。无需注册。来自同名研究 arXiv:2606.04155。",
    "Rehearse difficult conversations against AI characters who push back, then get a debrief that quotes what you actually said and tells you whether you didn't know the move or couldn't land it under pressure. No account. From the research paper arXiv:2606.04155.",
  ),
};

export const nav = {
  how: L("流程", "Flow"),
  trust: L("依据", "Sources"),
  privacy: L("隐私", "Privacy"),
  faq: L("常见问题", "FAQ"),
  research: L("论文", "Paper"),
  cta: L("练一场对话", "Rehearse your conversation"),
  langAria: L("语言", "Language"),
  themeAria: L("切换外观", "Toggle appearance"),
  themeNames: L(["跟随系统", "浅色", "深色"], ["System", "Light", "Dark"]),
  skip: L("跳到正文", "Skip to content"),
};

export const hero = {
  pill: L("来自同名研究论文", "From the research paper"),
  pillTag: "arXiv:2606.04155",
  eyebrow: L("SocialCoach", "SocialCoach"),
  h1: L("想说的话，说出来。", "Say the thing you've been not saying."),
  h1Alt: L("Say the thing you've been not saying.", "想说的话，说出来。"),
  sub: L(
    "和不会轻易让步的 AI 角色先练一次困难对话。结束后，教练引用你的原话，告诉你是还不会，还是会但在压力下没做到。无需注册。",
    "Rehearse a difficult conversation against an AI character who pushes back. The debrief quotes what you actually said and shows whether you did not know the move or could not execute it under pressure. No account required.",
  ),
  ctaPrimary: L("练一场对话", "Rehearse your conversation"),
  ctaDebrief: L("先看一次真实复盘", "See a real debrief"),
  ctaHow: L("看看它怎么练", "See how it works"),
  micro: [
    { icon: "enter", text: L("无需注册", "No account") },
    { icon: "device", text: L("记录留在设备上", "History stays on your device") },
    { icon: "clock", text: L("每轮约三分钟", "About three minutes a round") },
  ],
  radarAria: L("五项 CASEL 能力的雷达图装饰", "Decorative radar of the five CASEL competencies"),
  screenshotAlt: L("SocialCoach 首页：今日训练与选择理由", "SocialCoach home: today's practice and why it was picked"),
};

export const marquee = {
  aria: L("场景一览", "Scenario overview"),
  eyebrow: L("{n} 个双语场景 · {c} 类生活情境", "{n} bilingual scenarios · {c} contexts"),
  all: L("全部场景", "All scenarios"),
};

export const gap = {
  no: "01",
  eyebrow: L("问题所在", "The problem"),
  title: L("知道该怎么说，不等于说得出来", "Knowing what to say is not the same as saying it"),
  lead: L(
    "你大概知道应该先问、不要指责。问题出在*对方叹气、反驳或沉默之后*：脑内预演和收藏的建议，都没有这个压力。",
    "You know to open with a question instead of an accusation. The trouble starts *after the sigh, the pushback, or the silence*. Rehearsing in your head, and every article you saved, never had that pressure.",
  ),
  hooks: [
    L(
      "你不是不知道怎么拒绝。你是不知道老板*再追问一句*时，自己还能不能拒绝。",
      "You know how to say no. What you don't know is whether you still can *after your manager asks one more time*.",
    ),
    L(
      "加薪谈话在脑子里很顺，因为脑子里的老板从不说*「今年真的没预算」*。",
      "The raise conversation goes smoothly in your head, because the manager in your head never says *“there's really no budget this year.”*",
    ),
    L(
      "提醒朋友还钱最难的不是第一句，是他笑着说*「朋友之间别这么急」*之后。",
      "The hard part of asking a friend for the money back isn't the first line. It's what comes after *“come on, we're friends.”*",
    ),
  ],
  deficits: [
    {
      label: L("不会", "Didn't know the move"),
      tag: "acquisition",
      fix: L("配一条有出处的策略", "A sourced strategy"),
      body: L(
        "还没掌握这个动作。需要的是知道该做什么，配一条有出处的策略。",
        "You haven't got the move yet. What you need is the move itself, with a sourced strategy attached.",
      ),
    },
    {
      label: L("会，但没做到", "Knew it, and folded"),
      tag: "performance",
      fix: L("在压力下再练一次", "Another rep, under pressure"),
      body: L(
        "知道该怎么说，但在压力下没做出来。需要的是重复次数，不是再一条建议。",
        "You knew what to say and didn't, under pressure. What you need is reps, not another tip.",
      ),
    },
  ],
  deficitNote: L(
    "这两种情况的解法完全不同。复盘会告诉你这一次是哪一种。",
    "The fix for each is completely different. The debrief tells you which one this was.",
  ),
};

export const how = {
  no: "02",
  eyebrow: L("流程", "Flow"),
  title: L("一次训练，四步", "One round, four steps"),
  steps: [
    {
      icon: "scene",
      title: L("选一场对话", "Pick a conversation"),
      body: L(
        "46 个双语场景，覆盖职场、家庭、朋友、亲密关系、学校、陌生人和社交场合。也可以描述你明天那场真实对话，约 15 秒生成一个定制场景。",
        "46 bilingual scenarios across work, family, friendship, romance, school, strangers and social occasions. Or describe the real conversation you have coming up and get a custom scenario in about 15 seconds.",
      ),
    },
    {
      id: "pushback",
      icon: "pushback",
      title: L("对方会反驳", "The other side pushes back"),
      screenshotAlt: L("对练中：经理继续施压，目标进度与剩余回合可见", "Mid-practice: the manager keeps pushing; goal progress and turns left are visible"),
      body: L(
        "角色有自己的目标、立场，和一件没告诉你的事。回合有上限，你可能输。态度好不会让它自动让步。",
        "Characters have an objective of their own, a position, and something they aren't telling you. Turns are limited. You can lose. Being polite doesn't make them yield.",
      ),
    },
    {
      id: "debrief",
      icon: "quote",
      title: L("复盘先引用你的原话", "The debrief quotes you first"),
      body: L(
        "每条判断先引用你刚才说过的话，再区分是不会，还是会但没做到，再给出处和下一次的动作。没有证据的评价不会出现。",
        "Every point cites the line you actually said, then says whether you didn't know the move or couldn't land it, then gives the source and the next move. No evidence, no verdict.",
      ),
      screenshotAlt: L("复盘报告：引用原话、归因、出处和下一步", "Debrief report: quoted line, attribution, source and next move"),
    },
    {
      icon: "radar",
      title: L("下一次练什么，它替你选", "It picks tomorrow's practice"),
      body: L(
        "5 项 CASEL 能力 × 34 项社交技能 × 7 类情境的技能图谱，根据这次结果安排下一次训练，并用雷达记录变化。",
        "A skill map of 5 CASEL competencies × 34 social skills × 7 context types decides what you're served next, and a radar tracks the change.",
      ),
    },
  ],
};

export const trust = {
  no: "03",
  eyebrow: L("语料与出处", "Corpus and sources"),
  title: L("判断有证据，建议有出处", "Evidence before judgment, sources before advice"),
  stats: [
    { n: "46", icon: "scene", label: L("双语场景", "bilingual scenarios") },
    { n: "42", icon: "book", label: L("策略", "strategies") },
    { n: "30", icon: "quote", label: L("案例", "cases") },
    { n: "7", icon: "pin", label: L("类生活情境", "context types") },
    { n: "34", icon: "sparkle", label: L("项社交技能", "social skills") },
  ],
  statsNote: L(
    "每条策略和案例都带来源；用于教学的构造案例会明确标注。",
    "Every strategy and case carries a source; teaching illustrations are labelled as such.",
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
  no: "04",
  eyebrow: L("数据与边界", "Data and limits"),
  title: L("数据留在你手里，边界写在明处", "Your data stays yours, and the limits are written down"),
  cards: [
    {
      icon: "gauge",
      title: L("熟练度是模型估计", "Proficiency is a model estimate"),
      body: L(
        "不是心理测量，也不是能力认证，界面里会标注。它只用于你自己的练习，不用于招聘、绩效或评价别人。",
        "Not a psychometric, not a certification, and the UI says so. It is for your own practice only, never for hiring, reviews, or judging someone else.",
      ),
    },
    {
      icon: "device",
      title: L("数据留在你的设备上", "Your data stays on your device"),
      body: L(
        "无账号、无用户数据库，记录可导出、可重置。每次生成仍会把本次输入发送给你选择的模型服务；你可以用自己的 API key，或指向本地端点。",
        "No account, no user database; export or reset anytime. Each generation still sends that request to the model provider you chose; bring your own key, or point it at a local endpoint.",
      ),
    },
    {
      icon: "box",
      title: L("可以自己部署", "Self-hostable"),
      body: L(
        "一台小机器加 Docker Compose。支持 Anthropic、OpenAI 以及任何 OpenAI 兼容端点。",
        "One small box and Docker Compose. Works with Anthropic, OpenAI, and any OpenAI-compatible endpoint.",
      ),
    },
    {
      icon: "ban",
      title: L("不做的事", "What it is not for"),
      body: L(
        "不做心理诊断、危机干预、医疗或法律建议。熟练度分数不能用于招聘、绩效或录用决策。",
        "No diagnosis, crisis intervention, medical or legal advice. Proficiency scores are never for hiring, reviews or admissions.",
      ),
    },
  ],
};

export const faq = {
  no: "05",
  eyebrow: L("问答", "Questions"),
  title: L("常见问题", "Frequently asked questions"),
  items: [
    {
      q: L("这和直接让 ChatGPT 扮演老板有什么不同？", "How is this different from asking ChatGPT to play my manager?"),
      a: L(
        "通用聊天模型可以完成一次角色扮演。SocialCoach 把训练约束固定下来：角色有独立目标和隐藏动机，不会提前泄漏答案；练习有回合上限和失败条件；结束后每条判断先引用本次对话原话，再给归因、来源和下一次训练。只想随便演一次的人不需要换工具；想重复训练、看见进步的人才需要它。",
        "A general chat model can play a role once. SocialCoach fixes the training constraints: characters have their own objective and a hidden motive and won't leak the answer; practice has a turn limit and a failure state; afterwards every point quotes the transcript first, then gives attribution, a source and the next practice. If you only want to improvise once, you don't need another tool. If you want to repeat and see progress, you do.",
      ),
    },
    {
      q: L("为什么角色有时不让步？", "Why won't the character give in?"),
      a: L(
        "因为它有自己的目标和一件没说出口的顾虑。让步的条件写在场景里，而不是写在你的态度里。真实对话也是这样。",
        "Because it has an objective of its own and an unspoken concern. The conditions for yielding are written into the scenario, not into your tone. Real conversations work the same way.",
      ),
    },
    {
      q: L("AI 给的分数可信吗？", "Can I trust the scores?"),
      a: L(
        "熟练度是模型估计，不是心理测量或客观能力认证。我们不要求你相信一个裸分数，而是先展示它依据的原话、判断维度和来源。它只能用于个人练习，不能用于招聘、绩效或评价别人。",
        "Proficiency is a model estimate, not a psychometric or an objective certification. You are not asked to trust a bare number; you see the quoted line, the dimension and the source it rests on first. It is for personal practice only, never for hiring, reviews, or judging someone else.",
      ),
    },
    {
      q: L("我的私人对话保存在哪里？", "Where do my conversations go?"),
      a: L(
        "练习历史保存在你的设备上，没有账号和用户数据库，可以随时导出或重置。模型生成仍需要把本次请求发送到所选的模型服务；你可以使用自己的 API key，或本地兼容端点。",
        "Practice history is stored on your device. There is no account and no user database, and you can export or reset it at any time. Generating a reply still sends that request to the model provider you selected; you can use your own API key or a local compatible endpoint.",
      ),
    },
    {
      q: L("它会直接替我写一句完美话术吗？", "Will it just write the perfect line for me?"),
      a: L(
        "不会。提示只点出下一步动作，角色仍要求你自己回应。复盘会给出更好的表达方向，但目标是增加你在压力下开口的次数，不是替你交作业。",
        "No. Hints only name the next move; the character still waits for you to answer. The debrief points to a better way to say it, but the goal is more reps under pressure, not doing the work for you.",
      ),
    },
    {
      q: L("哪些事情不适合用？", "What is it not for?"),
      a: L(
        "它不做心理诊断、危机干预、医疗或法律建议，也不能把熟练度分数用于招聘、绩效或录用决策。涉及自伤、他伤或即时危险时，请联系当地紧急服务和专业人员。",
        "It does not do psychological diagnosis, crisis intervention, or medical or legal advice, and proficiency scores must not be used for hiring, performance or admission decisions. If there is risk of harm to yourself or others, contact local emergency services and a professional.",
      ),
    },
  ],
};

export const research = {
  no: "06",
  eyebrow: L("研究", "Research"),
  title: L("这个产品来自一篇论文", "The paper behind the product"),
  paperTitle: "SocialCoach: Personalized Social Skill Learning with Agentic Tutoring and Practice",
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
  datePublished: "2026-08-16",
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
  boundaryLabel: L("边界", "Boundary"),
  boundary: L(
    "论文研究的是研究系统和一个内部部署的研究平台。这个网站介绍的产品是它的产品化版本，内置的是另一套规模更小、逐条核过来源的语料。论文的结果不应被读成对当前产品效果的证明。",
    "The paper studies the research system and an internally deployed research platform. The product on this site is its productised version, shipping a separate, smaller, source-checked corpus. The paper's results should not be read as proof of this product's effectiveness.",
  ),
  links: {
    arxiv: L("arXiv", "arXiv"),
    pdf: L("PDF", "PDF"),
    code: L("GitHub", "GitHub"),
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
  tagline: L("想说的话，说出来。", "Say the thing you've been not saying."),
  links: {
    app: L("开始练习", "Start practising"),
    repo: L("GitHub", "GitHub"),
    paper: L("论文", "Paper"),
  },
  disclaimer: L(
    "仅用于低风险的练习和反思。不是临床评估、心理诊断或招聘决策工具。熟练度数字是模型估计，界面中已标注。涉及自伤、他伤或即时危险时，请联系当地紧急服务与专业人员。",
    "For low-stakes practice and reflection only. Not clinical assessment, diagnosis, or a hiring tool. Proficiency numbers are model estimates and are labelled as such in the UI. If there is risk of harm to yourself or others, contact local emergency services and a professional.",
  ),
  copyright: L("© 2026 SocialCoach 作者", "© 2026 the SocialCoach authors"),
};

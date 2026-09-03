/**
 * Multi-faceted taxonomy from the SocialCoach paper (Appendix A.1):
 *  - 5 CASEL competencies
 *  - 34 social skills grouped under those competencies
 *  - 7 scenario context categories with 26 detailed types
 */
export type Lang = "zh" | "en";
export type L = { zh: string; en: string };
export const L = (zh: string, en: string): L => ({ zh, en });

export type CompetencyId =
  | "self-awareness"
  | "self-management"
  | "social-awareness"
  | "relationship-skills"
  | "responsible-decision-making";

export interface Competency {
  id: CompetencyId;
  name: L;
  short: L;
  description: L;
  /** OKLCH hue used across the UI for this competency */
  hue: number;
}

export const COMPETENCIES: Competency[] = [
  {
    id: "self-awareness",
    name: L("自我认知", "Self-Awareness"),
    short: L("认知", "Aware"),
    description: L(
      "识别自己的情绪、价值观与盲点，并理解它们如何影响行为。",
      "Recognize your emotions, values and blind spots, and how they shape behavior.",
    ),
    hue: 75,
  },
  {
    id: "self-management",
    name: L("自我管理", "Self-Management"),
    short: L("管理", "Manage"),
    description: L(
      "在压力下调节情绪与冲动，坚持目标并采取主动。",
      "Regulate emotions and impulses under pressure, persist toward goals, take initiative.",
    ),
    hue: 140,
  },
  {
    id: "social-awareness",
    name: L("社会认知", "Social Awareness"),
    short: L("共情", "Empathy"),
    description: L(
      "换位思考，读懂他人感受与情境规范，尊重差异。",
      "Take others' perspectives, read feelings and situational norms, respect differences.",
    ),
    hue: 200,
  },
  {
    id: "relationship-skills",
    name: L("人际技能", "Relationship Skills"),
    short: L("关系", "Relate"),
    description: L(
      "清晰沟通、建立信任、协作解决冲突并有效领导。",
      "Communicate clearly, build trust, resolve conflict collaboratively and lead well.",
    ),
    hue: 30,
  },
  {
    id: "responsible-decision-making",
    name: L("负责任决策", "Responsible Decision-Making"),
    short: L("决策", "Decide"),
    description: L(
      "分析情境与后果，在关心他人的前提下做出有原则的选择。",
      "Analyze situations and consequences, and make principled, caring choices.",
    ),
    hue: 270,
  },
];

export type SkillId =
  // self-awareness
  | "identifying-emotions"
  | "social-cultural-identity"
  | "recognizing-strengths"
  | "growth-mindset"
  | "self-efficacy"
  | "examining-bias"
  | "sense-of-purpose"
  // self-management
  | "emotion-regulation"
  | "impulse-control"
  | "stress-management"
  | "self-discipline"
  | "perseverance"
  | "goal-setting"
  | "organizational-skills"
  | "initiative"
  // social-awareness
  | "perspective-taking"
  | "empathy"
  | "expressing-gratitude"
  | "appreciating-diversity"
  | "social-norms"
  | "sense-of-belonging"
  // relationship
  | "communication"
  | "cultural-competence"
  | "building-relationships"
  | "teamwork"
  | "resolving-conflicts"
  | "seeking-help"
  | "leadership"
  | "standing-up"
  // decision making
  | "curiosity"
  | "problem-solving"
  | "analyzing-consequences"
  | "ethical-responsibility"
  | "reflecting-on-role";

export interface Skill {
  id: SkillId;
  competency: CompetencyId;
  name: L;
  /** What "good" looks like in one sentence — used in onboarding and reports */
  behavior: L;
  /** Whether it is highlighted in onboarding as a common goal */
  popular?: boolean;
}

export const SKILLS: Skill[] = [
  // ---- Self-Awareness
  { id: "identifying-emotions", competency: "self-awareness", name: L("识别情绪", "Identifying emotions"), behavior: L("能在对话中准确说出自己此刻的感受。", "Can name what you feel in the moment, accurately.") },
  { id: "social-cultural-identity", competency: "self-awareness", name: L("社会与文化身份", "Social & cultural identity"), behavior: L("理解自己的背景如何影响表达与被理解的方式。", "Understand how your background shapes how you express and are read.") },
  { id: "recognizing-strengths", competency: "self-awareness", name: L("认识优势", "Recognizing strengths"), behavior: L("能坦然说出自己的贡献与长处，不夸大也不贬低。", "Can state your contributions and strengths plainly, without inflation or dismissal."), popular: true },
  { id: "growth-mindset", competency: "self-awareness", name: L("成长型思维", "Growth mindset"), behavior: L("把批评当作信息而非判决。", "Treat criticism as information, not a verdict.") },
  { id: "self-efficacy", competency: "self-awareness", name: L("自我效能", "Self-efficacy"), behavior: L("相信自己可以通过行动改变局面，并据此发言。", "Believe your actions can change the situation, and speak accordingly."), popular: true },
  { id: "examining-bias", competency: "self-awareness", name: L("审视偏见", "Examining bias"), behavior: L("察觉自己对他人的预设，并主动核实。", "Notice your assumptions about others and check them.") },
  { id: "sense-of-purpose", competency: "self-awareness", name: L("目标感", "Sense of purpose"), behavior: L("清楚自己在这段关系或对话中真正想要什么。", "Know what you actually want from this conversation or relationship.") },
  // ---- Self-Management
  { id: "emotion-regulation", competency: "self-management", name: L("情绪调节", "Emotion regulation"), behavior: L("被激怒时能放慢、命名情绪、再回应。", "When provoked, slow down, name the feeling, then respond."), popular: true },
  { id: "impulse-control", competency: "self-management", name: L("冲动控制", "Impulse control"), behavior: L("忍住打断、反驳与翻旧账。", "Resist interrupting, rebutting and bringing up old grievances.") },
  { id: "stress-management", competency: "self-management", name: L("压力管理", "Stress management"), behavior: L("高压对话中保持呼吸与节奏，不逃避也不爆发。", "Keep your breathing and pace in tense talks; neither flee nor explode."), popular: true },
  { id: "self-discipline", competency: "self-management", name: L("自律与自我激励", "Self-discipline & motivation"), behavior: L("说到做到，并为自己的承诺负责。", "Follow through on what you say, and own your commitments.") },
  { id: "perseverance", competency: "self-management", name: L("坚持", "Perseverance"), behavior: L("被拒绝后能调整方式再尝试，而不是放弃。", "After a no, adjust your approach and try again rather than quit.") },
  { id: "goal-setting", competency: "self-management", name: L("目标设定", "Goal-setting"), behavior: L("进入对话前想清楚可接受的结果与底线。", "Before a conversation, know your acceptable outcomes and your floor.") },
  { id: "organizational-skills", competency: "self-management", name: L("组织能力", "Organizational skills"), behavior: L("把复杂的诉求拆成清楚的几点讲出来。", "Break a complex ask into a few clear points.") },
  { id: "initiative", competency: "self-management", name: L("主动性", "Initiative & agency"), behavior: L("先开口、先提方案，而不是等别人来处理。", "Speak first and propose first, rather than waiting for others to act."), popular: true },
  // ---- Social Awareness
  { id: "perspective-taking", competency: "social-awareness", name: L("换位思考", "Perspective-taking"), behavior: L("能复述对方的立场，并让对方觉得被准确理解。", "Can restate the other side's position so they feel accurately understood."), popular: true },
  { id: "empathy", competency: "social-awareness", name: L("共情与关怀", "Empathy & compassion"), behavior: L("先回应感受，再回应事实。", "Respond to feelings before facts."), popular: true },
  { id: "expressing-gratitude", competency: "social-awareness", name: L("表达感谢", "Expressing gratitude"), behavior: L("具体地说出对方做了什么、对你有什么影响。", "Name specifically what someone did and how it affected you.") },
  { id: "appreciating-diversity", competency: "social-awareness", name: L("欣赏多样性", "Appreciating diversity"), behavior: L("把不同看作资源而非麻烦。", "Treat difference as a resource, not a nuisance.") },
  { id: "social-norms", competency: "social-awareness", name: L("识别社交规范", "Reading social norms"), behavior: L("读懂场合的隐含规则：什么时候该说、说多少、怎么说。", "Read the room's unwritten rules: when to speak, how much, and how.") },
  { id: "sense-of-belonging", competency: "social-awareness", name: L("归属感", "Sense of belonging"), behavior: L("让新人和边缘的人被纳入对话。", "Bring newcomers and quieter people into the conversation.") },
  // ---- Relationship Skills
  { id: "communication", competency: "relationship-skills", name: L("清晰沟通", "Communication"), behavior: L("用具体、不指责的语言说出观察、感受与请求。", "State observations, feelings and requests in concrete, non-blaming language."), popular: true },
  { id: "cultural-competence", competency: "relationship-skills", name: L("跨文化能力", "Cultural competence"), behavior: L("在不同背景的人之间调整表达方式。", "Adapt how you communicate across different backgrounds.") },
  { id: "building-relationships", competency: "relationship-skills", name: L("建立关系", "Building relationships"), behavior: L("能自然地开启对话、找到共同点并跟进。", "Can open a conversation naturally, find common ground and follow up."), popular: true },
  { id: "teamwork", competency: "relationship-skills", name: L("团队协作", "Teamwork"), behavior: L("在分歧中把注意力放回共同目标。", "In disagreement, bring attention back to the shared goal."), popular: true },
  { id: "resolving-conflicts", competency: "relationship-skills", name: L("解决冲突", "Resolving conflicts"), behavior: L("把「谁对谁错」变成「我们如何解决」。", "Turn 'who is right' into 'how do we fix this'."), popular: true },
  { id: "seeking-help", competency: "relationship-skills", name: L("求助与助人", "Helping / seeking help"), behavior: L("清晰地请求帮助，也能得体地拒绝。", "Ask for help clearly, and decline gracefully.") , popular: true },
  { id: "leadership", competency: "relationship-skills", name: L("领导力", "Leadership"), behavior: L("给方向、给反馈、为团队挡风。", "Give direction, give feedback, and shield the team."), popular: true },
  { id: "standing-up", competency: "relationship-skills", name: L("为他人发声", "Standing up for others"), behavior: L("看到不公时开口，而不是事后后悔。", "Speak up when you see unfairness, instead of regretting it later.") },
  // ---- Responsible Decision-Making
  { id: "curiosity", competency: "responsible-decision-making", name: L("好奇与开放", "Curiosity & open-mindedness"), behavior: L("用真诚的问题代替预设的结论。", "Replace assumed conclusions with genuine questions.") },
  { id: "problem-solving", competency: "responsible-decision-making", name: L("发现与解决问题", "Identifying & solving problems"), behavior: L("把抱怨转成可执行的下一步。", "Turn complaints into an actionable next step."), popular: true },
  { id: "analyzing-consequences", competency: "responsible-decision-making", name: L("分析后果", "Analyzing consequences"), behavior: L("说出各方案对每个人的影响，再做选择。", "Spell out how each option affects each person before choosing.") },
  { id: "ethical-responsibility", competency: "responsible-decision-making", name: L("伦理责任", "Ethical responsibility"), behavior: L("在压力下仍守住原则，并解释原因。", "Hold your principles under pressure, and explain why.") },
  { id: "reflecting-on-role", competency: "responsible-decision-making", name: L("反思自身角色", "Reflecting on one's role"), behavior: L("承认自己在问题中的一份责任。", "Own your share of the problem.") },
];

export type ContextId =
  | "workplace"
  | "family"
  | "friendship"
  | "romantic"
  | "education"
  | "public"
  | "party";

export interface ContextCategory {
  id: ContextId;
  name: L;
  types: L[];
  /** emoji used as a light-touch glyph in chips */
  glyph: string;
}

export const CONTEXTS: ContextCategory[] = [
  { id: "workplace", name: L("职场", "Workplace"), glyph: "🏢", types: [L("办公室", "Office"), L("会议", "Meetings"), L("面试", "Job interviews"), L("专业协作", "Professional collaboration")] },
  { id: "family", name: L("家庭", "Family"), glyph: "🏠", types: [L("亲子", "Parent-child"), L("兄弟姐妹", "Siblings"), L("家庭日常", "Home interactions"), L("伴侣", "Spouse")] },
  { id: "friendship", name: L("友情", "Friendship"), glyph: "☕", types: [L("非正式", "Informal"), L("情感联结", "Emotional bonding"), L("闲聊", "Casual talk")] },
  { id: "romantic", name: L("恋爱", "Romantic"), glyph: "🌙", types: [L("约会", "Dating"), L("伴侣冲突", "Partner conflicts"), L("表达爱意", "Affection sharing")] },
  { id: "education", name: L("校园", "Education"), glyph: "🎓", types: [L("课堂", "Classroom"), L("同学讨论", "Peer discussion"), L("师生", "Teacher-student")] },
  { id: "public", name: L("公共/陌生人", "Public / Strangers"), glyph: "🚏", types: [L("商店", "Store"), L("交通", "Transport"), L("陌生人", "Unknown people"), L("公园", "Park"), L("法庭", "Courtroom")] },
  { id: "party", name: L("社交场合", "Party / Social"), glyph: "🥂", types: [L("活动", "Events"), L("生日", "Birthdays"), L("酒会", "Wine parties"), L("社交寒暄", "Social mingling")] },
];

export type RelationshipType =
  | "senior"
  | "peer"
  | "junior"
  | "partner"
  | "parent"
  | "child"
  | "sibling"
  | "friend"
  | "stranger"
  | "customer"
  | "teacher";

export const RELATIONSHIPS: Record<RelationshipType, L> = {
  senior: L("上级/前辈", "Senior"),
  peer: L("同级/同事", "Peer"),
  junior: L("下属/后辈", "Junior"),
  partner: L("伴侣", "Partner"),
  parent: L("父母", "Parent"),
  child: L("子女", "Child"),
  sibling: L("兄弟姐妹", "Sibling"),
  friend: L("朋友", "Friend"),
  stranger: L("陌生人", "Stranger"),
  customer: L("客户", "Customer"),
  teacher: L("老师", "Teacher"),
};

export const skillById = (id: SkillId) => SKILLS.find((s) => s.id === id)!;
export const competencyById = (id: CompetencyId) => COMPETENCIES.find((c) => c.id === id)!;
export const contextById = (id: ContextId) => CONTEXTS.find((c) => c.id === id)!;
export const skillsOf = (c: CompetencyId) => SKILLS.filter((s) => s.competency === c);

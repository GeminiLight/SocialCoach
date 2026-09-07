import { L } from "../taxonomy";
import type { Theory } from "./types";
import { SOURCES } from "./sources";

export const THEORIES_C: Theory[] = [
  {
    id: "active-constructive-response",
    title: L("接住好消息，而不只是说恭喜", "Make Room for Someone’s Good News"),
    source: SOURCES.goodNews,
    principle: L(
      "关系也在分享喜悦时建立。关注对方最珍惜的细节，比一句恭喜后转回自己的故事更能表达参与。",
      "Connection also grows around good news. Invite the details that matter to the speaker before shifting to your own story.",
    ),
    howTo: [
      L("停下手头的事，回应你听到的具体进展。", "Pause what you are doing and acknowledge the specific news."),
      L("问一个开放问题，让对方重温开心的部分。", "Ask an open question about a part they enjoyed."),
      L("先听完，再询问是否想讨论担忧或下一步。", "Listen before asking whether they want to discuss concerns or next steps."),
    ],
    competencies: ["social-awareness", "relationship-skills", "responsible-decision-making"],
    skills: ["empathy", "building-relationships", "curiosity"],
    keywords: ["好消息", "喜悦", "祝贺", "good news", "celebration", "capitalization"],
  },
  {
    id: "check-your-paraphrase",
    title: L("复述之后，给对方纠正你的机会", "Check Your Understanding Before Responding"),
    source: SOURCES.listening,
    principle: L(
      "复述是核实，不是宣布你已经懂了。把自己的理解当作暂时的版本，允许对方补充或否定。",
      "A paraphrase checks understanding; it does not prove it. Offer your reading tentatively and leave room for correction.",
    ),
    howTo: [
      L("等对方说完，用自己的话概括一个重点。", "Let them finish, then summarize one point in your own words."),
      L("问有没有理解偏差，避免替对方断言动机。", "Ask what you missed instead of declaring their motives."),
      L("根据纠正更新理解，再说自己的看法。", "Use their correction before adding your own view."),
    ],
    competencies: ["social-awareness", "self-awareness", "responsible-decision-making"],
    skills: ["perspective-taking", "examining-bias", "curiosity"],
    keywords: ["复述", "误会", "线上", "澄清", "paraphrase", "clarify", "listening"],
  },
  {
    id: "equivalent-options",
    title: L("拿出几种你都能接受的方案", "Offer More Than One Workable Package"),
    source: SOURCES.options,
    principle: L(
      "同时提出两到三套整体方案，可以帮助双方看清彼此的优先级。每套都应在你的可接受范围内，不用坏选项逼人选好选项。",
      "Two or three packages can reveal different priorities. Each should be acceptable to you, rather than a decoy designed to force one answer.",
    ),
    howTo: [
      L("列出能交换的条件，例如时间、预算和参与方式。", "List negotiable dimensions such as time, cost, and participation."),
      L("组合成整体价值相近的方案，请对方比较。", "Build packages of similar value to you and invite comparison."),
      L("若都不合适，问最接近哪一个，再整体调整。", "If none fits, ask which comes closest and revise the package."),
    ],
    competencies: ["responsible-decision-making", "relationship-skills"],
    skills: ["problem-solving", "resolving-conflicts", "analyzing-consequences"],
    keywords: ["预算", "旅行", "安排", "方案", "MESO", "budget", "options", "tradeoffs"],
  },
  {
    id: "agree-on-criteria",
    title: L("先谈判断标准，再谈谁该让步", "Agree on Criteria Before Picking a Winner"),
    source: SOURCES.criteria,
    principle: L(
      "比较方案前，先找双方愿意采用的标准。标准也可以被质疑和修订，不是把自己的偏好包装成客观答案。",
      "Before evaluating options, agree on criteria both sides can examine. A criterion remains open to challenge; it is not a disguise for your preference.",
    ),
    howTo: [
      L("分别说清各方在意的利益，先不决定结果。", "Name each side’s interests before deciding an outcome."),
      L("提出可核查的标准，并询问对方认可哪些。", "Suggest checkable criteria and ask which they accept."),
      L("用同一套标准比较方案，标出还缺什么信息。", "Compare options consistently and identify missing information."),
    ],
    competencies: ["responsible-decision-making", "relationship-skills"],
    skills: ["ethical-responsibility", "problem-solving", "teamwork"],
    keywords: ["公平", "轮换", "资源", "标准", "criteria", "fairness", "shared space"],
  },
  {
    id: "apology-with-repair",
    title: L("道歉要承担责任，也要说清补救", "An Apology Needs Ownership and Repair"),
    source: SOURCES.apology,
    principle: L(
      "解释原因不能抵消影响。明确承认自己的行为，提出可落实的补救，比模糊地说让你不舒服了更能承担责任。",
      "An explanation does not erase the impact. Own the specific action and offer a concrete repair instead of apologizing vaguely for someone’s feelings.",
    ),
    howTo: [
      L("说清自己做了什么，以及造成的影响。", "Name what you did and its impact."),
      L("表达歉意，避免用但是把责任退回去。", "Express regret without using a qualification to shift blame."),
      L("提出补救并听取对方意见，允许对方暂不原谅。", "Offer a repair, hear their preferences, and allow time without forgiveness."),
    ],
    competencies: ["responsible-decision-making", "relationship-skills"],
    skills: ["reflecting-on-role", "ethical-responsibility", "resolving-conflicts"],
    keywords: ["道歉", "隐私", "失约", "补救", "apology", "repair", "privacy"],
  },
  {
    id: "pause-with-return",
    title: L("暂停争执时，也约好何时继续", "Pause the Conflict, Keep the Conversation"),
    source: SOURCES.pause,
    principle: L(
      "情绪过载时，继续争辩可能让倾听更困难。说明自己需要暂停，并约定回来谈，能把降温与冷处理区分开。",
      "When overwhelmed, more argument can make listening harder. Explain the need for a pause and agree to resume rather than disappear.",
    ),
    howTo: [
      L("描述自己的状态，不把暂停当作惩罚。", "Describe your own state without making the pause a punishment."),
      L("提出双方可行的继续时间，留出冷静空间。", "Agree on a realistic time to resume with space to settle."),
      L("休息时做能平静下来的事，回来只谈当前问题。", "Use the break to settle, then return to the present issue."),
    ],
    competencies: ["self-management", "relationship-skills"],
    skills: ["emotion-regulation", "impulse-control", "communication"],
    keywords: ["暂停", "独处", "争吵", "冷静", "pause", "overwhelmed", "conflict", "alone time"],
  },
  {
    id: "respect-self-description",
    title: L("称呼和身份，让对方自己定义", "Let People Define Their Own Names and Identity"),
    source: SOURCES.identity,
    principle: L(
      "姓名、代词和身份称谓应尊重当事人的表达。不要因为外貌、口音或旧习惯替别人决定如何被称呼。",
      "Respect the names, pronouns, and identity terms people use for themselves rather than assigning them from appearance, accent, or habit.",
    ),
    howTo: [
      L("不确定时私下询问希望怎样被称呼。", "When unsure, ask privately how they want to be addressed."),
      L("使用对方给出的称呼，不要求解释个人经历。", "Use the name or terms they give without requesting personal history."),
      L("用错时简短更正，在后续实际使用中改变。", "If you get it wrong, correct it briefly and change your future usage."),
    ],
    competencies: ["self-awareness", "social-awareness", "relationship-skills"],
    skills: ["social-cultural-identity", "appreciating-diversity", "cultural-competence"],
    keywords: ["姓名", "代词", "身份", "称呼", "name", "pronouns", "identity", "inclusion"],
  },
  {
    id: "ask-about-access",
    title: L("先问参与需要，不替别人做决定", "Ask About Access, Not Someone’s Diagnosis"),
    source: SOURCES.access,
    principle: L(
      "参与障碍来自活动的安排，不应靠猜测某个人能不能来解决。提前说明条件、询问需要，并诚实说明限制。",
      "Address barriers in the activity rather than guessing who can participate. Share the arrangements, ask about access needs, and be clear about limitations.",
    ),
    howTo: [
      L("介绍场地、流程和已提供的支持。", "Describe the venue, format, and support already available."),
      L("询问还需要什么，不要求披露诊断。", "Ask what else is needed without requiring a diagnosis."),
      L("落实可提供的调整；做不到时及时说明并一起找替代。", "Confirm feasible adjustments; explain gaps early and discuss alternatives."),
    ],
    competencies: ["social-awareness", "responsible-decision-making"],
    skills: ["appreciating-diversity", "sense-of-belonging", "ethical-responsibility"],
    keywords: ["无障碍", "字幕", "活动", "参与", "accessibility", "captions", "inclusion", "event"],
  },
];

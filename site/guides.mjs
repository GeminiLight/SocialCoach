// Public practice previews for existing, source-backed scenarios. These are
// editorial entry points, not scripts or strategy articles. Never copy a
// character's hidden motive, success condition, or model instructions here.
import { L } from "./content.mjs";

export const guideCopy = {
  eyebrow: L("对话练习", "Conversation practice"),
  indexTitle: L("从一场你正要面对的对话开始", "Start with the conversation ahead of you"),
  indexLead: L("选择一个真实难题的虚构练习情境。先和有自己立场的角色对话，再根据你实际说出的话复盘。", "Choose a fictional practice scenario shaped around a real-life problem. Speak with a character who has a position of their own, then review what you actually said."),
  scenario: L("练习情境", "Practice scenario"),
  fictional: L("虚构情境 · 来自 SocialCoach 内置语料", "Fictional scenario · from the SocialCoach corpus"),
  situation: L("你会遇到什么", "The situation"),
  goal: L("这场练习的目标", "What to practice"),
  pressure: L("难点在哪里", "Where the pressure comes from"),
  reflect: L("练完后回看", "After the conversation"),
  process: L("在 SocialCoach 里怎么练", "How SocialCoach practices this"),
  processBody: L("进入场景后，你自己开口回应；角色会根据自己的立场继续追问或反驳，不会因为你态度好就自动让步。对话结束后，复盘先引用你说过的原话，再指出哪些目标达成、哪些地方还需要重练。你可以回到同一情境，再试一次。", "Enter the scenario and answer in your own words. The character responds from their own position, including questions or pushback, and does not give in just because you are polite. Afterward, the debrief quotes your actual words before assessing what worked and what to try again. You can return to the same situation for another attempt."),
  source: L("情境依据", "Scenario sources"),
  sourceNote: L("这是教学用虚构情境；所列出处来自产品语料，不代表书籍作者认可本产品。", "This is a fictional teaching scenario. The references are recorded in the product corpus; their authors do not endorse this product."),
  corpus: L("查看场景语料", "View scenario in the corpus"),
  start: L("在应用里练这场对话", "Practice this conversation in the app"),
  back: L("返回官网", "Back to the site"),
  more: L("看看其他练习", "Explore other practices"),
  read: L("查看练习", "View practice"),
};

export const guides = [
  {
    id: "salary-raise",
    corpusFile: "scenarios-a.ts",
    title: L("和老板谈加薪：先练一次有阻力的对话", "Asking for a Raise: Practice the Conversation"),
    description: L("项目刚上线，调薪窗口快关了。与经理模拟谈加薪：用成果说明价值、提出明确数字，并在被推迟时争取具体下一步。", "Your project just shipped and the compensation window is closing. Rehearse a raise conversation with a manager who may defer: present outcomes, name a number, and secure a next step."),
    pressure: L("你有成果，也做过薪资调研，但经理需要考虑预算。最容易发生的不是激烈争吵，而是聊得很友好，却没有说出数字，也没有约定答复日期。", "You have results and pay data, but your manager faces budget limits. The likely trap is a pleasant talk that never reaches a number or a date for an answer."),
    goals: [L("用具体项目成果说明自己的价值。", "Ground your case in concrete project outcomes."), L("说出明确的调薪数字或区间。", "State a specific raise amount or range."), L("如果对方暂缓，商定下一步和答复时间。", "If the answer is deferred, agree on a next step and date.")],
    reflect: L("回看自己有没有真正提出请求：说出数字了吗？对方说预算紧时，你是放弃了，还是问到了下一步？", "Review whether you actually made the request. Did you name a number? When budget came up, did you drop it or get a next step?"),
  },
  {
    id: "declining-extra-hours",
    corpusFile: "scenarios-a.ts",
    title: L("拒绝临时加班：练习说清边界", "Declining Overtime: Practice Saying No"),
    description: L("下班前经理再次要你留下，今晚你已有安排。模拟拒绝临时加班：清楚表达边界、提出可行替代方案，确认客户真正需要什么。", "Your manager asks you to stay late again, but you already have plans. Rehearse a clear no, a workable alternative, and a question about what the client actually needs."),
    pressure: L("离下班只有十分钟，经理语气客气，却预期你会答应；旁边还有新同事。练习的重点不是找到完美借口，而是在压力下不把「今晚不行」说成一个可被轻易说服的「也许」。", "There are ten minutes left in the day. Your manager sounds polite but expects a yes, and a teammate can hear you. The challenge is keeping 'not tonight' clear under pressure without turning it into a negotiable 'maybe'."),
    goals: [L("清楚说出今晚不能留下，不过度解释。", "Say clearly that you cannot stay tonight, without over-explaining."), L("提出可以执行的替代方案。", "Offer an alternative that can actually work."), L("问清明早交付的真正范围。", "Clarify what must really be delivered by morning.")],
    reflect: L("回看你的拒绝是否明确，以及替代方案是否回应了工作需求，而不是只让你感觉自己比较有礼貌。", "Review whether your no was unambiguous and whether your alternative addressed the work, rather than simply sounding polite."),
  },
  {
    id: "meeting-tension",
    corpusFile: "scenarios-a.ts",
    title: L("会议上被同事当众质问：练习回应冲突", "Called Out in a Meeting: Practice Handling Conflict"),
    description: L("同事在周会上当众抱怨你两周没给反馈。模拟会议冲突：承认延迟、提出缺失信息，并在所有人面前约定具体时间。", "A teammate calls out your two-week delay in front of the team. Practice acknowledging it, asking for missing information, and committing to a specific time in the meeting."),
    pressure: L("你确实拖了反馈，但对方提交的文档也缺信息。经理和其他同事都在看。此时直接解释原因很容易被听成推责；只道歉而不给时间，也无法修复协作。", "You did delay feedback, but the document also lacks key details. Your manager and teammates are watching. Explaining too quickly can sound defensive; apologizing without a deadline does not repair the collaboration."),
    goals: [L("承认延迟，先让对方感到被听见。", "Acknowledge the delay and show that you heard the concern."), L("把缺失信息说成请求，而非反击。", "Ask for the missing information without turning it into a counterattack."), L("给出双方可检查的反馈时间。", "Commit to a feedback time both sides can check.")],
    reflect: L("复盘时看你说的第一句话：它先处理了对方的担忧，还是先解释自己为什么没错？", "Look at your first sentence afterward: did it address the other person's concern, or begin by explaining why you were not at fault?"),
  },
  {
    id: "spouse-chores",
    corpusFile: "scenarios-b.ts",
    title: L("和伴侣谈家务分工：练习说出不满而不翻旧账", "Talking About Chores With a Partner: Practice the Conversation"),
    description: L("厨房又乱了，你不想再憋着，也不想重演谁更累的争吵。模拟家务分工对话：说清观察和感受，听懂伴侣的视角，约定可检查的分工。", "The kitchen is a mess again. Rehearse a chores conversation without another contest over who is more tired: name observations, hear your partner, and agree on a concrete split."),
    pressure: L("你们以前谈过，每次都变成互相证明自己更累。真正难的不是列举做过多少家务，而是在不说「你总是」的情况下，仍把需要改变的事讲清楚。", "Previous talks became a contest about who works harder. The hard part is expressing what needs to change without an 'you always' accusation, while still making a real request."),
    goals: [L("说出具体观察和感受，避免「总是」「从不」。", "Name observations and feelings without 'always' or 'never'."), L("听完伴侣的看法，并准确复述。", "Hear your partner's view and reflect it back accurately."), L("商定具体、可检查的家务分工。", "Agree on a specific, checkable division of chores.")],
    reflect: L("回看对话有没有从「谁付出更多」走向「下周谁做哪件事」。复盘只依据你实际说过的话，不替你编造一次和解。", "Check whether the conversation moved from 'who does more' to 'who does what next week.' The debrief uses your actual words; it does not invent a reconciliation."),
  },
  {
    id: "friend-borrowed-money",
    corpusFile: "scenarios-b.ts",
    title: L("朋友借钱不还：练习直接开口", "When a Friend Hasn't Repaid You: Practice Asking"),
    description: L("朋友三个月没还钱，旅行照片让你更难开口。模拟在咖啡馆谈还款：自然提起、说清需要，并商定明确日期和方式。", "A friend has not repaid a loan in three months. Rehearse bringing it up over coffee, stating your need, and agreeing on a repayment date and method."),
    pressure: L("你在意这段友情，也确实需要钱。聊天时对方先兴奋地说起旅行，这让你很容易绕着话题走，或因为照片而带着指责开口。", "You value the friendship and need the money. Your friend starts by talking excitedly about a trip, which makes it easy to avoid the topic or bring it up as an accusation."),
    goals: [L("在闲聊之后直接提起借款。", "Bring up the loan directly after the small talk."), L("表达自己的需要，不靠暗示或指责。", "State your need without hints or blame."), L("谈妥明确的还款日期与方式。", "Agree on a clear date and method of repayment.")],
    reflect: L("回看你是否真的说出了借款、金额与时间；如果对方转移话题，你是否把谈话带回了具体安排。", "Check whether you actually named the loan, amount, and timing. If the topic shifted, did you return to a concrete plan?"),
  },
];

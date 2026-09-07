import { SCENARIOS_A } from "./scenarios-a";
import { SCENARIOS_B } from "./scenarios-b";
import { THEORIES as THEORIES_BASE } from "./theories";
import { THEORIES_C } from "./theories-c";
import { SCENARIOS_C } from "./scenarios-c";
import { CASES_C } from "./cases-c";
import { CASES as CASES_BASE } from "./cases";
import type { Case, Character, Scenario, Theory } from "./types";
import { L } from "../taxonomy";

/** Role the learner plays in each corpus scenario (they are always "you"). */
const LEARNER_ROLE: Record<string, { zh: string; en: string }> = {
  "friend-good-news": L("也申请过驻留的朋友", "Friend who also applied for the residency"),
  "trip-budget-boundary": L("有旅行预算上限的朋友", "Friend with a travel budget ceiling"),
  "family-photo-permission": L("照片被公开的成年子女", "Adult child whose photo was posted"),
  "holiday-two-families": L("协调假期安排的成年子女", "Adult child coordinating holiday visits"),
  "class-name-correction": L("夜校新学员", "New evening-class student"),
  "language-club-space": L("第二语言练习者", "Second-language learner"),
  "event-access-request": L("使用轮椅的报名者", "Prospective participant who uses a wheelchair"),
  "party-alcohol-pressure": L("决定不喝酒的新邻居", "New neighbor choosing not to drink"),
  "community-room-sharing": L("社区读书会组织者", "Community reading-group organizer"),
  "friend-secret-apology": L("泄露秘密的朋友", "Friend who shared a confidence"),
  "partner-alone-evening": L("需要独处的伴侣", "Partner who needs solitude"),
  "async-message-misread": L("负责选择周报格式的同事", "Colleague choosing a report format"),
  "meeting-tension": L("产品团队成员", "Product team member"),
  "salary-raise": L("两年资历的员工", "Two-year employee"),
  "research-debate": L("研究者 Alex", "Researcher Alex"),
  "declining-extra-hours": L("团队成员", "Team member"),
  "promotion-passed-over": L("项目主力", "Project lead contributor"),
  "giving-hard-feedback": L("新晋组长", "Newly promoted team lead"),
  "credit-taken": L("方案的真正提出者", "The plan's real author"),
  "interview-weakness": L("候选人", "Candidate"),
  "new-hire-lunch": L("老同事", "Established colleague"),
  "client-angry-delay": L("项目负责人", "Project lead"),
  "teammate-not-pulling-weight": L("小组成员", "Group member"),
  "professor-grade-dispute": L("学生", "Student"),
  "classroom-speak-up": L("研讨课学生", "Seminar student"),
  "delegating-to-senior": L("新任项目负责人", "New project lead"),
  "asking-for-help-overloaded": L("负责三个项目的员工", "Employee juggling three projects"),
  "colleague-microaggression": L("与会同事", "Colleague in the meeting"),
  "parent-career-choice": L("准备辞职创业的子女", "Child about to quit for a startup"),
  "sibling-eldercare": L("住得近的妹妹/弟弟", "The sibling who lives nearby"),
  "teen-phone-rules": L("家长", "Parent"),
  "spouse-chores": L("伴侣", "Partner"),
  "friend-borrowed-money": L("借出钱的朋友", "The friend who lent the money"),
  "friend-going-through-breakup": L("好友", "Close friend"),
  "friend-cancel-plans": L("被放鸽子的朋友", "The friend who got cancelled on"),
  "first-date-silence": L("约会的一方", "One half of the date"),
  "partner-forgot-anniversary": L("伴侣", "Partner"),
  "saying-i-love-you": L("恋人", "Partner"),
  "neighbor-noise": L("楼下住户", "Downstairs resident"),
  "restaurant-wrong-order": L("顾客", "Customer"),
  "networking-event": L("与会者", "Attendee"),
  "birthday-toast": L("寿星最老的朋友", "The birthday girl's oldest friend"),
  "wine-party-disagreement": L("晚宴客人", "Dinner guest"),
  "public-transport-seat": L("乘客", "Passenger"),
  "gratitude-to-mentor": L("学员", "Mentee"),
  "roommate-guest-boundary": L("室友", "Roommate"),
};

/** Every corpus scenario gets an explicit, playable "you" character so scheduling, role-play and reports share one id. */
export const YOU_ID = "you";
export function withLearner(s: Scenario): Scenario {
  if (s.characters.some((c) => c.id === YOU_ID)) return s;
  const you: Character = {
    id: YOU_ID,
    name: L("你", "You"),
    role: LEARNER_ROLE[s.id] ?? L("你自己", "Yourself"),
    personality: L("", ""),
    stance: L("", ""),
    playable: true,
    hue: 40,
  };
  return { ...s, characters: [you, ...s.characters] };
}

export const SCENARIOS: Scenario[] = [...SCENARIOS_A, ...SCENARIOS_B, ...SCENARIOS_C].map(withLearner);
export const THEORIES: Theory[] = [...THEORIES_BASE, ...THEORIES_C];
export const CASES: Case[] = [...CASES_BASE, ...CASES_C];
export type { Case, Scenario, Theory };

export const scenarioById = (id: string) => SCENARIOS.find((s) => s.id === id);
export const theoryById = (id: string) => THEORIES.find((t) => t.id === id);
export const caseById = (id: string) => CASES.find((c) => c.id === id);

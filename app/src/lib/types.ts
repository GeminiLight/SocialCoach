import type { ContextId, Lang, SkillId } from "@/data/taxonomy";
import type { Scenario } from "@/data/corpus/types";

export interface Profile {
  name: string;
  bio: string;
  goals: SkillId[];
  contexts: ContextId[];
  lang: Lang;
  createdAt: number;
}

/** Estimated proficiency per skill, 1–5. Only goal skills are tracked initially. */
export type Proficiency = Partial<Record<SkillId, number>>;

export type ChatRole = "learner" | "npc" | "coach";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  characterId?: string;
  text: string;
  ts: number;
  /** For coach hints shown inline */
  kind?: "hint";
}

export interface Prescription {
  query: string;
  core_constraints: { target_skills: SkillId[]; contexts?: ContextId[] };
  optional_constraints?: { related_skills?: SkillId[]; relationship_types?: string[]; difficulty?: 1 | 2 | 3 };
  /** Coach's one-line rationale shown to the learner ("why this, why now") */
  rationale: string;
}

export interface Adaptation {
  learnerCharacterId: string;
  /** Rewritten briefing in learner's language, personalized with their profile */
  briefing: string;
  /** Personalized objectives (same count as scenario.objectives) */
  objectives: string[];
  /** Short, encouraging framing of what to focus on */
  focus: string;
  /** Why this scenario for this learner now (grounded in the retrieved scenario) */
  why?: string;
}

export interface RetrievalTrace {
  relaxed: string[];
  candidates: number;
  chosen: string;
}

export interface EvidenceItem {
  behavior: string;
  evidence: string;
  skill: SkillId;
}

export interface WeaknessItem extends EvidenceItem {
  deficit: "acquisition" | "performance";
  whyItMatters: string;
}

export interface Alternative {
  original: string;
  better: string;
  why: string;
}

export interface Report {
  stars: 0 | 1 | 2 | 3;
  outcome: "success" | "partial" | "failure";
  /**
   * One line, the shape of a judgement: what the learner got, and what it cost.
   * It opens the report, where three stars and "2/3 objectives" used to sit —
   * a tally is not a verdict, and the report's most interesting finding was
   * reading at the same volume as everything else around it.
   */
  verdict: string;
  summary: string;
  strengths: EvidenceItem[];
  weaknesses: WeaknessItem[];
  alternatives: Alternative[];
  knowledge: { theoryIds: string[]; caseIds: string[]; whyThis: string };
  reflectionQuestions: string[];
  nextStep: string;
  deltas: Proficiency;
}

export interface Reflection {
  question: string;
  answer: string;
  coachReply?: string;
}

export type SessionStatus = "briefing" | "active" | "ended" | "assessed";

export interface Session {
  id: string;
  scenario: Scenario;
  learnerCharacterId: string;
  prescription?: Prescription;
  adaptation?: Adaptation;
  retrieval?: RetrievalTrace;
  messages: ChatMessage[];
  objectiveDone: boolean[];
  status: SessionStatus;
  outcome?: "success" | "partial" | "failure";
  outcomeNote?: string;
  startedAt: number;
  endedAt?: number;
  report?: Report;
  reflections: Reflection[];
  origin: "scheduled" | "arena" | "rehearse";
  /** The other side's position after each learner turn. Drives the meter and, later, the turn map. */
  stanceTrail?: number[];
  /** 1-based learner turn on which the hidden motive came out. Absent means it never did. */
  revealedAtTurn?: number;
  /** The reveal screen is a one-time moment; don't replay it on revisit. */
  revealSeen?: boolean;
}

export interface RoleplayMeta {
  objectives: boolean[];
  ended: boolean;
  outcome?: "success" | "partial" | "failure" | null;
  note?: string;
  /**
   * 0–100: how close the NPCs are to giving the learner what they want. It is
   * the other side's position, not a score for the learner, and it is allowed
   * to fall — a meter that only rises would make the simulation agreeable.
   */
  stance?: number;
  /** True on the turn an NPC says their hidden motive out loud. */
  revealed?: boolean;
}

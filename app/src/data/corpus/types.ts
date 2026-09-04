import type { CompetencyId, ContextId, L, RelationshipType, SkillId } from "../taxonomy";

/** Character participating in a practical scenario. */
export interface Character {
  id: string;
  name: L;
  role: L;
  /** How this character behaves and speaks — used verbatim in the NPC prompt. */
  personality: L;
  /** What they want; may conflict with the learner's goals. */
  stance: L;
  /** Something they don't say up-front; the learner can uncover it. */
  hidden?: L;
  /** Can the learner take this role? */
  playable?: boolean;
  /** OKLCH hue for the avatar */
  hue: number;
}

/** Practical Scenario (K_s): the "doing" layer. */
export interface Scenario {
  id: string;
  title: L;
  /** One-line hook shown in lists. */
  hook: L;
  /** Background briefing for the learner. */
  background: L;
  context: ContextId;
  contextType: L;
  competencies: CompetencyId[];
  /** Primary skills, ordered by relevance (1–3). */
  skills: SkillId[];
  relatedSkills?: SkillId[];
  relationship: RelationshipType[];
  difficulty: 1 | 2 | 3;
  minutes: number;
  characters: Character[];
  /** Objectives the learner must reach. 2–3 items. */
  objectives: L[];
  success: L;
  failure: L;
  maxTurns: number;
  opening: { characterId: string; text: L };
  /** Icon key from `data/scenario-icons.ts`. Generated scenarios carry their own. */
  icon?: string;
  /** Traceable source that inspired the scenario. */
  source: string;
  keywords: string[];
  /** Set for scenarios the user generated with /rehearse. */
  custom?: boolean;
}

/** Strategic Theory (K_t): the "why" layer. */
export interface Theory {
  id: string;
  title: L;
  source: { book: string; author: string };
  principle: L;
  howTo: L[];
  competencies: CompetencyId[];
  skills: SkillId[];
  keywords: string[];
}

/** Illustrative Case (K_c): the "how" layer. */
export interface Case {
  id: string;
  title: L;
  source: { book: string; author: string };
  situation: L;
  whatHappened: L;
  takeaway: L;
  competencies: CompetencyId[];
  skills: SkillId[];
  context: ContextId;
  keywords: string[];
}

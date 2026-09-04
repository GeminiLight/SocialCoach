/**
 * Task inputs. These are shared by the route handlers and the browser, so
 * `lang` is already a validated `Lang` — routes normalise untrusted bodies with
 * `asLang` at the trust boundary before calling a task.
 */
import type { Scenario } from "@/data/corpus/types";
import type { Lang, SkillId } from "@/data/taxonomy";
import type { Adaptation, ChatMessage, Prescription, Profile, Proficiency, RetrievalTrace } from "@/lib/types";

export interface HistoryItem {
  scenarioId: string;
  title: string;
  skills: string[];
  context: string;
  outcome?: string;
  stars?: number;
  at: number;
}

export interface ScheduleInput {
  profile: Profile;
  proficiency: Proficiency;
  history: HistoryItem[];
  lang: Lang;
  /** When set, skip prescription and only adapt this scenario (arena / rehearse flows). */
  scenarioId?: string;
  scenario?: Scenario;
}

export interface ScheduleOutput {
  scenario: Scenario;
  prescription?: Prescription;
  adaptation: Adaptation;
  retrieval?: RetrievalTrace;
}

export interface RehearseInput {
  description: string;
  lang: Lang;
  profile?: { name?: string; bio?: string; goals?: SkillId[] };
}

export interface TurnInput {
  scenario: Scenario;
  learnerCharacterId: string;
  messages: ChatMessage[];
  lang: Lang;
  learnerName?: string;
}

export interface ReflectInput {
  scenario: Scenario;
  question: string;
  answer: string;
  lang: Lang;
  summary?: string;
}

export interface AssessInput extends TurnInput {
  goals: SkillId[];
  objectiveDone?: boolean[];
  outcome?: string;
}

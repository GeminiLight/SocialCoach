import {
  Banknote, BatteryLow, Briefcase, Bus, CalendarX, ClipboardList, Clock, Coffee, Copy, DoorOpen,
  Flame, Gift, GraduationCap, Hand, Handshake, Heart, HeartCrack, Home, Megaphone,
  MessageSquare, MessageSquareWarning, Mic, Moon, Package, PiggyBank, Receipt, Scale,
  ShieldAlert, Smartphone, Split, Stethoscope, Trophy, UserX, Users, Utensils, Volume2, Wine,
  type LucideIcon,
} from "lucide-react";
import { createElement } from "react";
import type { ContextId } from "./taxonomy";

/**
 * Scenario icons.
 *
 * Two rules learned the hard way on this component:
 *
 * 1. **The mark must vary by content, not by category.** `context` is 41%
 *    workplace and the primary competency is 50% relationship-skills, so
 *    anything keyed on a category collapses into one repeated picture. A glyph
 *    chosen per scenario does not.
 * 2. **Then the colour can stay disciplined.** Because the glyph carries the
 *    variation, icons render in a single ink tone — no 360° hue wheel, no
 *    pastel candy, no character-initial avatars that say nothing.
 *
 * The registry is an explicit allow-list rather than a dynamic `lucide-react`
 * lookup: it keeps tree-shaking working, and — more importantly — a model
 * choosing an icon for a generated scenario cannot name a component that does
 * not exist. Unknown names fall back to the context default.
 */
export const SCENARIO_ICONS = {
  banknote: Banknote,
  "battery-low": BatteryLow,
  briefcase: Briefcase,
  bus: Bus,
  "calendar-x": CalendarX,
  "clipboard-list": ClipboardList,
  clock: Clock,
  coffee: Coffee,
  copy: Copy,
  "door-open": DoorOpen,
  flame: Flame,
  gift: Gift,
  "graduation-cap": GraduationCap,
  hand: Hand,
  handshake: Handshake,
  heart: Heart,
  "heart-crack": HeartCrack,
  home: Home,
  megaphone: Megaphone,
  "message-square": MessageSquare,
  "message-square-warning": MessageSquareWarning,
  mic: Mic,
  moon: Moon,
  package: Package,
  "piggy-bank": PiggyBank,
  receipt: Receipt,
  scale: Scale,
  "shield-alert": ShieldAlert,
  smartphone: Smartphone,
  split: Split,
  stethoscope: Stethoscope,
  trophy: Trophy,
  "user-x": UserX,
  users: Users,
  utensils: Utensils,
  "volume-2": Volume2,
  wine: Wine,
} satisfies Record<string, LucideIcon>;

export type ScenarioIconName = keyof typeof SCENARIO_ICONS;

export const SCENARIO_ICON_NAMES = Object.keys(SCENARIO_ICONS) as ScenarioIconName[];

export const isScenarioIcon = (v: unknown): v is ScenarioIconName =>
  typeof v === "string" && v in SCENARIO_ICONS;

/** Fallback when a scenario has no icon of its own — never the primary source. */
const BY_CONTEXT: Record<ContextId, ScenarioIconName> = {
  workplace: "briefcase",
  family: "home",
  friendship: "coffee",
  romantic: "heart",
  education: "graduation-cap",
  public: "bus",
  party: "wine",
};

/**
 * Curated icon per corpus scenario. Kept here rather than in the corpus files
 * so the two large scenario modules stay untouched; scenarios generated at
 * runtime carry their own `icon` field instead.
 */
const CURATED: Record<string, ScenarioIconName> = {
  "meeting-tension": "flame",
  "salary-raise": "banknote",
  "research-debate": "split",
  "declining-extra-hours": "clock",
  "promotion-passed-over": "trophy",
  "giving-hard-feedback": "message-square-warning",
  "credit-taken": "copy",
  "interview-weakness": "clipboard-list",
  "new-hire-lunch": "utensils",
  "client-angry-delay": "shield-alert",
  "teammate-not-pulling-weight": "user-x",
  "professor-grade-dispute": "graduation-cap",
  "classroom-speak-up": "hand",
  "delegating-to-senior": "package",
  "asking-for-help-overloaded": "battery-low",
  "colleague-microaggression": "megaphone",
  "parent-career-choice": "briefcase",
  "sibling-eldercare": "stethoscope",
  "teen-phone-rules": "smartphone",
  "spouse-chores": "scale",
  "friend-borrowed-money": "piggy-bank",
  "friend-going-through-breakup": "heart-crack",
  "friend-cancel-plans": "calendar-x",
  "first-date-silence": "coffee",
  "partner-forgot-anniversary": "gift",
  "saying-i-love-you": "moon",
  "neighbor-noise": "volume-2",
  "restaurant-wrong-order": "receipt",
  "networking-event": "users",
  "birthday-toast": "mic",
  "wine-party-disagreement": "wine",
  "public-transport-seat": "bus",
  "gratitude-to-mentor": "door-open",
  "roommate-guest-boundary": "home",
};

/** Resolution order: the scenario's own icon → curated corpus map → context default. */
export function scenarioIconName(scenario: { id: string; context: ContextId; icon?: string }): ScenarioIconName {
  if (isScenarioIcon(scenario.icon)) return scenario.icon;
  return CURATED[scenario.id] ?? BY_CONTEXT[scenario.context] ?? "message-square";
}

/**
 * Rendered as a component rather than returning one, so callers never hold a
 * component value produced during render (the React Compiler lint rule) — the
 * lookup is a plain map read into `createElement`.
 */
export function ScenarioIcon({
  scenario,
  size = 20,
  strokeWidth = 1.6,
  className,
}: {
  scenario: { id: string; context: ContextId; icon?: string };
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return createElement(SCENARIO_ICONS[scenarioIconName(scenario)], { size, strokeWidth, className });
}

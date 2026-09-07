import type { Lang } from "@/data/taxonomy";
import type { CompetencyId } from "@/data/taxonomy";
import { COMPETENCIES, skillById, type SkillId } from "@/data/taxonomy";

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function relDate(ts: number, lang: Lang): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (sameDay) return lang === "zh" ? "今天" : "Today";
  if (d.toDateString() === y.toDateString()) return lang === "zh" ? "昨天" : "Yesterday";
  return d.toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", { month: "short", day: "numeric" });
}

/**
 * These hues are computed rather than tokenised — one per competency, one per
 * character — so a CSS variable cannot theme them. `light-dark()` can: it picks
 * by the resolved `color-scheme`, which follows the system unless the root
 * element pins it, so the same call works for system dark and for an explicit
 * choice. (Verified to work in SVG `fill` attributes, which is where most of
 * these land.)
 *
 * The dark counterpart mirrors lightness around the midpoint and trims chroma:
 * a pale tint used as a background has to become a deep tint, while ink-weight
 * colours have to lift to stay legible on a dark ground.
 */
function themed(l: number, c: number, hue: number) {
  // Piecewise, because these lightnesses mean different things. A first attempt
  // mirrored everything around the midpoint and collapsed 0.67–0.93 into a
  // narrow band near 0.30 — cover art turned into a black rectangle because the
  // shapes and the ground they sit on landed on the same value.
  //   ≥ 0.88  a ground wash: has to clear the card it sits on, not just the paper
  //   ≥ 0.60  a drawn shape: has to stay clearly above that ground
  //   < 0.60  ink weight: lifts to stay legible on a dark ground
  const dl = l >= 0.88 ? 0.3 - (l - 0.88) * 0.3 : l >= 0.6 ? 0.3 + (0.88 - l) * 0.95 : Math.min(0.88, 1.18 - l);
  // Dark surfaces need more chroma than light ones to still read as coloured.
  const dc = l >= 0.6 ? Math.min(0.1, c * 1.9) : c * 0.95;
  return `light-dark(oklch(${l} ${c} ${hue}), oklch(${dl.toFixed(3)} ${dc.toFixed(3)} ${hue}))`;
}

export function compColor(id: CompetencyId, l = 0.58, c = 0.11) {
  return themed(l, c, COMPETENCIES.find((x) => x.id === id)!.hue);
}
export function compSoft(id: CompetencyId) {
  return compColor(id, 0.94, 0.03);
}
export function skillColor(id: SkillId) {
  return compColor(skillById(id).competency);
}
export function skillSoft(id: SkillId) {
  return compSoft(skillById(id).competency);
}
export function hueColor(hue: number, l = 0.86, c = 0.06) {
  return themed(l, c, hue);
}

/**
 * A hue whose two schemes are chosen independently.
 *
 * `themed` mirrors one lightness into the other scheme, which is right almost
 * everywhere — but it cannot preserve an ordering between two colours. Hair
 * darker than a face in light mode comes out lighter than it in dark mode,
 * because the mirror maps the darker input further up. Where the relationship
 * between two tones is the point, both ends have to be stated.
 */
export function huePair(hue: number, light: number, dark: number, c = 0.05) {
  return `light-dark(oklch(${light} ${c} ${hue}), oklch(${dark} ${(c * 1.15).toFixed(3)} ${hue}))`;
}

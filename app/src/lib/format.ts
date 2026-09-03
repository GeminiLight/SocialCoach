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

export function compColor(id: CompetencyId, l = 0.58, c = 0.11) {
  const hue = COMPETENCIES.find((x) => x.id === id)!.hue;
  return `oklch(${l} ${c} ${hue})`;
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
  return `oklch(${l} ${c} ${hue})`;
}

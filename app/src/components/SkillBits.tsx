"use client";
import { clsx } from "clsx";
import { competencyById, skillById, type Lang, type SkillId } from "@/data/taxonomy";
import { compColor, compSoft } from "@/lib/format";

export function SkillTag({ id, lang, small, className }: { id: SkillId; lang: Lang; small?: boolean; className?: string }) {
  const s = skillById(id);
  return (
    <span
      className={clsx("inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap", small ? "h-6 px-2 text-[11px]" : "h-7 px-2.5 text-[12px]", className)}
      style={{ background: compSoft(s.competency), color: compColor(s.competency, 0.38, 0.09) }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: compColor(s.competency) }} />
      {s.name[lang]}
    </span>
  );
}

export function CompetencyLabel({ id, lang }: { id: SkillId; lang: Lang }) {
  const c = competencyById(skillById(id).competency);
  return <span className="eyebrow" style={{ color: compColor(c.id, 0.45, 0.09) }}>{c.name[lang]}</span>;
}

/**
 * 1–5 proficiency as five ink-filled cells. Pass `from` to show where the
 * learner started: the gain since then renders as a lighter wash behind the
 * fill, so the row shows movement and not just a level.
 */
export function Level({ value, from, color, className }: { value: number | undefined; from?: number; color?: string; className?: string }) {
  const v = value ?? 0;
  const base = from == null ? v : Math.max(0, Math.min(v, from));
  return (
    <span className={clsx("inline-flex items-center gap-[3px]", className)} aria-label={value ? value.toFixed(1) : "unrated"}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, v - (i - 1)));
        const solid = Math.max(0, Math.min(1, base - (i - 1)));
        return (
          <span key={i} className="relative h-2.5 w-4 rounded-[3px] overflow-hidden border" style={{ borderColor: "var(--line-strong)", background: "var(--card)" }}>
            {fill > solid && (
              <span className="absolute inset-y-0 left-0" style={{ width: `${fill * 100}%`, background: color ?? "var(--ink)", opacity: 0.34 }} />
            )}
            <span className="absolute inset-y-0 left-0" style={{ width: `${solid * 100}%`, background: color ?? "var(--ink)", transition: "width 600ms cubic-bezier(0.16,1,0.3,1)" }} />
          </span>
        );
      })}
    </span>
  );
}

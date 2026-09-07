"use client";
import { clsx } from "clsx";
import { COMPETENCIES, type CompetencyId, type Lang } from "@/data/taxonomy";
import { t } from "@/lib/i18n";
import { compColor } from "@/lib/format";

/**
 * Pentagon radar of the five CASEL competencies (values 1–5).
 *
 * `size` is the viewBox unit, not a pixel size: the svg fills its container and
 * everything inside — geometry and label type — scales with it. Size it by
 * constraining the wrapper.
 */
export function Radar({
  values,
  lang,
  size = 260,
  showLabels = true,
  className,
}: {
  values: Record<CompetencyId, number | null>;
  lang: Lang;
  size?: number;
  showLabels?: boolean;
  className?: string;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.34;
  const pts = (r: number) =>
    COMPETENCIES.map((_, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
    });
  const poly = (r: number) =>
    pts(r)
      .map((p) => p.join(","))
      .join(" ");
  const valPts = COMPETENCIES.map((c, i) => {
    const v = values[c.id];
    const r = v == null ? 0 : (Math.max(0, Math.min(5, v)) / 5) * R;
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a), v] as const;
  });
  const complete = valPts.every((p) => p[2] != null);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={clsx("w-full h-auto", className)} role="img" aria-label={t(lang, "pg_radar")}>
      <desc>{COMPETENCIES.map((c) => `${c.name[lang]}: ${values[c.id]?.toFixed(1) ?? t(lang, "pg_unrated")}`).join("; ")}</desc>
      {[0.2, 0.4, 0.6, 0.8, 1].map((f) => (
        <polygon
          key={f}
          points={poly(R * f)}
          fill="none"
          stroke="var(--line)"
          strokeWidth={1}
          strokeDasharray={f === 1 ? undefined : "2 4"}
        />
      ))}
      {pts(R).map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke="var(--line)" strokeWidth={1} />
      ))}
      {complete && (
        <polygon
          points={valPts.map((p) => `${p[0]},${p[1]}`).join(" ")}
          fill="var(--accent)"
          fillOpacity={0.16}
          stroke="var(--accent)"
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
      )}
      {valPts.map((p, i) => {
        const end = pts(R)[i];
        const color = compColor(COMPETENCIES[i].id);
        return p[2] == null ? (
          <circle key={i} cx={end[0]} cy={end[1]} r={4} fill="var(--paper)" stroke={color} strokeWidth={1.5} />
        ) : (
          <g key={i}>
            {!complete && <line x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke={color} strokeWidth={2} strokeLinecap="round" />}
            <circle cx={p[0]} cy={p[1]} r={4.5} fill={color} stroke="var(--paper)" strokeWidth={2} />
          </g>
        );
      })}
      {showLabels &&
        pts(R + size * 0.1).map((p, i) => {
          const c = COMPETENCIES[i];
          const v = values[c.id];
          return (
            <g key={c.id} textAnchor="middle">
              <title>{c.name[lang]}</title>
              <text x={Math.max(size * 0.13, Math.min(size * 0.87, p[0]))} y={p[1] - 4} fontSize={12} fill="var(--ink-2)" fontWeight={600}>
                {lang === "zh" ? c.name[lang] : c.short[lang]}
              </text>
              <text x={Math.max(size * 0.13, Math.min(size * 0.87, p[0]))} y={p[1] + 11} fontSize={11} fill={compColor(c.id)} className="num">
                {v == null ? "–" : v.toFixed(1)}
              </text>
            </g>
          );
        })}
    </svg>
  );
}

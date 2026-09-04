"use client";
import { clsx } from "clsx";
import { COMPETENCIES, type CompetencyId, type Lang } from "@/data/taxonomy";
import { compColor } from "@/lib/format";

/**
 * Pentagon radar of the five CASEL competencies (values 1–5).
 *
 * `size` is the viewBox unit, not a pixel size: the svg fills its container and
 * everything inside — geometry and label type — scales with it. Size it by
 * constraining the wrapper.
 */
export function Radar({ values, lang, size = 260, showLabels = true, className }: { values: Record<CompetencyId, number | null>; lang: Lang; size?: number; showLabels?: boolean; className?: string }) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.34;
  const pts = (r: number) =>
    COMPETENCIES.map((_, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
    });
  const poly = (r: number) => pts(r).map((p) => p.join(",")).join(" ");
  const valPts = COMPETENCIES.map((c, i) => {
    const v = values[c.id];
    const r = v == null ? 0 : ((v - 1) / 4) * R;
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a), v] as const;
  });
  const any = valPts.filter((p) => p[2] != null).length >= 3;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={clsx("w-full h-auto", className)} role="img" aria-label="competency radar">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={poly(R * f)} fill="none" stroke="var(--line)" strokeWidth={1} strokeDasharray={f === 1 ? undefined : "2 4"} />
      ))}
      {pts(R).map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke="var(--line)" strokeWidth={1} />
      ))}
      {any && (
        <polygon points={valPts.map((p) => `${p[0]},${p[1]}`).join(" ")} fill="var(--accent)" fillOpacity={0.16} stroke="var(--accent)" strokeWidth={1.6} strokeLinejoin="round" style={{ transition: "all 600ms cubic-bezier(0.16,1,0.3,1)" }} />
      )}
      {valPts.map((p, i) =>
        p[2] == null ? null : <circle key={i} cx={p[0]} cy={p[1]} r={3.5} fill={compColor(COMPETENCIES[i].id)} stroke="var(--paper)" strokeWidth={1.5} />,
      )}
      {showLabels &&
        pts(R + size * 0.1).map((p, i) => {
          const c = COMPETENCIES[i];
          const v = values[c.id];
          return (
            <g key={c.id} textAnchor="middle">
              <text x={p[0]} y={p[1] - 4} fontSize={12} fill="var(--ink-2)" fontWeight={600}>{c.short[lang]}</text>
              <text x={p[0]} y={p[1] + 11} fontSize={11} fill={compColor(c.id)} className="num">{v == null ? "–" : v.toFixed(1)}</text>
            </g>
          );
        })}
    </svg>
  );
}

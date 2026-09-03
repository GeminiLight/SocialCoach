"use client";
import type { Scenario } from "@/data/corpus/types";
import { hueColor } from "@/lib/format";

/**
 * Abstract "cover" for a scenario: overlapping speech-shapes tinted by the characters' hues.
 * Deterministic from the scenario so the same scene always looks the same.
 */
export function ScenarioCover({ scenario, size = 48, full = false }: { scenario: Scenario; size?: number; full?: boolean }) {
  const hues = scenario.characters.filter((c) => c.id !== "you" && !c.playable).map((c) => c.hue);
  const h1 = hues[0] ?? 40;
  const h2 = hues[1] ?? (h1 + 140) % 360;
  const h3 = hues[2] ?? (h1 + 250) % 360;
  const seed = Array.from(scenario.id).reduce((a, c) => a + c.charCodeAt(0), 0);
  const tilt = (seed % 21) - 10;
  if (full) {
    return (
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 160" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <circle cx={300 + (seed % 40)} cy={90} r={92} fill={hueColor(h1, 0.82, 0.08)} />
        <rect x={210} y={20} width={150} height={100} rx={38} transform={`rotate(${tilt} 285 70)`} fill={hueColor(h2, 0.74, 0.1)} opacity={0.9} />
        <path d={`M 250 120 q -20 40 -60 30 q 30 -10 30 -40 z`} fill={hueColor(h2, 0.74, 0.1)} opacity={0.9} />
        <circle cx={340} cy={40} r={22} fill={hueColor(h3, 0.66, 0.1)} opacity={0.85} />
        <circle cx={40} cy={140} r={60} fill={hueColor(h1, 0.86, 0.05)} />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden className="rounded-xl shrink-0" style={{ background: hueColor(h1, 0.92, 0.04) }}>
      <circle cx={30} cy={26} r={16} fill={hueColor(h1, 0.8, 0.09)} />
      <rect x={8} y={10} width={24} height={18} rx={8} transform={`rotate(${tilt} 20 19)`} fill={hueColor(h2, 0.7, 0.1)} />
      <circle cx={36} cy={12} r={5} fill={hueColor(h3, 0.62, 0.1)} />
    </svg>
  );
}

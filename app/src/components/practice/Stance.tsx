"use client";
import { clsx } from "clsx";
import { motion } from "framer-motion";
import { CornerDownLeft } from "lucide-react";
import { t } from "@/lib/i18n";
import type { Lang } from "@/data/taxonomy";

export type StanceState = "unmoved" | "wavering" | "considering" | "almost" | "agreed";

export function stanceState(v: number): StanceState {
  if (v >= 100) return "agreed";
  if (v >= 76) return "almost";
  if (v >= 51) return "considering";
  if (v >= 26) return "wavering";
  return "unmoved";
}

const KEY = {
  unmoved: "pr_stance_unmoved",
  wavering: "pr_stance_wavering",
  considering: "pr_stance_considering",
  almost: "pr_stance_almost",
  agreed: "pr_stance_agreed",
} as const;

/**
 * How close the other side is to giving you what you want.
 *
 * Two things about this are deliberate and load-bearing. It is labelled with
 * the NPC's name and their state, never as a score for the learner — the moment
 * it reads as points, people play the meter instead of the person. And it is
 * allowed to fall, with the drop marked so it cannot be missed: a bar that only
 * ever rises would quietly turn this into an agreeable simulation, which is the
 * one thing the product cannot be.
 */
export function Stance({
  name,
  value,
  prev,
  lang,
  layout = "bar",
  className,
}: {
  name: string;
  value: number;
  prev?: number;
  lang: Lang;
  layout?: "bar" | "block";
  className?: string;
}) {
  const state = stanceState(value);
  const dropped = prev !== undefined && value < prev;
  const block = layout === "block";

  return (
    <div className={clsx("min-w-0", className)} aria-label={`${name} · ${t(lang, KEY[state])}`}>
      <p className={clsx("flex items-baseline gap-1.5 leading-tight", block ? "text-[13px]" : "text-[11px]")}>
        <span className="font-semibold text-ink-2 truncate">{name}</span>
        <span className={clsx("shrink-0", state === "unmoved" ? "text-ink-4" : "text-ink-3")}>{t(lang, KEY[state])}</span>
        {dropped && (
          <motion.span
            initial={{ opacity: 0, x: 4 }}
            animate={{ opacity: 1, x: 0 }}
            className="shrink-0 inline-flex items-center gap-0.5 text-accent-deep"
          >
            <CornerDownLeft size={block ? 13 : 11} />
            {block && <span>{t(lang, "pr_stance_back")}</span>}
          </motion.span>
        )}
      </p>
      <div className={clsx("relative mt-1.5 rounded-full bg-line overflow-hidden", block ? "h-2" : "h-1.5")}>
        <motion.span
          className={clsx("absolute inset-y-0 left-0 rounded-full", state === "agreed" ? "bg-moss" : "bg-ink")}
          initial={false}
          animate={{ width: `${Math.max(2, value)}%` }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        />
        {/* Where they stood before this turn, so a retreat leaves a visible mark. */}
        {dropped && (
          <motion.span
            className="absolute inset-y-0 w-[2px] bg-accent-deep"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ left: `calc(${Math.min(100, prev!)}% - 1px)` }}
          />
        )}
      </div>
    </div>
  );
}

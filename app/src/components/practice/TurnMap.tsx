"use client";
import { useState } from "react";
import { clsx } from "clsx";
import { t, type TKey } from "@/lib/i18n";
import type { Session } from "@/lib/types";
import type { Lang } from "@/data/taxonomy";

type Kind = "gain" | "hold" | "loss";

interface Turn {
  n: number;
  stance: number;
  /** Where they stood before this turn, so a drop can be drawn, not inferred. */
  prev: number;
  delta: number;
  kind: Kind;
  said: string;
}

/**
 * Where the scene actually turned.
 *
 * The report is thousands of pixels of prose in which every finding reads at
 * the same volume, so the moment a learner conceded is as quiet as the moment
 * they held. `stanceTrail` already records the other side's position after each
 * turn, and the deltas between those numbers say which of their own lines moved
 * the conversation and which gave ground. Drawn as one strip, that is scannable
 * in a second, and it is the same picture across sessions — the shape a
 * recurring habit shows up in.
 *
 * Tapping a turn shows what they said on it, because a mark on a chart is an
 * assertion and the transcript is the evidence for it.
 */
function turnsOf(session: Session): Turn[] {
  const trail = session.stanceTrail ?? [];
  if (trail.length === 0) return [];
  const said = session.messages.filter((m) => m.role === "learner").map((m) => m.text);
  const open = 20; // where a scene starts before any turn has reported
  return trail.map((stance, i) => {
    const prev = i === 0 ? open : trail[i - 1];
    const delta = stance - prev;
    return {
      n: i + 1,
      stance,
      prev,
      delta,
      // A small wobble is not a move; anything negative is, because giving
      // ground is the thing this product exists to make visible.
      kind: delta <= -1 ? "loss" : delta >= 5 ? "gain" : "hold",
      said: said[i] ?? "",
    };
  });
}

export function TurnMap({ session, lang, className }: { session: Session; lang: Lang; className?: string }) {
  const turns = turnsOf(session);
  const [open, setOpen] = useState<number | null>(null);
  if (turns.length === 0) return null;

  const sel = turns.find((x) => x.n === open) ?? null;
  const losses = turns.filter((x) => x.kind === "loss");

  return (
    <div className={clsx("flex flex-col gap-3", className)}>
      <ol className="flex items-end gap-1.5" aria-label={t(lang, "rp_map_label")}>
        {turns.map((x) => {
          const active = open === x.n;
          return (
            <li key={x.n} className="flex-1 min-w-0">
              <button
                type="button"
                onClick={() => setOpen(active ? null : x.n)}
                aria-pressed={active}
                aria-label={`${t(lang, "rp_map_turn", { n: x.n })} · ${t(lang, KIND_KEY[x.kind])}`}
                className="press w-full flex flex-col items-stretch gap-1 group"
              >
                {/* The bar is the other side's position after this turn. A drop
                    also draws the ground given away, as a band from where they
                    now stand up to where they stood before — otherwise the
                    concession is the shortest bar on the chart and the eye goes
                    to the tall ones, which is backwards. */}
                <span className="relative block h-16 rounded-[3px] bg-inset overflow-hidden">
                  <span
                    className={clsx(
                      "absolute inset-x-0 bottom-0 rounded-[3px] transition-[height] duration-500",
                      x.kind === "gain" ? "bg-ink" : "bg-ink-4",
                    )}
                    style={{ height: `${Math.max(4, x.stance)}%` }}
                  />
                  {x.kind === "loss" && (
                    <>
                      <span
                        className="absolute inset-x-0 bg-accent-deep/30"
                        style={{ bottom: `${x.stance}%`, height: `${Math.max(4, x.prev - x.stance)}%` }}
                      />
                      <span className="absolute inset-x-0 h-[2.5px] bg-accent-deep" style={{ bottom: `${x.prev}%` }} />
                    </>
                  )}
                </span>
                <span
                  className={clsx(
                    "text-[10px] num text-center leading-none pt-0.5 transition-colors",
                    active ? "text-ink font-semibold" : "text-ink-4 group-hover:text-ink-3",
                  )}
                >
                  {x.n}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {sel ? (
        <div className="dotted pt-3 flex flex-col gap-1.5">
          <p className="eyebrow">
            {t(lang, "rp_map_turn", { n: sel.n })} · {t(lang, KIND_KEY[sel.kind])}
            {sel.kind !== "hold" && <span className="num text-ink-4 ml-1.5">{sel.delta > 0 ? "+" : ""}{sel.delta}</span>}
          </p>
          <p className="text-[14px] leading-relaxed text-ink-2">{sel.said ? `“${sel.said}”` : t(lang, "rp_map_no_line")}</p>
        </div>
      ) : (
        <p className="text-[12px] text-ink-3 leading-relaxed">
          {losses.length > 0
            ? t(lang, "rp_map_hint_loss", { n: losses.map((x) => x.n).join("、") })
            : t(lang, "rp_map_hint_clean")}
        </p>
      )}
    </div>
  );
}

const KIND_KEY: Record<Kind, TKey> = {
  gain: "rp_map_gain",
  hold: "rp_map_hold",
  loss: "rp_map_loss",
};
